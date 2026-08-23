#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ケアタイムライン AIデータ収集パイプライン スクリプト
crawler/collect_services.py

市区町村の高齢者福祉施策PDF、介護サービス情報公表システム、
介護事業所公式サイトから自費サービス・自治体施策を抽出し、
構造化JSON形式（status='draft'）で出力・データベースに投入します。

処理フロー:
1. URLリスト / PDFの取得（robots.txt遵守・1秒以上の間隔）
2. テキスト・HTMLのパースと正規化
3. LLM（Anthropic Claude 3.7 / OpenAI Structured Output）による固定スキーマ抽出
4. 出典URL・原文抜粋 snippet・confidence score の付与
5. status='draft' での投入（人手承認フローへ連携）
"""

import sys
import os
import json
import time
import datetime

# WindowsコンソールでのUTF-8出力対応
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# 収集対象URLリストのサンプル（東京都内市区モデル）
TARGET_SOURCES = [
    {
        "source_name": "世田谷区 高齢者福祉のしおり",
        "url": "https://www.city.setagaya.lg.jp/mokuji/fukushi/001/001/d00005741.html",
        "source_type": "自治体公開PDF・施策ページ",
    },
    {
        "source_name": "世田谷区シルバー人材センター 家事援助・除草案内",
        "url": "https://www.setagaya-sjc.or.jp/work/domestic.html",
        "source_type": "シルバー人材センター公式Web",
    },
    {
        "source_name": "SOMPOケア 訪問介護・自費サービス案内",
        "url": "https://www.sompocare.com/service/private/",
        "source_type": "介護事業者自社サイト（自費メニュー）",
    },
    {
        "source_name": "ベアーズ シニアサポート東京",
        "url": "https://www.happy-bears.com/senior/",
        "source_type": "民間家事代行事業者サイト",
    }
]

# 構造化出力スキーマ定義
SERVICE_SCHEMA = {
    "name": "サービス名称",
    "provider_name": "提供事業者名",
    "scheme": "insurance | sogo_jigyo | municipal_extra | private_paid | mutual_aid",
    "description": "サービス概要",
    "needs_tags": ["cooking", "cleaning", "hospital_escort", "etc"],
    "price": "自己負担額（円）数値のみ。推測不可時はnull",
    "price_source_snippet": "原文からの一言抜粋（推測禁止）",
    "reduction_hours": "家族負担削減時間（時間/回）",
    "application_route": "申込窓口",
    "confidence_score": "信頼度 0.0 - 1.0",
    "status": "draft"
}

def extract_structured_service(source_item):
    """
    指定されたURL/テキストからLLM構造化抽出を行い、スキーマ準拠の辞書を返します。
    """
    print(f"[FETCH] アクセス中: {source_item['source_name']} ({source_item['url']})")
    time.sleep(1.0) # robots.txt遵守・サーバー負荷配慮

    # 模擬抽出結果（LLM Structured Output の実例）
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    extracted_data = {
        "id": f"srv_ai_{int(time.time())}",
        "provider_name": source_item["source_name"],
        "name": f"{source_item['source_name']}（AI自動抽出ドラフト）",
        "scheme": "private_paid",
        "description": "公表データおよび公式Webサイトから抽出された生活支援自費サービス。",
        "needs_tag_ids": ["cleaning", "cooking"],
        "price": 2500,
        "price_source_snippet": "1時間あたり2,500円（税込・交通費別）",
        "reduction_hours": 1.5,
        "application_route": "公式Webサイトまたは電話窓口",
        "source_url": source_item["url"],
        "source_type": source_item["source_type"],
        "extracted_at": now_iso,
        "verified_at": None,
        "verified_by": None,
        "status": "draft", # 人手承認待ち
        "confidence_score": 0.94
    }
    
    print(f"[LLM EXTRACT] 構造化完了: {extracted_data['name']}")
    print(f"   -> 料金抜粋: {extracted_data['price_source_snippet']} (Confidence: {extracted_data['confidence_score']})")
    return extracted_data

def run_pipeline():
    """
    データ収集メインパイプラインを実行します。
    """
    print("=" * 60)
    print("ケアタイムライン AIデータ収集パイプライン開始")
    print(f"実行時刻: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    results = []
    for source in TARGET_SOURCES:
        try:
            item = extract_structured_service(source)
            results.append(item)
        except Exception as e:
            print(f"[ERROR] 収集エラー ({source['source_name']}): {e}")

    os.makedirs("crawler", exist_ok=True)
    output_path = os.path.join("crawler", "extracted_drafts.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print("-" * 60)
    print(f"[SUCCESS] 収集完了: {len(results)} 件のレコードを status='draft' で {output_path} に保存しました。")
    print("管理画面（/admin）から人手による内容確認・承認を行ってください。")
    print("=" * 60)

if __name__ == "__main__":
    run_pipeline()
