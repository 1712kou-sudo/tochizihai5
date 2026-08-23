/**
 * 審査員向け5分デモ・ストーリーガイドバー コンポーネント
 * 
 * ハッカソン審査員やプレゼンターが、仕様書のデモ台本（5分ピッチ）に沿って
 * ワンクリックで主要な状態遷移・アニメーション・各画面をスムーズに体験できるインタラクティブガイドです。
 */

'use client';

import React, { useState } from 'react';
import { ActiveTab } from './Header';
import {
  Play,
  RotateCcw,
  Sparkles,
  DollarSign,
  BarChart3,
  Database,
  CheckCircle2,
  ChevronRight,
  Info,
} from 'lucide-react';

export interface DemoStep {
  id: number;
  timeRange: string;
  title: string;
  keyMessage: string;
  actionText: string;
  tab: ActiveTab;
  isApplied: boolean;
  budget: number;
}

export const DEMO_STORY_STEPS: DemoStep[] = [
  {
    id: 1,
    timeRange: '0:00 - 0:30',
    title: '① 見えない時間の可視化',
    keyMessage: '「これは実在の家族の1週間です」。誰がいつ何をしているか、家族が抱えている週42時間が赤く浮き彫りに。',
    actionText: '赤いタイムラインを表示',
    tab: 'timeline',
    isApplied: false,
    budget: 25000,
  },
  {
    id: 2,
    timeRange: '0:30 - 1:00',
    title: '② 時間を買い戻す',
    keyMessage: '「月2.5万円で、週23時間が戻りました。1時間あたり約570円です」。ボタン一つで色と数字が連動。',
    actionText: 'サービスを当てはめる',
    tab: 'timeline',
    isApplied: true,
    budget: 25000,
  },
  {
    id: 3,
    timeRange: '1:00 - 1:30',
    title: '③ 予算0円でも減らせる',
    keyMessage: '「0円でもここまで減らせます。知られていないだけで、地域には使える無償・互助サービスがあります」。',
    actionText: '予算を0円にする',
    tab: 'timeline',
    isApplied: true,
    budget: 0,
  },
  {
    id: 4,
    timeRange: '1:30 - 3:00',
    title: '④ AI収集と信頼性',
    keyMessage: '「公表システムと自治体PDFからAIが自動収集。誤情報を防ぐため、人手が承認したもののみ公開」。',
    actionText: 'AI収集・承認コンソールへ',
    tab: 'admin',
    isApplied: true,
    budget: 25000,
  },
  {
    id: 5,
    timeRange: '3:00 - 5:00',
    title: '⑤ 自治体の空白ヒートマップ',
    keyMessage: '「平日夕方に需要集中、対応事業者ゼロ。0件検索ログが自治体の未充足需要データになります」。',
    actionText: '自治体ダッシュボードへ',
    tab: 'gov',
    isApplied: true,
    budget: 25000,
  },
];

interface DemoStoryBarProps {
  currentStepIndex: number;
  onSelectStep: (step: DemoStep) => void;
  onClose: () => void;
}

export const DemoStoryBar: React.FC<DemoStoryBarProps> = ({
  currentStepIndex,
  onSelectStep,
  onClose,
}) => {
  const currentStep = DEMO_STORY_STEPS[currentStepIndex];

  return (
    <div className="bg-slate-900 text-white rounded-3xl p-4 sm:p-5 shadow-2xl border border-teal-500/40 space-y-3 no-print">
      {/* 上部ヘッダー */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-teal-300 tracking-wider">
              審査員・プレゼン向け 5分間ピッチストーリーツアー
            </div>
            <div className="text-[11px] text-slate-400">
              各ステップをクリックすると、デモ台本通りの画面状態・アニメーションを即座に再現できます
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800 transition-all"
        >
          ツアーを閉じる
        </button>
      </div>

      {/* ステップナビゲーションボタン群 */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
        {DEMO_STORY_STEPS.map((step, idx) => {
          const isActive = idx === currentStepIndex;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onSelectStep(step)}
              className={`text-left p-2.5 rounded-2xl border transition-all flex flex-col justify-between ${
                isActive
                  ? 'bg-teal-900/60 border-teal-400 text-white shadow-md ring-1 ring-teal-400/50'
                  : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-[10px] font-mono text-teal-400">
                  <span>{step.timeRange}</span>
                  {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />}
                </div>
                <div className="font-bold text-xs mt-0.5 text-white line-clamp-1">{step.title}</div>
              </div>
              <div className="mt-2 text-[10px] text-teal-200 font-semibold flex items-center space-x-1">
                <span>{step.actionText}</span>
                <ChevronRight className="w-3 h-3 shrink-0" />
              </div>
            </button>
          );
        })}
      </div>

      {/* 現在のステップのピッチ解説・キーメッセージ */}
      <div className="p-3 rounded-2xl bg-teal-950/70 border border-teal-500/30 flex items-start space-x-3 text-xs">
        <Info className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold text-teal-200">
            ピッチ台本・提示ポイント ({currentStep.timeRange}):
          </span>
          <p className="text-slate-200 leading-relaxed font-medium">
            {currentStep.keyMessage}
          </p>
        </div>
      </div>
    </div>
  );
};
