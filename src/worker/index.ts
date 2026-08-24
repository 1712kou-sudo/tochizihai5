/**
 * けあしる Cloudflare Worker
 *
 * - /api/collect  POST  { url, apiKey, municipalityName } → サービスJSON
 * - /api/links    GET   ?url=...                          → ページ内リンク一覧
 * - その他                                                → 静的アセットを返す
 */

interface Env {
  ASSETS: Fetcher;
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

/** HTMLから本文テキストを抽出 */
function extractText(html: string): string {
  let t = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
  t = t.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
  t = t.replace(/<[^>]+>/g, ' ');
  t = t.replace(/\s+/g, ' ').trim();
  return t.slice(0, 8000);
}

/** ページ内の同ドメインリンクを収集 */
function extractLinks(html: string, baseUrl: string): string[] {
  const base = new URL(baseUrl);
  const seen = new Set<string>();
  const SERVICE_KW = ['サービス', '支援', '補助', '給付', '助成', '配食', '食事', '訪問', '見守り', '緊急', '通報', '介護', '外出'];
  const results: string[] = [];

  for (const m of html.matchAll(/href="([^"#?]+)"/g)) {
    try {
      const abs = new URL(m[1], base).href;
      if (!abs.startsWith(base.origin)) continue;
      if (seen.has(abs)) continue;
      const path = new URL(abs).pathname;
      if (SERVICE_KW.some((kw) => m[1].includes(kw) || path.includes(kw))) {
        seen.add(abs);
        results.push(abs);
      }
    } catch { /* ignore */ }
  }
  return results.slice(0, 20);
}

const EXTRACT_PROMPT = `以下のWebページから高齢者向けサービス情報を抽出してJSON配列で返してください。
サービスが見つからない場合は []。複数あれば全て列挙。

各オブジェクトのスキーマ:
{
  "name": "サービス名",
  "scheme": "municipal_extra | sogo_jigyo | insurance | private_paid | mutual_aid のいずれか",
  "description": "概要（100〜200字）",
  "needs_tag_ids": ["cooking","cleaning","shopping_daily","laundry","garbage","bath_care","excretion_care","dressing_care","medication_check","hospital_escort","safety_check_day","talking_partner","day_service","rehab_training","short_stay","weekend_relief","handyman_tasks","gardening_weed","futon_drying","haircut_visit","emergency_system","care_consultation" のうち該当するもの],
  "price": 自己負担額（整数・円）または null,
  "price_source_snippet": "料金に関する原文の一言抜粋（見つからない場合は空文字）",
  "reduction_hours": 家族介護時間の削減量（時間/回・不明なら0）,
  "application_route": "申込窓口",
  "confidence_score": 0.0〜1.0
}

JSON配列のみ返答。説明文・前置き不要。`;

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
      try {
        const resp = await fetch(targetUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'ja' },
        });
        const html = await resp.text();
        const links = extractLinks(html, targetUrl);
        return jsonRes({ links });
      } catch (e) {
        return jsonRes({ error: String(e) }, 500);
      }
    }

    // ── POST /api/collect ──────────────────────────────────
    if (url.pathname === '/api/collect' && request.method === 'POST') {
      let body: { url: string; municipalityName?: string };
      try {
        body = await request.json() as typeof body;
      } catch {
        return jsonRes({ error: 'invalid JSON' }, 400);
      }
      const { url: targetUrl, municipalityName = '' } = body;
      if (!targetUrl) return jsonRes({ error: 'url required' }, 400);
      const apiKey = env.ANTHROPIC_API_KEY;
      if (!apiKey) return jsonRes({ error: 'ANTHROPIC_API_KEY not configured' }, 500);

      // 1. ページテキスト取得
      let pageText = '';
      try {
        const resp = await fetch(targetUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'ja,en;q=0.9' },
        });
        pageText = extractText(await resp.text());
      } catch (e) {
        return jsonRes({ error: `fetch failed: ${e}` }, 500);
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
            content: `${EXTRACT_PROMPT}\n\n---\nURL: ${targetUrl}\n自治体: ${municipalityName}\n\n${pageText}`,
          }],
        }),
      });

      if (!claudeResp.ok) {
        const err = await claudeResp.json() as { error?: { message: string } };
        return jsonRes({ error: err.error?.message ?? `Claude ${claudeResp.status}` }, claudeResp.status);
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
        return jsonRes({ services: Array.isArray(services) ? services : [] });
      } catch {
        return jsonRes({ error: 'parse error', raw }, 500);
      }
    }

    // ── その他 → 静的アセット ───────────────────────────────
    return env.ASSETS.fetch(request);
  },
};
