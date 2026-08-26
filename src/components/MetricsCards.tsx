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
        className="rounded-[28px] border-2 border-[#2D231E] bg-white px-5 py-7 sm:px-8 sm:py-9"
      >
        <div className="mb-5 inline-flex min-h-11 items-center rounded-full border-2 border-[#2D231E] bg-[#FDE8DC] px-4 text-sm font-bold text-[#9D3D12]">
          あなたのケア時間の見通し
        </div>
        {metrics.familyHoursPerWeek > 0 ? (
          <p className="text-xl font-bold leading-relaxed text-[#2D231E] text-balance sm:text-2xl">
            1週間のうち{' '}
            <strong className="metric-num mx-1 align-baseline text-5xl font-extrabold text-[#ED6A2C] sm:text-6xl">
              {displayFamilyHours}
            </strong>
            <span className="font-extrabold text-[#2D231E]">時間</span>
            を、家族が支えています。
          </p>
        ) : (
          <p className="text-xl font-bold leading-relaxed text-[#2D231E] text-balance sm:text-2xl">
            登録した困りごとは、すべてサービスにまかせられる計算です。
          </p>
        )}

        {savedWeeklyHours > 0 ? (
          <div className="mt-6 rounded-[20px] border-2 border-[#2D231E] bg-[#FFF7F2] p-5">
            <p className="text-base font-medium leading-relaxed text-[#5E514A] text-balance sm:text-lg">
            月{' '}
            <strong className="text-2xl font-extrabold text-[#B94716] tabular-nums sm:text-3xl">
              {displaySelfPay.toLocaleString()}
            </strong>{' '}
            <span className="font-bold text-[#B94716]">円</span>
            で、週{' '}
            <strong className="text-2xl font-extrabold text-[#B94716] tabular-nums sm:text-3xl">
              {displaySaved}
            </strong>{' '}
            <span className="font-bold text-[#B94716]">時間分</span>
            をサービスにまかせられます。
            </p>
          </div>
        ) : (
          <p className="mt-6 rounded-[20px] border-2 border-[#2D231E] bg-[#FFF7F2] p-5 text-base leading-relaxed text-[#5E514A]">
            いまの条件では、まかせられるサービスが見つかっていません。予算を上げるか、条件を見直してみてください。
          </p>
        )}

        <p className="mt-5 border-t-2 border-[#FDE8DC] pt-4 text-sm leading-relaxed text-[#756A64] tabular-nums">
          困りごと {metrics.neededSlotCount} 件のうち {metrics.coveredSlotCount} 件をサービスがカバー
          {remainingSlots > 0 && <>（残り {remainingSlots} 件は家族が担当）</>}
          ・介護保険1割負担＋自費の合計目安
        </p>
      </section>

      {/* 支給限度基準額超過の注意表示 */}
      {metrics.isLimitExceeded && (
        <div className="flex items-start gap-3 rounded-[20px] border-2 border-[#B94716] bg-[#FDE8DC] p-4 text-sm text-[#2D231E] sm:p-5">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#B94716]" />
          <div>
            <span className="font-bold">介護保険の支給限度額を超えています</span>
            <p className="mt-1 leading-relaxed text-[#5E514A]">
              上限を超えた分は全額自己負担（10割）として試算しています。ケアマネジャーと相談のうえ、優先度の高いサービスに絞るか、保険外サービスへの置き換えをご検討ください。
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
