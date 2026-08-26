#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
けあしる AIデータ収集パイプライン スクリプト
crawler/collect_services.py

使い方:
  python crawler/collect_services.py --municipality 世田谷区
  python crawler/collect_services.py --municipality 練馬区
  python crawler/collect_services.py --url https://example.com/koreisha/ --name 〇〇区 --prefix XXX

必要なパッケージ:
  pip install playwright anthropic
  playwright install chromium

処理フロー:
1. municipalities.json から自治体の設定を読み込む（または --url 直接指定）
2. Playwright でシードURLを巡回し、サービスページのリンクを収集
3. 各サービスページのテキストを取得
4. Claude API (Structured Output) でスキーマ準拠の JSON に変換
5. status='draft' として extracted_drafts.json に追記
"""

import sys
import os
import json
import time
import datetime
import argparse

# WindowsコンソールでのUTF-8出力対応
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MUNICIPALITIES_FILE = os.path.join(SCRIPT_DIR, 'municipalities.json')
OUTPUT_FILE = os.path.join(SCRIPT_DIR, 'extracted_drafts.json')

# 収集対象として拾うリンクのキーワード（サービス一覧・個別ページの判定）
SERVICE_KEYWORDS = [
    'サービス', '支援', '補助', '給付', '助成', '配食', '食事', '訪問',
    '見守り', '緊急', '通報', '介護', '入浴', '外出', '送迎', '相談',
]

# Claude に渡す抽出スキーマの説明
EXTRACTION_PROMPT = """
以下のWebページテキストから、高齢者向けサービス情報を抽出してください。
1ページに複数のサービスが含まれる場合は、それぞれ別のオブジェクトとして返してください。
サービス情報が見つからない場合は空のリスト [] を返してください。

各サービスは以下のJSONスキーマに従ってください:
{
  "name": "サービス名称（文字列）",
  "scheme": "次のいずれか: insurance / sogo_jigyo / municipal_extra / private_paid / mutual_aid",
  "description": "サービスの概要（100〜200文字）",
  "needs_tag_ids": ["次の中から該当するものをリスト: cooking, cleaning, shopping_daily, laundry, garbage, bath_care, excretion_care, dressing_care, medication_check, hospital_escort, safety_check_day, talking_partner, day_service, rehab_training, short_stay, weekend_relief, handyman_tasks, gardening_weed, futon_drying, haircut_visit, emergency_system, care_consultation"],
  "price": "自己負担額（円・整数）。無料は0。推測不可能な場合は null",
  "price_source_snippet": "料金に関する原文の一言抜粋（推測禁止・見つからない場合は空文字）",
  "reduction_hours": "家族の介護時間削減量（時間/回・小数）。見当たらない場合は 0",
  "application_route": "申込窓口・方法（文字列）",
  "confidence_score": "抽出の信頼度（0.0〜1.0）"
}

