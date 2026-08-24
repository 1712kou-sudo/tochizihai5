// @ts-nocheck
/**
 * けあしる Cloudflare Worker
 *
 * - /api/collect  POST  { url, municipalityName } → サービスJSON
 * - /api/links    GET   ?url=...                  → ページ内リンク一覧
 * - その他                                        → 静的アセットを返す
 *
 * 探索ルールは discovery_rules.json に準拠。
 * 否定語・role 別 search_terms を埋め込み、ノイズを排除する。
 */

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  ANTHROPIC_API_KEY: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonRes(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

// ── discovery_rules.json 埋め込み ────────────────────────────

/** 各 role の代表 search_terms（URLとテキストマッチに使う） */
const ROLE_SEARCH_TERMS: Record<string, string[]> = {
  citizen_guide: [
    '高齢者福祉のしおり', '高齢者のしおり', '高齢者ガイドブック',
    '高齢者福祉サービスのご案内', '高齢者福祉サービス一覧',
    '介護保険と高齢者福祉', '高齢者の生活ガイド', 'シニアガイドブック',
  ],
  service_ledger: [
    '福祉のあらまし', '福祉概要', '高齢福祉事業概要',
    '事務事業概要', '保健福祉事業概要',
  ],
  sogo_jigyo_providers: [
    '介護予防・日常生活支援総合事業', '第一号訪問事業', '第一号通所事業',
    '訪問型サービス 事業所', '通所型サービス 事業所', '総合事業 指定事業者',
  ],
  chiiki_hokatsu_list: [
    '地域包括支援センター', '高齢者相談センター', 'あんしんすこやかセンター',
    'おとしより相談センター', '高齢者総合相談センター', '長寿サポートセンター',
  ],
  meal_delivery: [
    '配食サービス', '見守り配食', '食の自立支援事業', '高齢者 食事サービス',
  ],
  community_salon: [
    '通いの場', '地域サロン', 'ケアカフェ', 'ふれあいサロン',
    'いきいき百歳体操', '高齢者 居場所',
  ],
  watch_over_service: [
    '緊急通報システム', '高齢者 見守り', '安否確認サービス',
    'ひとり暮らし高齢者 支援',
  ],
  welfare_equipment: [
    '自立支援用具', '福祉用具 給付', '住宅改修 助成',
    '紙おむつ 支給',
  ],
  shakyo: [
    '社会福祉協議会 生活支援', 'ふれあいサービス', 'たすけあいサービス',
    '住民参加型 在宅福祉',
  ],
  silver_jinzai: [
    'シルバー人材センター 家事', 'シルバー人材センター 料金',
  ],
};

/** discovery_rules.json の全 role を合わせた一覧（リンク抽出用） */
const ALL_ROLE_TERMS: string[] = Object.values(ROLE_SEARCH_TERMS).flat();

/**
 * 否定語リスト（discovery_rules.json の negative_terms を統合）。
 * いずれかを含むページは候補から除外する。
 */
const NEGATIVE_TERMS = [
  '議事録', '会議録', '入札', '職員採用', 'パブリックコメント', '計画（案）',
  '予算書', '決算書', '指定申請', '様式集', '様式ダウンロード',
  '研修', '公募', '事務連絡', '通知文', '要綱', '規則', '条例', '答申',
];

// ── ユーティリティ ────────────────────────────────────────────

/** HTMLから本文テキストを抽出 */
function extractText(html: string): string {
  let t = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
  t = t.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
  t = t.replace(/<[^>]+>/g, ' ');
  t = t.replace(/\s+/g, ' ').trim();
  return t.slice(0, 8000);
}

/**
 * 否定語チェック。
 * タイトルや本文テキストが否定語を含む場合は true を返す。
 */
function hasNegativeTerm(text: string): boolean {
  return NEGATIVE_TERMS.some((term) => text.includes(term));
}

/**
 * 公式ドメイン判定（discovery_rules.json DOM-1）。
 * - `.lg.jp` は全国共通で公式
 * - `.tokyo.jp` は東京23区（city.XXX.tokyo.jp）の例外
 */
function isOfficialDomain(hostname: string): boolean {
  if (hostname.endsWith('.lg.jp')) return true;
  // 東京23区: city.<区名>.tokyo.jp
  if (/^(?:www\.)?city\.[a-z0-9-]+\.tokyo\.jp$/.test(hostname)) return true;
  return false;
}

// 明らかにサービス無関係なナビゲーションリンクのアンカーテキスト
const NAV_SKIP_TEXTS = [
  'ページトップ', 'トップページ', 'サイトマップ', 'プライバシーポリシー',
  '文字サイズ', '閲覧支援', '音声読み上げ', 'ふりがな', 'Foreign Language',
  'English', '中文', '한국어', 'Deutsch', 'Français', 'Español', 'Português',
  '本文へスキップ', 'ページID', '旧ページID', 'お問い合わせ', 'アクセス',
  '窓口', 'サイト内検索', '検索', 'メニュー', '閉じる',
  '外国人住民', '議会', '観光', 'まちづくり', '都市計画', '教育', '子ども',
  '産業', '税金', '保険・年金', 'ごみ', 'リサイクル', '防災', '救急・防犯',
  'ペット', '人権', '消費生活', '選挙',
];

// 高優先度キーワード（サービスページを識別するための語彙）
const SERVICE_PRIORITY_TERMS = [
  '高齢', '介護', '福祉', '支援', '給付', '補助', '助成', '通報', '見守り',
  '配食', '会食', '訪問', '入浴', '緊急', '救急', '地域包括', '総合事業',
  'サービス', '申請', '利用', 'ひとりぐらし', '在宅',
];

/**
 * ページ内の同ドメインリンクを収集。
 * - 同一オリジンのみ（discovery_rules.json: lg.jp 外は除外対象）
 * - アンカーテキストが日本語（ひらがな・カタカナ・漢字）を含むリンクを採用
 *   ※ 自治体サイトのURLパスはASCIIのみのため href キーワードマッチは使わない
 *   ※ 各自治体で異なる語彙（救急通報 vs 緊急通報、会食 vs 配食 等）に対応
 * - NEGATIVE_TERMS を含むリンクは除外
 * - ナビゲーション系リンクは除外
 */
function extractLinks(html: string, baseUrl: string): string[] {
  const base = new URL(baseUrl);
  const seen = new Set<string>();
  const results: string[] = [];
  // 日本語文字（ひらがな・カタカナ・漢字）を含むか判定
  const hasJapanese = (s: string) => /[\u3040-\u30ff\u4e00-\u9fff]/.test(s);

  for (const m of html.matchAll(/<a\b[^>]*\bhref="([^"#][^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    try {
      const href = m[1];
      if (href.startsWith('javascript')) continue;
      const anchorText = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      const abs = new URL(href, base).href;

      // 同一オリジンのみ
      if (!abs.startsWith(base.origin)) continue;
      if (seen.has(abs)) continue;

      // アンカーテキストが日本語を含まない（英語ナビ等）はスキップ
      if (!hasJapanese(anchorText)) continue;
      // 短すぎるテキスト（「次へ」等）はスキップ
      if (anchorText.length < 6) continue;
      // ナビゲーション系スキップ
      if (NAV_SKIP_TEXTS.some((t) => anchorText.includes(t))) continue;
      // 否定語チェック
      if (hasNegativeTerm(anchorText) || hasNegativeTerm(href)) continue;

      seen.add(abs);
      // サービス関連語彙を含むリンクを優先（先頭に積む）
      if (SERVICE_PRIORITY_TERMS.some((t) => anchorText.includes(t))) {
        results.unshift(abs);
      } else {
        results.push(abs);
      }
    } catch { /* ignore */ }
  }
  return results.slice(0, 20);
}

// ── Claude へ渡すプロンプト ───────────────────────────────────

const EXTRACT_PROMPT = `以下のWebページから高齢者向けサービス情報を抽出してJSON配列で返してください。
サービスが見つからない場合は []。複数あれば全て列挙。

【重要】discovery_rules.json に準拠した判定基準:
- 議事録・入札・様式・パブリックコメント・計画案 等を含むページはスキップ（既に除外済みのはずだが念のため確認）
- citizen_guide として採用するには「円」「自己負担」「利用料」のいずれかが必要
- 資料の基準日（「令和N年M月D日現在」等）を必ず抽出する
- 基準日が現在（2026年8月）から18か月以上前の場合、stale_candidate を true にする
- ドメインが .lg.jp なら source_official を true にする

role の種類:
- citizen_guide: 高齢者向けサービス案内冊子
- service_ledger: 行政の事務事業台帳
- sogo_jigyo: 総合事業
- chiiki_hokatsu: 地域包括支援センター一覧
- meal_delivery: 配食・食事サービス
- community_salon: 通いの場・サロン
- watch_over: 見守り・緊急通報
- welfare_equipment: 福祉用具・住宅改修助成
- shakyo: 社会福祉協議会の生活支援
- silver_jinzai: シルバー人材センター

各オブジェクトのスキーマ:
{
  "role": "上記 role 名のいずれか（該当なしは null）",
  "name": "サービス名",
  "scheme": "municipal_extra | sogo_jigyo | insurance | private_paid | mutual_aid のいずれか",
  "description": "概要（100〜200字）",
  "needs_tag_ids": ["cooking","cleaning","shopping_daily","laundry","garbage","bath_care","excretion_care","dressing_care","medication_check","hospital_escort","safety_check_day","talking_partner","day_service","rehab_training","short_stay","weekend_relief","handyman_tasks","gardening_weed","futon_drying","haircut_visit","emergency_system","care_consultation" のうち該当するもの],
  "price": 自己負担額（整数・円）または null,
  "price_source_snippet": "料金に関する原文の一言抜粋（見つからない場合は空文字）",
  "reduction_hours": 家族介護時間の削減量（時間/回・不明なら0）,
  "application_route": "申込窓口",
  "reference_date": "資料の基準日（例: 令和7年4月1日現在）。不明なら null",
  "stale_candidate": false,
  "source_official": true,
  "confidence_score": 0.0〜1.0
}

JSON配列のみ返答。説明文・前置き不要。`;

// ── Worker エントリポイント ───────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // ── GET /api/links?url=... ──────────────────────────────
    if (url.pathname === '/api/links' && request.method === 'GET') {
      const targetUrl = url.searchParams.get('url');
      if (!targetUrl) return jsonRes({ error: 'url required' }, 400);

      // 公式ドメインのみ探索対象（discovery_rules.json DOM-1）
      try {
        const parsed = new URL(targetUrl);
        if (!isOfficialDomain(parsed.hostname)) {
          return jsonRes({ error: 'Only official municipality domains (.lg.jp or Tokyo-23-ward .tokyo.jp) are supported', links: [] });
        }
      } catch {
        return jsonRes({ error: 'invalid url' }, 400);
      }

      try {
        const resp = await fetch(targetUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'ja' },
        });
        if (!resp.ok) {
          return jsonRes({ error: `HTTP ${resp.status}`, links: [] });
        }
        const html = await resp.text();
        const links = extractLinks(html, targetUrl);
        return jsonRes({ links });
      } catch (e) {
        return jsonRes({ error: String(e) }, 500);
      }
    }

    // ── POST /api/collect ──────────────────────────────────
    if (url.pathname === '/api/collect' && request.method === 'POST') {
      // 全体を try-catch で囲み、未捕捉例外によるHTML返却を防ぐ
      try {
        let body: { url: string; municipalityName?: string };
        try {
          body = await request.json() as typeof body;
        } catch {
          return jsonRes({ error: 'invalid JSON' }, 400);
        }
        const { url: targetUrl, municipalityName = '' } = body;
        if (!targetUrl) return jsonRes({ error: 'url required' }, 400);

        // 公式ドメインのみ（discovery_rules.json DOM-1、東京23区は.tokyo.jpも許可）
        try {
          const parsed = new URL(targetUrl);
          if (!isOfficialDomain(parsed.hostname)) {
            return jsonRes({ error: 'Only official municipality domains (.lg.jp or Tokyo-23-ward .tokyo.jp) are supported.' }, 400);
          }
        } catch {
          return jsonRes({ error: 'invalid url' }, 400);
        }

        const apiKey = env.ANTHROPIC_API_KEY;
        if (!apiKey) return jsonRes({ error: 'ANTHROPIC_API_KEY not configured' }, 500);

        // 1. ページテキスト取得
        let pageText = '';
        let pageTitle = '';
        const pageResp = await fetch(targetUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'ja,en;q=0.9' },
        });
        if (!pageResp.ok) {
          return jsonRes({ error: `fetch failed: HTTP ${pageResp.status}` }, 500);
        }
        const html = await pageResp.text();

        // タイトル抽出
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        pageTitle = titleMatch ? titleMatch[1] : '';

        // 否定語チェック（タイトルレベルで弾く）
        if (hasNegativeTerm(pageTitle)) {
          return jsonRes({
            services: [],
            skipped: true,
            reason: `否定語を含むページはスキップしました（タイトル: ${pageTitle}）`,
          });
        }

        pageText = extractText(html);

        // 否定語チェック（本文テキストレベル）
        if (hasNegativeTerm(pageText.slice(0, 500))) {
          return jsonRes({
            services: [],
            skipped: true,
            reason: '否定語（議事録・入札等）を含むページはスキップしました',
          });
        }

        // 2. Claude API で構造化抽出
        const claudeResp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 2048,
            messages: [{
              role: 'user',
              content: `${EXTRACT_PROMPT}\n\n---\nURL: ${targetUrl}\n自治体: ${municipalityName}\nページタイトル: ${pageTitle}\n\n${pageText}`,
            }],
          }),
        });

        if (!claudeResp.ok) {
          // Anthropic がHTML等を返す場合もあるので text() で受けてからJSONを試みる
          const errText = await claudeResp.text();
          let errMsg = `Claude ${claudeResp.status}`;
          try {
            const errJson = JSON.parse(errText) as { error?: { message: string } };
            errMsg = errJson.error?.message ?? errMsg;
          } catch { /* not JSON */ }
          return jsonRes({ error: errMsg }, claudeResp.status);
        }

        const claudeData = await claudeResp.json() as { content: { text: string }[] };
        let raw = claudeData.content[0].text.trim();

        // ```json ... ``` ブロックを除去
        const fence = raw.indexOf('```');
        if (fence !== -1) {
          raw = raw.slice(fence + 3);
          if (raw.startsWith('json')) raw = raw.slice(4);
          const end = raw.indexOf('```');
          if (end !== -1) raw = raw.slice(0, end);
        }

        try {
          const services = JSON.parse(raw.trim());
          // verdict は自動で採用にしない（discovery_rules D5-PRF-4）
          const sanitized = (Array.isArray(services) ? services : []).map((s: any) => ({
            ...s,
            verdict: '未評価',
            tier: 1,
          }));
          return jsonRes({ services: sanitized });
        } catch {
          return jsonRes({ error: 'parse error', raw }, 500);
        }
      } catch (e) {
        // 未捕捉例外をJSONで返す（Cloudflare HTMLエラーページを防ぐ）
        return jsonRes({ error: `internal error: ${String(e)}` }, 500);
      }
    }

    // ── その他 → 静的アセット ───────────────────────────────
    return env.ASSETS.fetch(request);
  },
};
