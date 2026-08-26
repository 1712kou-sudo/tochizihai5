/**
 * 送る画面（ケアマネジャーがリンクを開いたときの見え方）
 *
 * ご家族が作った1週間の表・費用・面談で聞きたいことを、
 * そのまま相手が読める形で並べる。
 */

'use client';

import React, { useMemo } from 'react';
import { DAYS_OF_WEEK, RESTRICTION_RULES, TIME_PERIODS, NEEDS_TAGS } from '@/constants/careConstants';
import { Service, TimelineMetrics, TimelineSlot, UserInputData } from '@/types';
import { SLOT_COLORS, SCHEME_LABELS } from '@/utils/colors';
import { CARE_LEVEL_LIMITS } from '@/constants/careConstants';
import type { ConsultItem } from '@/components/ConsultChat';

const INK = '#2D231E';
const PRIMARY = '#C4511A';
const SUB = '#6E625B';

interface HandoffViewProps {
  userInput: UserInputData;
  slots: TimelineSlot[];
  metrics: TimelineMetrics;
  initialFamilyHours: number;
  /** 相談パネルでご家族が書き足したもの */
  consultItems?: ConsultItem[];
  onBack: () => void;
  onPrint: () => void;
}

const HOUSEHOLD_LABEL: Record<string, string> = {
  single: '独居',
  elderly_only: '高齢者のみ世帯',
  living_together: '同居家族あり',
  long_distance: '遠距離介護',
};

