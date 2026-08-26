/**
 * 相談パネルの回答生成
 *
 * 方針:
 * 入力済みの条件とこの試算結果の範囲でだけ答える。
 * 本人の状態・事業者の空き・認定区分など、判断が要ることは推測せず、
 * 「ケアマネジャーへの相談事項（案）」として文章を組み立てて返す。
 */

import { CARE_LEVEL_LIMITS, NEEDS_TAGS, RESTRICTION_RULES } from '@/constants/careConstants';
import { Service, TimelineMetrics, TimelineSlot, UserInputData } from '@/types';
import { SCHEME_LABELS } from '@/utils/colors';

const HOUSEHOLD_LABEL: Record<string, string> = {
  single: '独居',
  elderly_only: '高齢者のみ世帯',
  living_together: '同居家族あり',
  long_distance: '遠距離介護',
};

const yen = (n: number) => `${Math.round(n).toLocaleString()}円`;
/** 「訪問介護（生活援助 45分以上）」→「訪問介護」 */
const shortName = (name: string) => name.split('（')[0];

export interface ConsultContext {
  /** 何について聞いているか（サービス名やマス目） */
  label?: string;
  serviceId?: string;
  slotId?: string;
}

export interface ConsultReply {
  kind: 'answer' | 'escalate';
  text: string;
  /** escalate のときだけ：相談事項の下書き */
  draft?: string;
  title?: string;
  related?: string;
}

interface PlanRow {
  service: Service;
  times: number;
  cost: number;
}

/** 割り当て済みサービスを安い順にまとめる */
export function buildPlanRows(slots: TimelineSlot[]): PlanRow[] {
  const map = new Map<string, PlanRow>();
  for (const s of slots) {
    if (!s.assignedService) continue;
    const cur = map.get(s.assignedService.id);
    if (cur) {
      cur.times += 1;
      cur.cost += s.cost;
    } else {
      map.set(s.assignedService.id, { service: s.assignedService, times: 1, cost: s.cost });
    }
  }
  return [...map.values()].sort((a, b) => a.cost - b.cost);
}

