/**
 * ケアタイムライン メインページ（App Router）
 * 
 * 介護の「見えない時間」可視化 × 保険外サービス横断検索
 * 
 * - 5ステップ入力フォーム / デモ用ワンクリックサンプル
 * - 5分間ピッチストーリーツアーバー（審査員向け）
 * - 28スロット週次タイムライン（0.35秒トランジション ＆ ドラッグ＆ドロップ対応）
 * - 「サービスを当てはめる」Before/After 切り替え
 * - リアルタイム予算スライダー（貪欲法最適化）
 * - 3大指標 ＆ 時間の買い戻し単価の同時カウントアップ
 * - スロット詳細モーダル（出典・原文抜粋・差し替え・担当者メモ）
 * - 自治体ダッシュボード (to G) ＆ AI収集管理コンソール
 * - A4 1枚 PDF印刷ビュー
 */

'use client';

import React, { useState, useMemo } from 'react';
import {
  CARE_LEVEL_LIMITS,
  DEMO_SAMPLE_INPUT,
} from '@/constants/careConstants';
import { ALL_SERVICES } from '@/data/servicesSeed';
import { ActiveTab, Header } from '@/components/Header';
import { DemoStep, DemoStoryBar } from '@/components/DemoStoryBar';
import { InputWizard } from '@/components/InputWizard';
import { MetricsCards } from '@/components/MetricsCards';
import { TimelineGrid } from '@/components/TimelineGrid';
import { SlotDetailModal } from '@/components/SlotDetailModal';
import { RestrictionGuide } from '@/components/RestrictionGuide';
import { ShareModal } from '@/components/ShareModal';
import { PrintView } from '@/components/PrintView';
import { GovDashboard } from '@/components/GovDashboard';
import { AdminPipeline } from '@/components/AdminPipeline';
import {
  Service,
  TimelineSlot,
  UserInputData,
} from '@/types';
import {
  generateInitialTimeline,
  optimizeTimeline,
  calculateMetrics,
} from '@/utils/timelineEngine';
import {
  Sparkles,
  Sliders,
  Share2,
  Printer,
  Edit3,
  HelpCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function HomePage() {
  // ナビゲーションタブ
  const [activeTab, setActiveTab] = useState<ActiveTab>('timeline');

  // デモツアーバーの開閉と現在のステップ
  const [isTourOpen, setIsTourOpen] = useState<boolean>(true);
  const [currentTourStepIndex, setCurrentTourStepIndex] = useState<number>(0);

  // 入力フォームデータ（初期値はデモサンプル）
  const [userInput, setUserInput] = useState<UserInputData>(DEMO_SAMPLE_INPUT);
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);

  // タイムライン状態
  const [isApplied, setIsApplied] = useState<boolean>(false);
  const [monthlyBudget, setMonthlyBudget] = useState<number>(userInput.monthlyBudget);
  const [activeSlot, setActiveSlot] = useState<TimelineSlot | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);

  // 初期スロット（Before状態）
  const initialSlots = useMemo(() => {
    return generateInitialTimeline(userInput);
  }, [userInput]);

  // 最適化スロット（After状態）
  const optimizedResult = useMemo(() => {
    return optimizeTimeline(
      initialSlots,
      userInput.careLevel,
      userInput.householdType,
      monthlyBudget,
      ALL_SERVICES
    );
  }, [initialSlots, userInput.careLevel, userInput.householdType, monthlyBudget]);

  // 現在表示されているスロット
  const [currentSlots, setCurrentSlots] = useState<TimelineSlot[]>(initialSlots);

  // 指標
  const currentMetrics = useMemo(() => {
    return calculateMetrics(initialSlots, currentSlots, userInput.careLevel);
  }, [initialSlots, currentSlots, userInput.careLevel]);

  // 初期家族時間
  const initialFamilyHours = useMemo(() => {
    return initialSlots.reduce((sum, s) => sum + (s.needsTagId ? s.effectiveHours : 0), 0);
  }, [initialSlots]);

  // Before / After の切り替え
  const handleToggleApply = () => {
    if (!isApplied) {
      setCurrentSlots(optimizedResult.optimizedSlots);
      setIsApplied(true);
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#0d9488', '#10b981', '#f59e0b'],
        });
      } catch (e) {
        // fallback
      }
    } else {
      setCurrentSlots(initialSlots);
      setIsApplied(false);
    }
  };

  // 予算スライダー変更（即時再計算）
  const handleBudgetChange = (newBudget: number) => {
    setMonthlyBudget(newBudget);
    if (isApplied) {
      const res = optimizeTimeline(
        initialSlots,
        userInput.careLevel,
        userInput.householdType,
        newBudget,
        ALL_SERVICES
      );
      setCurrentSlots(res.optimizedSlots);
    }
  };

  // デモツアーステップの選択
  const handleSelectTourStep = (step: DemoStep) => {
    const stepIdx = step.id - 1;
    setCurrentTourStepIndex(stepIdx);
    setActiveTab(step.tab);

    if (step.tab === 'timeline') {
      setIsApplied(step.isApplied);
      setMonthlyBudget(step.budget);

      if (step.isApplied) {
        const res = optimizeTimeline(
          initialSlots,
          userInput.careLevel,
          userInput.householdType,
          step.budget,
          ALL_SERVICES
        );
        setCurrentSlots(res.optimizedSlots);
      } else {
        setCurrentSlots(initialSlots);
      }
    }
  };

  // スロットの手動サービス変更
  const handleSelectServiceForSlot = (service: Service | null) => {
    if (!activeSlot) return;

    setCurrentSlots((prev) =>
      prev.map((s) => {
        if (s.id === activeSlot.id) {
          if (!service) {
            return {
              ...s,
              assignedService: undefined,
              state: 'family',
              cost: 0,
            };
          } else {
            return {
              ...s,
              assignedService: service,
              state: service.scheme === 'insurance' ? 'insurance' : 'paid',
              cost: service.price * 4.33,
            };
          }
        }
        return s;
      })
    );

    setActiveSlot(null);
  };

  // 担当者メモの更新（ブラウザ内保持）
  const handleUpdatePerson = (personName: string) => {
    if (!activeSlot) return;

    setCurrentSlots((prev) =>
      prev.map((s) => (s.id === activeSlot.id ? { ...s, assignedPerson: personName } : s))
    );

    setActiveSlot((prev) => (prev ? { ...prev, assignedPerson: personName } : null));
  };

  // デモ用サンプルの読み込み
  const handleLoadDemo = () => {
    setUserInput(DEMO_SAMPLE_INPUT);
    setMonthlyBudget(DEMO_SAMPLE_INPUT.monthlyBudget);
    setIsWizardOpen(false);
    setActiveTab('timeline');
    setIsApplied(false);
    setCurrentSlots(generateInitialTimeline(DEMO_SAMPLE_INPUT));
  };

  // ウィザード完了時
  const handleWizardSubmit = (newData: UserInputData) => {
    setUserInput(newData);
    setMonthlyBudget(newData.monthlyBudget);
    setIsWizardOpen(false);
    setIsApplied(false);
    setCurrentSlots(generateInitialTimeline(newData));
  };

  // 印刷ダイアログの起動
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-teal-500 selection:text-white">
      {/* グローバルヘッダー */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onLoadDemo={handleLoadDemo}
        onReset={() => setIsWizardOpen(true)}
        isTourOpen={isTourOpen}
        onToggleTour={() => setIsTourOpen(!isTourOpen)}
      />

      {/* 印刷専用レイアウト（Ctrl+P時のみレンダリング） */}
      <PrintView
        slots={currentSlots}
        metrics={currentMetrics}
        careLevel={userInput.careLevel}
        householdType={userInput.householdType}
      />

      {/* メインコンテンツ */}
      <main className="flex-1 pb-16 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
          {/* 5分ピッチ デモストーリーバー（審査員向け） */}
          {isTourOpen && (
            <DemoStoryBar
              currentStepIndex={currentTourStepIndex}
              onSelectStep={handleSelectTourStep}
              onClose={() => setIsTourOpen(false)}
            />
          )}

          {/* タブ1: タイムライン画面 */}
          {activeTab === 'timeline' && (
            <div className="space-y-6">
              {/* ウィザード（開いている場合） */}
              {isWizardOpen ? (
                <InputWizard
                  initialData={userInput}
                  onSubmit={handleWizardSubmit}
                  onLoadDemo={handleLoadDemo}
                />
              ) : (
                <>
                  {/* タイムライン画面上部コントロールバー */}
                  <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    {/* 対象者ステータス */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold px-3 py-1 bg-slate-900 text-white rounded-full">
                        {CARE_LEVEL_LIMITS[userInput.careLevel].name}
                      </span>
                      <span className="text-xs font-medium px-3 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                        {userInput.householdType === 'living_together' && '同居家族あり'}
                        {userInput.householdType === 'single' && '独居'}
                        {userInput.householdType === 'elderly_only' && '高齢者のみ世帯'}
                        {userInput.householdType === 'long_distance' && '遠距離介護'}
                      </span>
                      <span className="text-xs text-slate-500">
                        困りごと: <strong>{userInput.selectedNeeds.length} 項目</strong>
                      </span>
                      <button
                        onClick={() => setIsWizardOpen(true)}
                        className="inline-flex items-center space-x-1 text-xs text-teal-700 hover:text-teal-900 font-semibold underline ml-2"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>条件を変更する</span>
                      </button>
                    </div>

                    {/* アクションボタン群 */}
                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                      {/* ★ デモの核：「サービスを当てはめる」ボタン */}
                      <button
                        type="button"
                        onClick={handleToggleApply}
                        className={`flex-1 md:flex-none flex items-center justify-center space-x-2 px-6 py-3 rounded-2xl font-black text-sm shadow-lg transition-all active:scale-95 ${
                          isApplied
                            ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30'
                            : 'bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 hover:from-teal-700 hover:to-emerald-700 text-white shadow-teal-600/30 ring-2 ring-teal-400/50 animate-pulse'
                        }`}
                      >
                        <Sparkles className="w-4 h-4 fill-white" />
                        <span>{isApplied ? '家族担当（元の赤）に戻す' : 'サービスを当てはめる'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsShareModalOpen(true)}
                        className="flex items-center space-x-1.5 px-3.5 py-3 rounded-2xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all shadow-xs"
                      >
                        <Share2 className="w-4 h-4 text-slate-500" />
                        <span>共有リンク</span>
                      </button>

                      <button
                        type="button"
                        onClick={handlePrint}
                        className="flex items-center space-x-1.5 px-3.5 py-3 rounded-2xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all shadow-xs"
                      >
                        <Printer className="w-4 h-4 text-slate-500" />
                        <span>A4で印刷</span>
                      </button>
                    </div>
                  </div>

                  {/* 3大指標カード ＆ 買い戻し単価バナー */}
                  <MetricsCards
                    metrics={currentMetrics}
                    initialFamilyHours={initialFamilyHours}
                    isApplied={isApplied}
                  />

                  {/* リアルタイム予算スライダー（サービス適用時のみ表示） */}
                  {isApplied && (
                    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 rounded-3xl shadow-md border border-slate-700/80 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center space-x-2">
                          <Sliders className="w-5 h-5 text-teal-400" />
                          <div>
                            <span className="font-bold text-sm text-white">月額予算スライダー</span>
                            <span className="text-xs text-slate-400 ml-2">
                              スライダーを動かすと最も効率的に負担が減る組み合わせを瞬時に再計算します
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-slate-400">現在の上限設定:</span>{' '}
                          <span className="font-mono font-extrabold text-xl text-teal-300">
                            ¥{monthlyBudget.toLocaleString()}
                          </span>
                          <span className="text-xs text-slate-400"> /月</span>
                        </div>
                      </div>

                      <input
                        type="range"
                        min="0"
                        max="100000"
                        step="2000"
                        value={monthlyBudget}
                        onChange={(e) => handleBudgetChange(Number(e.target.value))}
                        className="w-full h-2.5 bg-slate-700 rounded-lg cursor-pointer accent-teal-400"
                      />

                      <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                        <span>0円（完全無料・互助のみ）</span>
                        <span>¥15,000</span>
                        <span>¥30,000</span>
                        <span>¥50,000</span>
                        <span>¥100,000</span>
                      </div>
                    </div>
                  )}

                  {/* 28スロット週次ケアタイムライン */}
                  <TimelineGrid
                    slots={currentSlots}
                    isApplied={isApplied}
                    onSlotClick={(slot) => setActiveSlot(slot)}
                    onAssignPerson={handleUpdatePerson}
                  />

                  {/* 境界説明ガイド */}
                  <RestrictionGuide
                    selectedNeedIds={userInput.selectedNeeds}
                    householdType={userInput.householdType}
                    careLevel={userInput.careLevel}
                  />
                </>
              )}
            </div>
          )}

          {/* タブ2: 自治体ダッシュボード */}
          {activeTab === 'gov' && <GovDashboard />}

          {/* タブ3: AI収集＆承認管理 */}
          {activeTab === 'admin' && <AdminPipeline />}
        </div>
      </main>

      {/* スロット候補差し替えモーダル */}
      <SlotDetailModal
        slot={activeSlot}
        careLevel={userInput.careLevel}
        householdType={userInput.householdType}
        onClose={() => setActiveSlot(null)}
        onSelectService={handleSelectServiceForSlot}
        onUpdatePerson={handleUpdatePerson}
      />

      {/* 共有モーダル */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />

      {/* 免責事項・フッター（全画面共通） */}
      <footer className="bg-white border-t border-slate-200 py-6 px-4 text-center text-xs text-slate-500 space-y-2 no-print">
        <div className="max-w-4xl mx-auto flex items-center justify-center space-x-2 text-slate-600 font-semibold">
          <HelpCircle className="w-4 h-4 text-teal-600" />
          <span>免責事項 ＆ 掲載基準について</span>
        </div>
        <p className="max-w-3xl mx-auto leading-relaxed text-slate-400 text-[11px]">
          本システムで試算される金額・介護保険給付・サービス利用可否は目安であり、個別の所得状況や身体状況により異なります。
          実際のケアプラン作成や利用にあたっては、必ず担当ケアマネジャー、地域包括支援センター、または各提供事業者にご相談ください。
          掲載されているサービス情報は、広告費や掲載料による順位優遇を行わない公平な基準でAI構造化および人手承認を行っています。
        </p>
        <div className="pt-2 text-[10px] text-slate-400">
          © 2026 ケアタイムライン（Care Timeline） - 介護の「見えない時間」可視化 × 保険外サービス横断検索
        </div>
      </footer>
    </div>
  );
}
