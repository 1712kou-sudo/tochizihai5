/**
 * 3大指標カード ＆ 「時間の買い戻し単価」バナー コンポーネント
 * 
 * - 家族の介護時間（時間／週）
 * - 自己負担額（円／月）
 * - サービス充足率（%）
 * - 時間の買い戻し単価（円／時間）
 * 
 * useCountUp による滑らかなカウントアップ／カウントダウンと、
 * 介護を「コスト」と呼ばない温かい心理的配慮のある文言で構成します。
 */

'use client';

import React from 'react';
import { TimelineMetrics } from '@/types';
import { useCountUp } from '@/hooks/useCountUp';
import { Clock, PiggyBank, CheckCircle2, TrendingDown, AlertTriangle, Sparkles } from 'lucide-react';

interface MetricsCardsProps {
  metrics: TimelineMetrics;
  initialFamilyHours: number;
  isApplied: boolean;
}

export const MetricsCards: React.FC<MetricsCardsProps> = ({
  metrics,
  initialFamilyHours,
  isApplied,
}) => {
  // アニメーション表示用カウントアップ数値
  const displayFamilyHours = useCountUp(metrics.familyHoursPerWeek, 350, 1);
  const displaySelfPay = useCountUp(metrics.selfPayPerMonth, 350, 0);
  const displayCoverage = useCountUp(metrics.coverageRate, 350, 0);
  const displayUnitPrice = useCountUp(metrics.repurchaseUnitPrice, 350, 0);
  const displaySavedHours = useCountUp(metrics.savedHoursPerMonth, 350, 1);

  // 削減された家族時間（週換算）
  const savedWeeklyHours = Math.max(0, initialFamilyHours - metrics.familyHoursPerWeek);

  return (
    <div className="space-y-4">
      {/* 3大指標カードグリッド */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 指標1: 家族の介護時間 */}
        <div className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-rose-800">
              <div className="p-2 rounded-xl bg-rose-100/80">
                <Clock className="w-5 h-5 text-rose-700" />
              </div>
              <span className="text-xs font-bold tracking-wide">あなたが支える介護時間</span>
            </div>
            {isApplied && savedWeeklyHours > 0 && (
              <span className="flex items-center space-x-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full animate-bounce">
                <TrendingDown className="w-3.5 h-3.5" />
                <span>週 {savedWeeklyHours.toFixed(1)}h 軽減</span>
              </span>
            )}
          </div>

          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-4xl font-extrabold tracking-tight text-slate-900">
              {displayFamilyHours}
            </span>
            <span className="text-sm font-semibold text-slate-500">時間／週</span>
          </div>

          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            1週間のうち <span className="font-semibold text-slate-800">{displayFamilyHours} 時間</span>
            を、家族が自力で抱えている状態です。
          </p>

          <div
            className={`absolute bottom-0 left-0 right-0 h-1.5 ${
              isApplied ? 'bg-emerald-500' : 'bg-rose-500'
            } transition-colors duration-350`}
          />
        </div>

        {/* 指標2: 自己負担額 */}
        <div className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-amber-800">
              <div className="p-2 rounded-xl bg-amber-100/80">
                <PiggyBank className="w-5 h-5 text-amber-700" />
              </div>
              <span className="text-xs font-bold tracking-wide">月額 自己負担額</span>
            </div>
            <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              保険1割＋自費実費
            </span>
          </div>

          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-4xl font-extrabold tracking-tight text-slate-900">
              {displaySelfPay.toLocaleString()}
            </span>
            <span className="text-sm font-semibold text-slate-500">円／月</span>
          </div>

          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            介護保険給付と保険外（自費・シルバー・互助）の合計自己負担目安です。
          </p>

          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-amber-500" />
        </div>

        {/* 指標3: サービス充足率 */}
        <div className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-teal-800">
              <div className="p-2 rounded-xl bg-teal-100/80">
                <CheckCircle2 className="w-5 h-5 text-teal-700" />
              </div>
              <span className="text-xs font-bold tracking-wide">サービス充足率</span>
            </div>
            <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
              支援体制
            </span>
          </div>

          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-4xl font-extrabold tracking-tight text-teal-900">
              {displayCoverage}
            </span>
            <span className="text-sm font-semibold text-teal-700">%</span>
          </div>

          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            発生している介護ニーズのうち、外部サービスでカバーできている割合です。
          </p>

          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-teal-500" />
        </div>
      </div>

      {/* 「時間の買い戻し単価」ハイライトバナー（デモの最重要訴求点） */}
      {isApplied && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 text-white shadow-lg border border-teal-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center space-x-3 text-center sm:text-left">
            <div className="p-2.5 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-400/30 shrink-0">
              <Sparkles className="w-6 h-6 animate-spin" style={{ animationDuration: '8s' }} />
            </div>
            <div>
              <div className="text-xs text-teal-300 font-semibold tracking-wide">
                💡 「時間の買い戻し」計算結果
              </div>
              <div className="text-sm text-slate-200 mt-0.5">
                月 <span className="font-bold text-white text-base">{displaySelfPay.toLocaleString()} 円</span> の投資で、
                月に <span className="font-bold text-emerald-300 text-base">{displaySavedHours} 時間</span> の自由な時間を取り戻せます。
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md px-5 py-2.5 rounded-xl border border-white/20 text-center shrink-0">
            <div className="text-[11px] text-teal-200 font-medium">時間の買い戻し単価</div>
            <div className="text-2xl font-extrabold text-teal-300 tracking-tight">
              約 {displayUnitPrice.toLocaleString()}{' '}
              <span className="text-xs font-normal text-slate-300">円／時間</span>
            </div>
          </div>
        </div>
      )}

      {/* 支給限度基準額超過の注意表示 */}
      {metrics.isLimitExceeded && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start space-x-3 text-amber-900 text-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">介護保険の支給限度額を超過しています</span>
            <p className="mt-0.5 text-amber-800">
              上限を超えた単位数分は10割（全額自己負担）として試算に反映しています。ケアマネジャーと相談の上、優先度の高いサービスへ絞り込むか自費サービスの活用をご検討ください。
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