export function respond(
  question: string,
  ctx: ConsultContext | null,
  input: UserInputData,
  slots: TimelineSlot[],
  metrics: TimelineMetrics,
  budget: number,
  force = false
): ConsultReply {
  const careLevel = CARE_LEVEL_LIMITS[input.careLevel].name;
  const household = HOUSEHOLD_LABEL[input.householdType] ?? '';
  const rows = buildPlanRows(slots);
  const slot = ctx?.slotId ? slots.find((s) => s.id === ctx.slotId) : undefined;
  const svc =
    (ctx?.serviceId ? rows.find((r) => r.service.id === ctx.serviceId)?.service : undefined) ??
    slot?.assignedService;
  const target = svc?.name ?? ctx?.label ?? 'この予定';
  const when = slot
    ? `${slot.day === 'mon' ? '月' : slot.day === 'tue' ? '火' : slot.day === 'wed' ? '水' : slot.day === 'thu' ? '木' : slot.day === 'fri' ? '金' : slot.day === 'sat' ? '土' : '日'}曜日の${
        slot.period === 'morning' ? '朝' : slot.period === 'daytime' ? '日中' : slot.period === 'evening' ? '夕方' : '夜間'
      }`
    : '';
  const has = (re: RegExp) => re.test(question);

  const escalate = (why: string, draft: string, title: string): ConsultReply => ({
    kind: 'escalate',
    text: `これは担当ケアマネジャーの判断が必要です。${why}入力いただいた情報だけでは判断できないため、推測でお答えしません。下の文章を確認して「相談したいこと」に追加しておけば、面談でそのまま使えます。`,
    draft,
    title,
    related: target + (when ? `（${when}）` : ''),
  });

  if (force) {
    return escalate(
      '',
      `${when ? `${when}に予定されている` : ''}${target}について、確認したいことがあります。${question}`,
      `${target}について`
    );
  }

  /* ── 判断が要るもの：推測せず相談事項にする ──
     「組み合わせ」を本人適合の質問と取り違えないよう、
     「合わ」は否定形・疑問形だけを見る。 */
  if (has(/嫌|いや|本人|母|父|祖母|祖父|認知|症状|体調|状態|大丈夫|向いて|合わな|合うか|合いま|不安/)) {
    return escalate(
      'ご本人の状態やお気持ちに合うかどうかは、実際に会って判断する必要があります。',
      `${when ? `${when}に予定されている` : ''}${target}について、本人が利用を希望しない可能性があります。本人の状態に合うかどうかを含め、サービス内容または利用日時の変更が可能か相談したいです。`,
      `${target}が本人に合うか`
    );
  }
  if (has(/仕事|都合|曜日|時間を変|変更|ずら|対応できない|いない|留守/)) {
    return escalate(
      '事業者の空き状況によって変更できるかが決まるため、こちらでは確定できません。',
      `${when ? `${when}に予定されている` : ''}${target}について、当日は家族が対応できないため、曜日または時間帯を変更できないか相談したいです。`,
      `${target}の日程変更`
    );
  }
  if (has(/申請|認定|区分|手続き|窓口/)) {
    return escalate(
      '認定区分や申請の妥当性は、心身の状況の確認が必要な判断です。',
      `現在は${careLevel}・${household}ですが、今の生活状況で区分変更の申請が妥当かどうか相談したいです。`,
      '認定区分について'
    );
  }

  /* ── 入力済みの情報で答えられるもの ── */
  if (has(/費用|いくら|金額|料金|お金|負担|払/)) {
    const ins = rows
      .filter((r) => r.service.scheme === 'insurance' || r.service.scheme === 'sogo_jigyo')
      .reduce((a, r) => a + r.cost, 0);
    const paid = metrics.selfPayPerMonth - ins;
    const cheapest = rows
      .slice(0, 3)
      .map((r) => `${shortName(r.service.name)} ${r.cost > 0 ? yen(r.cost) : '無料'}`)
      .join('、');
    return {
      kind: 'answer',
      text:
        `いまの組み合わせは月 ${yen(metrics.selfPayPerMonth)} です。内訳は介護保険・総合事業の自己負担が ${yen(ins)}、保険外（自治体施策・民間・互助）が ${yen(Math.max(0, paid))} です。` +
        (cheapest ? `安い順に ${cheapest} となっています。` : '') +
        `設定した上限は ${yen(budget)} なので、残りは ${yen(Math.max(0, budget - metrics.selfPayPerMonth))} です。` +
        `（保険給付は1割負担で試算しています。所得により2〜3割になる場合があります）`,
    };
  }

  if (has(/減らす|やめ|削|安く|下げ|節約/)) {
    if (rows.length === 0) {
      return { kind: 'answer', text: 'いまサービスは割り当てられていないため、減らせるものはありません。' };
    }
    const top = rows[rows.length - 1];
    return {
      kind: 'answer',
      text:
        `いちばん費用が大きいのは ${shortName(top.service.name)}（月 ${yen(top.cost)}・${
          top.service.priceModel === 'per_month' ? '月ぎめ' : `週${top.times}回`
        }）です。` +
        `これを外すと月 ${yen(metrics.selfPayPerMonth - top.cost)} になりますが、その枠は家族が担うことになります。` +
        `逆に ${shortName(rows[0].service.name)} は ${rows[0].cost > 0 ? yen(rows[0].cost) : '無料'} なので、費用のわりに負担が減る組み合わせです。` +
        `マス目を押せば1枠ずつ差し替えられます。`,
    };
  }

  if (has(/毎週|毎日|回数|頻度|何回|どのくらい使/)) {
    return {
      kind: 'answer',
      text:
        `いまの予定はこうなっています。${rows
          .map((r) => `${shortName(r.service.name)}が${r.service.priceModel === 'per_month' ? '月ぎめ' : `週${r.times}回`}`)
          .join('、')}。` +
        `回数は、入力いただいた困りごとが発生する曜日と時間帯から自動で置いたものです。実際に毎週必要かどうかは、生活のリズムに合わせて減らしてかまいません。`,
    };
  }

  if (has(/なぜ|理由|どうして|必要な|選ば|おすすめ/)) {
    if (svc) {
      const i = rows.findIndex((r) => r.service.id === svc.id);
      return {
        kind: 'answer',
        text:
          `${target}は、この枠に頼める候補の中で ${i + 1} 番目に安い組み合わせだったため選ばれています。1回あたり ${yen(svc.price)} で、` +
          `料金の根拠は「${svc.priceSourceSnippet}」（${svc.sourceType}）です。` +
          `医学的な必要性を判断したものではなく、費用の安い順に当てはめた結果です。`,
      };
    }
    return {
      kind: 'answer',
      text:
        `この組み合わせは、設定された上限 ${yen(budget)} の範囲で、1回あたりの費用が安い順に当てはめたものです。` +
        `${careLevel}・${household}という条件で使える制度を先に当て、足りない部分を保険外で埋めています。` +
        `医学的な必要性を判断したものではないため、優先順位はケアマネジャーと相談して入れ替えてください。`,
    };
  }

  if (has(/違い|比べ|比較|どっち|ほか|他の/)) {
    return {
      kind: 'answer',
      text:
        `制度の違いはこうです。介護保険給付と総合事業はケアマネジャーがケアプランに位置づける必要があり、区分ごとの上限単位数を消費します。` +
        `自治体施策は区の窓口へ申し込み、所得や要介護度の条件があります。民間自費と地域互助は上限に関係なく直接申し込めますが、全額自己負担です。` +
        `個別のサービスを比べたい場合は、その枠のマス目を押してから聞いてください。`,
    };
  }

  if (has(/空き|空いて|入ってない|予定なし|埋ま/)) {
    const none = slots.filter((s) => !s.needsTagId).length;
    const uncovered = [
      ...new Set(slots.filter((s) => s.needsTagId && s.state === 'family').map((s) => s.needsTagId as string)),
    ]
      .map((id) => NEEDS_TAGS.find((t) => t.id === id)?.name)
      .filter(Boolean);
    return {
      kind: 'answer',
      text:
        `28枠のうち、予定が入っていない枠が ${none} 枠あります。` +
        (uncovered.length
          ? `また ${uncovered.join('、')} は予定はあるものの、上限内で頼める先が見つからず家族が担う予定です。`
          : '予定のある枠はすべてサービスが担う計算です。') +
        `上限を上げるか、マス目を押して差し替えると変わります。`,
    };
  }

  if (has(/保険|自費|対象|使える|適用/)) {
    const rule = RESTRICTION_RULES.find((r) => input.selectedNeeds.includes(r.needsTagId));
    if (rule) {
      return {
        kind: 'answer',
        text:
          `${rule.title}について。${rule.conditionText} ${rule.explanation}（根拠：${rule.officialSource}）` +
          `ただし個別の適用可否は市区町村とケアマネジャーの判断になります。`,
      };
    }
  }

  return escalate(
    'ご事情に踏み込んだ判断が必要な内容です。',
    `${when ? `${when}の` : ''}${target}について確認したいことがあります。${question}`,
    `${target}について`
  );
}

/** スキーム名（相談パネルの表示用） */
export function schemeLabel(service: Service): string {
  return SCHEME_LABELS[service.scheme].label;
}