返答はJSON配列のみ。説明文や前置きは不要です。
"""


def load_municipalities():
    if not os.path.exists(MUNICIPALITIES_FILE):
        return {}
    with open(MUNICIPALITIES_FILE, encoding='utf-8') as f:
        return json.load(f)


def load_existing_drafts():
    if not os.path.exists(OUTPUT_FILE):
        return []
    with open(OUTPUT_FILE, encoding='utf-8') as f:
        return json.load(f)


def save_drafts(drafts):
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(drafts, f, ensure_ascii=False, indent=2)


def is_service_link(text, url):
    """リンクのテキストまたはURLがサービスページらしいか判定"""
    combined = (text or '') + (url or '')
    return any(kw in combined for kw in SERVICE_KEYWORDS)


def collect_service_urls(page, seed_url, max_links=20):
    """シードURLからサービスページのリンクを収集"""
    print(f"  [CRAWL] シードURL巡回: {seed_url}")
    try:
        page.goto(seed_url, timeout=15000)
        time.sleep(1.2)
    except Exception as e:
        print(f"  [WARN] アクセス失敗: {e}")
        return []

    # ページ内のリンクを全取得
    links = page.evaluate("""
        () => Array.from(document.querySelectorAll('a[href]')).map(a => ({
            text: a.innerText.trim(),
            url: a.href
        }))
    """)

    base_domain = '/'.join(seed_url.split('/')[:3])
    found = []
    seen = set()

    for link in links:
        url = link.get('url', '')
        text = link.get('text', '')
        if not url.startswith(base_domain):
            continue
        if url in seen:
            continue
        if is_service_link(text, url):
            seen.add(url)
            found.append({'url': url, 'text': text})
        if len(found) >= max_links:
            break

    print(f"  [FOUND] サービス候補リンク: {len(found)} 件")
    return found


def scrape_page_text(page, url):
    """ページ本文テキストを取得"""
    try:
        page.goto(url, timeout=15000)
        time.sleep(1.0)
        # メインコンテンツ領域を優先取得（なければ body 全体）
        text = page.evaluate("""
            () => {
                const main = document.querySelector('main, #content, .content, article, #tmp_honbun');
                return (main || document.body).innerText;
            }
        """)
        return text[:6000] if text else ''
    except Exception as e:
        print(f"  [WARN] テキスト取得失敗 ({url}): {e}")
        return ''


def _parse_json_from_response(raw: str):
    """Claude レスポンスから JSON 配列を抽出する（複数パターン対応）"""
    import re
    raw = raw.strip()

    # パターン1: ```json ... ``` または ``` ... ```
    m = re.search(r'```(?:json)?\s*(\[.*?\])\s*```', raw, re.DOTALL)
    if m:
        return json.loads(m.group(1))

    # パターン2: JSON 配列がそのまま返ってくる
    m = re.search(r'(\[.*\])', raw, re.DOTALL)
    if m:
        return json.loads(m.group(1))

    # パターン3: 空配列を示す文章（サービスなし）
    if re.search(r'(サービス.{0,20}(見つかり|ありません|存在しない)|no service|empty)', raw, re.IGNORECASE):
        return []

    raise ValueError(f'JSON 配列が見つかりません: {raw[:200]}')


def extract_with_claude(text, source_url, source_type):
    """Claude API でテキストからサービス情報を構造化抽出"""
    try:
        import anthropic
        client = anthropic.Anthropic()
        response = client.messages.create(
            model='claude-sonnet-4-6',
            max_tokens=2048,
            messages=[{
                'role': 'user',
                'content': f"{EXTRACTION_PROMPT}\n\n---\nURL: {source_url}\n\n{text}"
            }]
        )
        raw = response.content[0].text.strip()
        services = _parse_json_from_response(raw)
        return services if isinstance(services, list) else []
    except ImportError:
        print('  [WARN] anthropic パッケージが未インストール。pip install anthropic で導入してください。')
        return []
    except json.JSONDecodeError as e:
        print(f'  [WARN] JSONパースエラー ({source_url}): {e}')
        return []
    except ValueError as e:
        print(f'  [WARN] レスポンス解析失敗 ({source_url}): {e}')
        return []
    except Exception as e:
        print(f'  [WARN] Claude API エラー: {e}')
        return []


def run_pipeline(municipality_name, config, id_prefix):
    """メインパイプライン"""
    print('=' * 60)
    print(f'けあしる AIデータ収集パイプライン開始')
    print(f'対象自治体: {municipality_name}')
    print(f'実行時刻: {datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
    print('=' * 60)

    try:
        from playwright.sync_api import sync_playwright
        use_playwright = True
    except ImportError:
        print('[WARN] playwright 未インストール。pip install playwright && playwright install chromium')
        use_playwright = False

    seed_urls = config.get('seed_urls', [config.get('url')])
    provider_id = config.get('provider_id', f'prov_{municipality_name}')
    provider_name = config.get('provider_name', municipality_name)
    source_type = '自治体公式サービスページ'

    existing_drafts = load_existing_drafts()
    existing_ids = {d.get('id') for d in existing_drafts}

    new_records = []
    counter = 1

    if use_playwright:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.set_extra_http_headers({'Accept-Language': 'ja,en;q=0.9'})

            # 1. 全シードURLからサービスページリンクを収集
            all_service_links = []
            seen_links = set()
            for seed_url in seed_urls:
                links = collect_service_urls(page, seed_url)
                for link in links:
                    if link['url'] not in seen_links:
                        seen_links.add(link['url'])
                        all_service_links.append(link)

            if not all_service_links:
                # シードURLそのものをスクレイピング対象にする
                all_service_links = [{'url': u, 'text': ''} for u in seed_urls]

            # 2. 各ページをスクレイピング → Claude で構造化
            for link in all_service_links[:30]:  # 最大30ページ
                url = link['url']
                print(f'\n[PAGE] {link["text"] or url}')
                text = scrape_page_text(page, url)
                if not text:
                    continue

                services = extract_with_claude(text, url, source_type)
                print(f'  [EXTRACT] {len(services)} 件抽出')

                for svc in services:
                    record_id = f'{id_prefix}-AUTO-{int(time.time())}-{counter:03d}'
                    if record_id in existing_ids:
                        continue
                    counter += 1

                    record = {
                        'id': record_id,
                        'provider_id': provider_id,
                        'provider_name': provider_name,
                        'name': svc.get('name', '（名称未取得）'),
                        'scheme': svc.get('scheme', 'municipal_extra'),
                        'description': svc.get('description', ''),
                        'needs_tag_ids': svc.get('needs_tag_ids', []),
                        'price': svc.get('price'),
                        'price_source_snippet': svc.get('price_source_snippet', ''),
                        'reduction_hours': svc.get('reduction_hours', 0),
                        'application_route': svc.get('application_route', ''),
                        'source_url': url,
                        'source_type': source_type,
                        'extracted_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                        'verified_at': None,
                        'verified_by': None,
                        'status': 'draft',
                        'confidence_score': svc.get('confidence_score', 0.8),
                    }
                    new_records.append(record)
                    print(f'  [OK] {record["name"]} (confidence: {record["confidence_score"]})')

            browser.close()
    else:
        print('[SKIP] Playwright なしのため、スクレイピングをスキップします。')

    # 3. 既存ドラフトに追記して保存
    all_drafts = existing_drafts + new_records
    save_drafts(all_drafts)

    print('\n' + '-' * 60)
    print(f'[SUCCESS] {len(new_records)} 件を status=draft で {OUTPUT_FILE} に追記しました。')
    print('管理画面（/admin）から人手による内容確認・承認を行ってください。')
    print('=' * 60)
    return new_records


def main():
    parser = argparse.ArgumentParser(description='けあしる 自治体サービス収集スクリプト')
    parser.add_argument('--municipality', '-m', help='自治体名（例: 世田谷区）')
    parser.add_argument('--url', '-u', help='収集開始URL（--municipality 未指定時に使用）')
    parser.add_argument('--name', '-n', help='自治体名（--url 指定時の表示名）')
    parser.add_argument('--prefix', '-p', default='AUTO', help='サービスIDプレフィックス（例: STG）')
    parser.add_argument('--list', '-l', action='store_true', help='登録済み自治体の一覧を表示')
    args = parser.parse_args()

    municipalities = load_municipalities()

    if args.list:
        print('登録済み自治体:')
        for name, cfg in municipalities.items():
            print(f'  - {name}  ({cfg["url"]})')
        return

    if args.municipality:
        if args.municipality not in municipalities:
            print(f'[ERROR] "{args.municipality}" は municipalities.json に登録されていません。')
            print('登録済み自治体: ' + ', '.join(municipalities.keys()))
            print('--url オプションで直接URLを指定することもできます。')
            sys.exit(1)
        config = municipalities[args.municipality]
        id_prefix = config.get('id_prefix', args.prefix)
        run_pipeline(args.municipality, config, id_prefix)

    elif args.url:
        name = args.name or args.url.split('/')[2]
        config = {
            'provider_id': f'prov_{args.prefix.lower()}',
            'provider_name': name,
            'url': args.url,
            'seed_urls': [args.url],
        }
        run_pipeline(name, config, args.prefix)

    else:
        parser.print_help()
        print('\n使用例:')
        print('  python crawler/collect_services.py --municipality 世田谷区')
        print('  python crawler/collect_services.py --list')
        print('  python crawler/collect_services.py --url https://www.city.〇〇.lg.jp/koreisha/ --name 〇〇区 --prefix XXX')


if __name__ == '__main__':
    main()
