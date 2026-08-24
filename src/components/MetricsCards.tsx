/**
 * 結論サマリー
 *
 * 指標を同格のカード3枚に分解するのをやめ、ユーザーが知りたい1つの答え
 * ——「自分の負担は何時間で、いくら払えば何時間軽くなるのか」——を
 * ひとつの文章として最上部に示す。数字は文の中で強調する。
 */

'use client';

import React from 'react';
import { TimelineMetrics } from '@/types';
import { useCountUp } from '@/hooks/useCountUp';
import { AlertTriangle } from 'lucide-react';

interface MetricsCardsProps {
  metrics: TimelineMetrics;
  initialFamilyHours: number;
}

export const MetricsCards: React.FC<MetricsCardsProps> = ({ metrics, initialFamilyHours }) => {
  const displayFamilyHours = useCountUp(metrics.familyHoursPerWeek, 350, 1);
  const displaySelfPay = useCountUp(metrics.selfPayPerMonth, 350, 0);

  // サービスに任せられた分だけ減った家族時間（週換算）
  const savedWeeklyHours = Math.max(0, initialFamilyHours - metrics.familyHoursPerWeek);
  const displaySaved = useCountUp(savedWeeklyHours, 350, 1);
  const remainingSlots = Math.max(0, metrics.neededSlotCount - metrics.coveredSlotCount);

  return (
    <div className="space-y-4">
      {/* 結論文 */}
      <section
        aria-label="計算結果の要約"
        className="glass rounded-2xl border border-stone-200 px-6 sm:px-8 py-7"
      >
        {metrics.familyHoursPerWeek > 0 ? (
          <p className="text-xl sm:text-2xl leading-relaxed text-stone-700 font-medium text-balance">
            1週間のうち{' '}
            <strong className="metric-num text-4xl sm:text-5xl font-bold text-stone-900 align-baseline mx-0.5">
              {displayFamilyHours}
            </strong>
            <span className="text-stone-900 font-bold">時間</span>
            を、家族が支えています。
          </p>
        ) : (
          <p className="text-xl sm:text-2xl leading-relaxed text-stone-700 font-medium text-balance">
            登録した困りごとは、すべてサービスにまかせられる計算です。
          </p>
        )}

        {savedWeeklyHours > 0 ? (
          <p className="mt-3 text-base sm:text-lg leading-relaxed text-stone-600 text-balance">
            月{' '}
            <strong className="text-2xl font-bold text-orange-700 tabular-nums">
              {displaySelfPay.toLocaleString()}
            </strong>{' '}
            <span className="font-semibold text-orange-700">円</span>
            で、週{' '}
            <strong className="text-2xl font-bold text-emerald-700 tabular-nums">
              {displaySaved}
            </strong>{' '}
            <span className="font-semibold text-emerald-700">時間分</span>
            をサービスにまかせられます。
          </p>
        ) : (
          <p className="mt-3 text-base leading-relaxed text-stone-500">
            いまの条件では、まかせられるサービスが見つかっていません。予算を上げるか、条件を見直してみてください。
          </p>
        )}

        <p className="mt-4 pt-4 border-t border-stone-100 text-[13px] text-stone-500 tabular-nums">
          困りごと {metrics.neededSlotCount} 件のうち {metrics.coveredSlotCount} 件をサービスがカバー
          {remainingSlots > 0 && <>（残り {remainingSlots} 件は家族が担当）</>}
          ・介護保険1割負担＋自費の合計目安
        </p>
      </section>

      {/* 支給限度基準額超過の注意表示 */}
      {metrics.isLimitExceeded && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-amber-900 text-[13px]">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">介護保険の支給限度額を超えています</span>
            <p className="mt-0.5 text-amber-800 leading-relaxed">
              上限を超えた分は全額自己負担（10割）として試算しています。ケアマネジャーと相談のうえ、優先度の高いサービスに絞るか、保険外サービスへの置き換えをご検討ください。
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
