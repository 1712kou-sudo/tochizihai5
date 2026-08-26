/**
 * 結果画面のヘッダーとサマリー
 *
 * 「月N円で、週N時間を頼めます。」という結論を最初に出し、
 * その下に残る家族の負担と、予算スライダーを置く。
 */

'use client';

import React from 'react';
import { TimelineMetrics } from '@/types';
import { useCountUp } from '@/hooks/useCountUp';

const INK = '#2D231E';
const PRIMARY = '#C4511A';
const SUB = '#6E625B';

interface ResultHeaderProps {
  conditionLine: string;
  metrics: TimelineMetrics;
  initialFamilyHours: number;
  monthlyBudget: number;
  recommendedBudget: number;
  onBudgetChange: (v: number) => void;
  onResetBudget: () => void;
}

export const ResultHeader: React.FC<ResultHeaderProps> = ({
  conditionLine,
  metrics,
  initialFamilyHours,
  monthlyBudget,
  recommendedBudget,
  onBudgetChange,
  onResetBudget,
}) => {
  const savedHours = Math.max(0, initialFamilyHours - metrics.familyHoursPerWeek);
  const displayTotal = useCountUp(metrics.selfPayPerMonth, 350, 0);
  const displaySaved = useCountUp(savedHours, 350, 1);

  const big: React.CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontSize: 'clamp(40px,5.2vw,72px)',
    fontWeight: 900,
    color: PRIMARY,
    fontVariantNumeric: 'tabular-nums',
    margin: '0 6px',
  };

  // おすすめ額との差。動かしたときだけ出す
  const delta = monthlyBudget - recommendedBudget;

  return (
    <>
      <section>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#B04512' }}>{conditionLine}</p>
        <h1
          style={{
            marginTop: 16,
            fontSize: 'clamp(26px,2.8vw,34px)',
            fontWeight: 700,
            lineHeight: 1.65,
            letterSpacing: '-0.02em',
            maxWidth: '34ch',
            color: INK,
          }}
        >
          {/* 「月◯円で、」「週◯時間を頼めます。」を塊で折り返す */}
          <span style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
            月<span style={big}>{displayTotal.toLocaleString()}</span>円で、
          </span>
          <span style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
            週<span style={big}>{displaySaved.toFixed(1)}</span>時間を頼めます。
          </span>
        </h1>
        <p style={{ marginTop: 18, fontSize: 17, lineHeight: 1.9, color: SUB, maxWidth: '46ch' }}>
          残る家族の負担は週 {metrics.familyHoursPerWeek.toFixed(1)} 時間。28枠のうち{' '}
          {metrics.coveredSlotCount} 枠をサービスが担います。
        </p>
      </section>

      {/* 月に出せる金額 */}
      <section style={{ border: `2px solid ${INK}`, borderRadius: 16, background: '#fff', padding: '22px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <label htmlFor="result-budget" style={{ fontSize: 15, fontWeight: 700, color: INK }}>
            月に出せる金額
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {delta !== 0 && (
              <span
                style={{
                  padding: '5px 12px', borderRadius: 999, background: '#FDE8DC',
                  color: '#8A3D07', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                }}
              >
                おすすめより {delta > 0 ? '+' : '−'}
                {Math.abs(delta).toLocaleString()} 円
              </span>
            )}
            <button
              type="button"
              onClick={onResetBudget}
              style={{ minHeight: 40, fontSize: 13, fontWeight: 700, color: SUB, textDecoration: 'underline', textUnderlineOffset: 4 }}
            >
              おすすめに戻す
            </button>
            <span
              className="font-display"
              style={{ fontSize: 28, fontWeight: 900, color: PRIMARY, fontVariantNumeric: 'tabular-nums' }}
            >
              ¥{monthlyBudget.toLocaleString()}
            </span>
          </div>
        </div>
        <div style={{ marginTop: 4 }}>
          <input
            id="result-budget"
            type="range"
            min="0"
            max="200000"
            step="5000"
            value={monthlyBudget}
            onChange={(e) => onBudgetChange(Number(e.target.value))}
            style={{ '--range-progress': `${(monthlyBudget / 200000) * 100}%`, width: '100%', height: 24, cursor: 'pointer' } as React.CSSProperties}
          />
        </div>
      </section>
    </>
  );
};