/** 今日の日付（サーバーとずれないよう、描画時ではなく利用時に組む） */
function todayLabel(): string {
  const d = new Date();
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export const HandoffView: React.FC<HandoffViewProps> = ({
  userInput,
  slots,
  metrics,
  initialFamilyHours,
  consultItems = [],
  onBack,
  onPrint,
}) => {
  const conditionLine = `${CARE_LEVEL_LIMITS[userInput.careLevel].name}・${
    HOUSEHOLD_LABEL[userInput.householdType] ?? ''
  }`;
  const savedHours = Math.max(0, initialFamilyHours - metrics.familyHoursPerWeek);

  /** 担い手ごとの枠数 */
  const legend = useMemo(() => {
    const count: Record<string, number> = { family: 0, insurance: 0, paid: 0, none: 0 };
    for (const s of slots) count[s.state] = (count[s.state] ?? 0) + 1;
    return (['family', 'insurance', 'paid', 'none'] as const).map((k) => ({
      key: k,
      token: SLOT_COLORS[k],
      count: count[k] ?? 0,
    }));
  }, [slots]);

  /** 検討しているサービス（安い順） */
  const plan = useMemo(() => {
    const map = new Map<string, { service: Service; cost: number }>();
    for (const s of slots) {
      if (!s.assignedService) continue;
      const cur = map.get(s.assignedService.id);
      if (cur) cur.cost += s.cost;
      else map.set(s.assignedService.id, { service: s.assignedService, cost: s.cost });
    }
    return [...map.values()].sort((a, b) => a.cost - b.cost);
  }, [slots]);

  /** 面談で聞きたいこと（入力内容から自動で作る） */
  const questions = useMemo(() => {
    const list: { q: string; why: string }[] = [];

    // 家族が担ったまま残っている枠
    const familyNeeds = new Set(
      slots.filter((s) => s.state === 'family' && s.needsTagId).map((s) => s.needsTagId as string)
    );
    if (familyNeeds.size > 0) {
      const names = [...familyNeeds]
        .map((id) => NEEDS_TAGS.find((t) => t.id === id)?.name)
        .filter(Boolean)
        .slice(0, 3)
        .join('・');
      list.push({
        q: `家族が担ったままの ${familyNeeds.size} 種類について、使える制度はありますか`,
        why: `${names} などが、いまの条件では埋まりませんでした。`,
      });
    }

    // 予定が入っていない枠
    const emptyCount = slots.filter((s) => !s.needsTagId).length;
    if (emptyCount > 0) {
      list.push({
        q: `予定が入っていない ${emptyCount} 枠は、このままで問題ないでしょうか`,
        why: '見落としがないか、専門職の目で確認していただきたい点です。',
      });
    }

    // 選んだ困りごとに関係する制度の境界
    for (const rule of RESTRICTION_RULES) {
      if (!userInput.selectedNeeds.includes(rule.needsTagId)) continue;
      list.push({ q: rule.title, why: rule.conditionText });
    }

    // 支給限度額
    if (metrics.isLimitExceeded) {
      list.push({
        q: '介護保険の支給限度額を超えていますが、どう調整すべきでしょうか',
        why: `試算では ${metrics.insuranceUnitsUsed.toLocaleString()} 単位で、限度額 ${metrics.insuranceUnitsLimit.toLocaleString()} 単位を超えています。`,
      });
    }

    return list.slice(0, 6);
  }, [slots, userInput.selectedNeeds, metrics]);

  const summary = [
    { k: '月にかかるお金', v: metrics.selfPayPerMonth.toLocaleString(), u: '円' },
    { k: 'サービスが担う時間', v: savedHours.toFixed(1), u: '時間/週' },
    { k: '家族に残る時間', v: metrics.familyHoursPerWeek.toFixed(1), u: '時間/週' },
  ];

  return (
    <div style={{ background: '#EFE7E0', minHeight: '100vh', padding: '44px 32px 96px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div
          className="no-print"
          style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            gap: 20, marginBottom: 20, flexWrap: 'wrap',
          }}
        >
          <p style={{ fontSize: 14, color: SUB }}>ケアマネジャーがリンクを開いたときの画面です</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={onPrint}
              className="press"
              style={{
                minHeight: 44, padding: '0 18px', borderRadius: 999,
                border: '2px solid #C4B5A8', background: 'transparent',
                fontSize: 14, fontWeight: 700, color: INK,
              }}
            >
              A4 1枚に印刷する
            </button>
            <button
              type="button"
              onClick={onBack}
              className="press"
              style={{
                minHeight: 44, padding: '0 18px', borderRadius: 999,
                border: '2px solid #C4B5A8', background: 'transparent',
                fontSize: 14, fontWeight: 700, color: INK,
              }}
            >
              ← 自分の画面に戻る
            </button>
          </div>
        </div>

        <div style={{ border: `2px solid ${INK}`, borderRadius: 16, background: '#fff', overflow: 'hidden' }}>
          {/* 見出し */}
          <div style={{ padding: '28px 36px', borderBottom: `2px solid ${INK}`, background: INK, color: '#F6F0EA' }}>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', color: '#A79A90' }}>
              ご家族から共有されました
            </span>
            <h1 className="font-display" style={{ marginTop: 10, fontSize: 28, fontWeight: 700, lineHeight: 1.6 }}>
              {conditionLine}の1週間
            </h1>
            <p style={{ marginTop: 10, fontSize: 15, lineHeight: 1.9, color: '#BFB4AA' }}>
              けあしるで作成・{todayLabel()}
            </p>
          </div>

          {/* 3指標 */}
          <div
            style={{
              padding: '32px 36px', borderBottom: '1px solid #E8DCD3',
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 28,
            }}
          >
            {summary.map((s) => (
              <div key={s.k}>
                <span style={{ fontSize: 13, fontWeight: 700, color: SUB }}>{s.k}</span>
                <div
                  className="font-display"
                  style={{
                    marginTop: 8, fontSize: 38, fontWeight: 900, color: PRIMARY,
                    fontVariantNumeric: 'tabular-nums', lineHeight: 1.1,
                  }}
                >
                  {s.v}
                  <span style={{ fontSize: 16, color: SUB, marginLeft: 4 }}>{s.u}</span>
                </div>
              </div>
            ))}
          </div>

          {/* 1週間の担い手 */}
          <div style={{ padding: '32px 36px', borderBottom: '1px solid #E8DCD3' }}>
            <h2 className="font-display" style={{ fontSize: 18, fontWeight: 700, color: INK }}>
              1週間の担い手
            </h2>
            <div style={{ marginTop: 16, overflowX: 'auto' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '72px repeat(7,minmax(0,1fr))',
                  gap: 5,
                  minWidth: 640,
                }}
              >
                <div />
                {DAYS_OF_WEEK.map((d) => (
                  <div key={d.key} style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: SUB }}>
                    {d.shortLabel}
                  </div>
                ))}
                {TIME_PERIODS.map((p) => (
                  <React.Fragment key={p.key}>
                    <div style={{ display: 'flex', alignItems: 'center', fontSize: 12, fontWeight: 700, color: SUB }}>
                      {p.label}
                    </div>
                    {DAYS_OF_WEEK.map((d) => {
                      const slot = slots.find((s) => s.id === `${d.key}-${p.key}`);
                      const tok = SLOT_COLORS[slot?.state ?? 'none'];
                      const tag = NEEDS_TAGS.find((t) => t.id === slot?.needsTagId);
                      return (
                        <div
                          key={`${d.key}-${p.key}`}
                          title={
                            slot?.assignedService
                              ? `${tag?.name ?? ''}／${slot.assignedService.name}`
                              : tag?.name ?? '予定なし'
                          }
                          style={{
                            height: 38,
                            borderRadius: 6,
                            background: tok.bgHex,
                            border: `2px ${slot?.state === 'none' || !slot ? 'dashed' : 'solid'} ${tok.borderHex}`,
                          }}
                        />
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 14, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              {legend.map((l) => (
                <span
                  key={l.key}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#4A413A' }}
                >
                  <span
                    style={{
                      width: 12, height: 12, borderRadius: 3,
                      background: l.token.bgHex,
                      border: `2px ${l.key === 'none' ? 'dashed' : 'solid'} ${l.token.borderHex}`,
                    }}
                  />
                  {l.token.label} {l.count}
                </span>
              ))}
            </div>
          </div>

          {/* 面談で聞きたいこと */}
          {questions.length > 0 && (
            <div style={{ padding: '32px 36px', borderBottom: '1px solid #E8DCD3', background: '#FFF3EA' }}>
              <h2 className="font-display" style={{ fontSize: 18, fontWeight: 700, color: INK }}>
                この面談で聞きたいこと
              </h2>
              <p style={{ marginTop: 6, fontSize: 14, color: SUB }}>
                ご家族の入力内容から自動で作成されています
              </p>
              <ol style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {questions.map((q, i) => (
                  <li key={q.q} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 14, alignItems: 'start' }}>
                    <span
                      style={{
                        width: 26, height: 26, borderRadius: 999, background: PRIMARY, color: '#fff',
                        fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', flexShrink: 0, fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {i + 1}
                    </span>
                    <div>
                      <p style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.7, color: INK }}>{q.q}</p>
                      <p style={{ marginTop: 5, fontSize: 14, lineHeight: 1.85, color: SUB }}>{q.why}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* ご家族から相談したいこと */}
          {consultItems.length > 0 && (
            <div style={{ padding: '32px 36px', borderBottom: '1px solid #E8DCD3' }}>
              <h2 className="font-display" style={{ fontSize: 18, fontWeight: 700, color: INK }}>
                ご家族から相談したいこと
              </h2>
              <p style={{ marginTop: 6, fontSize: 14, color: SUB }}>
                ご家族が相談パネルで書き足した内容です（{consultItems.length} 件）
              </p>
              <ul style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {consultItems.map((it) => (
                  <li
                    key={it.id}
                    style={{ border: `2px solid ${INK}`, borderRadius: 12, background: '#fff', padding: '14px 18px' }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#8A3D07' }}>
                      {it.title}
                      {it.related ? `／${it.related}` : ''}
                    </span>
                    <p style={{ marginTop: 5, fontSize: 15, lineHeight: 1.9, color: INK }}>{it.text}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 検討しているサービス */}
          <div style={{ padding: '32px 36px' }}>
            <h2 className="font-display" style={{ fontSize: 18, fontWeight: 700, color: INK }}>
              ご家族が検討しているサービス
            </h2>
            <ul style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {plan.map((p) => (
                <li
                  key={p.service.id}
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, alignItems: 'baseline',
                    paddingBottom: 12, borderBottom: '1px solid #E8DCD3',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: INK }}>{p.service.name}</span>
                    <span style={{ marginLeft: 10, fontSize: 13, color: SUB }}>{p.service.providerName}</span>
                    <div style={{ marginTop: 4, fontSize: 12, color: '#8A7F76' }}>
                      {SCHEME_LABELS[p.service.scheme].label}・出典：{p.service.sourceType}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 15, fontWeight: 700, color: '#B04512',
                      fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
                    }}
                  >
                    {p.cost > 0 ? `¥${Math.round(p.cost).toLocaleString()}／月` : '無料'}
                  </span>
                </li>
              ))}
            </ul>
            <p style={{ marginTop: 20, fontSize: 13, lineHeight: 1.9, color: SUB }}>
              試算は目安です。実際の給付算定・利用可否は担当ケアマネジャーおよび市区町村の判断によります。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
