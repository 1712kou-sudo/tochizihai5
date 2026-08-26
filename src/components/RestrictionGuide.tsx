/**
 * 確認すること
 *
 * 面談で聞くべき点を1件ずつ並べ、押した行だけを開く。
 * ・埋まらなかった枠（家族が担ったまま残った困りごと）
 * ・選んだ困りごとに関係する制度の境界ルール
 */

'use client';

import React, { useMemo, useState } from 'react';
import { NEEDS_TAGS, RESTRICTION_RULES } from '@/constants/careConstants';
import { CareLevel, HouseholdType, TimelineSlot } from '@/types';

const INK = '#2D231E';
const SUB = '#6E625B';

interface RestrictionGuideProps {
  selectedNeedIds: string[];
  householdType: HouseholdType;
  careLevel: CareLevel;
  /** 埋まらなかった枠を数えるために使う */
  slots?: TimelineSlot[];
}

interface CheckItem {
  id: string;
  title: string;
  body: string;
  source?: string;
  /** 全額自費のものは濃い点にして、制度で拾えないことを示す */
  strong?: boolean;
}

export const RestrictionGuide: React.FC<RestrictionGuideProps> = ({
  selectedNeedIds,
  slots = [],
}) => {
  const [openId, setOpenId] = useState<string | null>(null);

  const items = useMemo<CheckItem[]>(() => {
    const list: CheckItem[] = [];

    // 家族が担ったまま残った困りごと
    const remaining = new Set(
      slots.filter((s) => s.state === 'family' && s.needsTagId).map((s) => s.needsTagId as string)
    );
    if (remaining.size > 0) {
      const names = [...remaining]
        .map((id) => NEEDS_TAGS.find((t) => t.id === id)?.name)
        .filter(Boolean)
        .join('・');
      list.push({
        id: 'unfilled',
        title: `埋まらなかった枠が ${remaining.size} 種類あります`,
        body: `${names} は、いまの条件では引き受けられるサービスが見つかりませんでした。時間帯をずらせないか、近隣に対応できる事業者がないかを相談してみてください。`,
      });
    }

    // 制度の境界ルール
    for (const rule of RESTRICTION_RULES) {
      if (!selectedNeedIds.includes(rule.needsTagId)) continue;
      list.push({
        id: rule.id,
        title: rule.title,
        body: `${rule.conditionText} ${rule.explanation}`,
        source: rule.officialSource,
        strong: rule.isCovered === 'not_covered',
      });
    }

    return list;
  }, [selectedNeedIds, slots]);

  if (items.length === 0) return null;

  return (
    <section
      style={{ border: `2px solid ${INK}`, borderRadius: 16, background: '#fff', overflow: 'hidden' }}
    >
      {/* 見出し */}
      <div
        style={{
          padding: '24px 28px',
          borderBottom: `2px solid ${INK}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 20,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h2 className="font-display" style={{ fontSize: 22, fontWeight: 700, color: INK }}>
            確認すること
          </h2>
          <p style={{ marginTop: 6, fontSize: 14, color: SUB }}>
            面談で聞くべき点をここにまとめています
          </p>
        </div>
        <span
          style={{
            padding: '5px 14px',
            borderRadius: 999,
            background: '#FDE8DC',
            color: '#8A3D07',
            fontSize: 13,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {items.length} 件
        </span>
      </div>

      {/* 1件ずつ開く */}
      <ul>
        {items.map((item) => {
          const isOpen = openId === item.id;
          return (
            <li key={item.id} style={{ borderBottom: '1px solid #E8DCD3' }}>
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : item.id)}
                aria-expanded={isOpen}
                style={{
                  width: '100%',
                  padding: '18px 28px',
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto',
                  gap: 16,
                  alignItems: 'center',
                  textAlign: 'left',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 999,
                    background: item.strong ? INK : '#C4511A',
                  }}
                />
                <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.6, color: INK }}>
                  {item.title}
                </span>
                <span
                  aria-hidden="true"
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 999,
                    background: '#F3EAE3',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: isOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform .25s ease',
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6E625B" strokeWidth="3" strokeLinecap="round">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </button>

              <div className="disclosure-collapse" data-open={isOpen ? 'true' : 'false'}>
                <div>
                  <div style={{ padding: '0 28px 24px 53px' }}>
                    <p style={{ fontSize: 15, lineHeight: 1.95, color: '#4A413A' }}>{item.body}</p>
                    {item.source && (
                      <p style={{ marginTop: 10, fontSize: 12, color: '#8A7F76' }}>
                        根拠：{item.source}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
