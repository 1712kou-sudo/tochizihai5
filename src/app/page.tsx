/**
 * けあしる メインページ（App Router）
 * 
 * 介護の「見えない時間」可視化 × 保険外サービス横断検索
 * 
 * - 5ステップ入力フォーム / 入力例のワンクリック読み込み
 * - 28スロット週次タイムライン（0.35秒トランジション）
 * - 「サービスを当てはめる」Before/After 切り替え
 * - リアルタイム予算スライダー（貪欲法最適化）
 * - 3大指標の同時カウントアップ
 * - スロット詳細モーダル（出典・原文抜粋・差し替え・担当者メモ）
 * - 自治体ダッシュボード ＆ サービス収集・承認コンソール
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
import { InputWizard } from '@/components/InputWizard';
import { MetricsCards } from '@/components/MetricsCards';
import { TimelineGrid } from '@/components/TimelineGrid';
import { SlotDetailModal } from '@/components/SlotDetailModal';
import { RestrictionGuide } from '@/components/RestrictionGuide';
import { ShareModal } from '@/components/ShareModal';
import { PrintView } from '@/components/PrintView';
import { GovDashboard } from '@/components/GovDashboard';
import { ServicePlanList } from '@/components/ServicePlanList';
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
  Sliders,
  Share2,
  Printer,
  Edit3,
  HelpCircle,
} from 'lucide-react';

/** 入力条件と予算から、サービスを当てはめ済みのタイムラインを組み立てる */
function buildOptimizedSlots(input: UserInputData, budget: number, allServices: Service[]): TimelineSlot[] {
  const base = generateInitialTimeline(input);
  return optimizeTimeline(
    base,
    input.careLevel,
    input.householdType,
    budget,
    allServices
  ).optimizedSlots;
}

export default function HomePage() {
  // ナビゲーションタブ
  const [activeTab, setActiveTab] = useState<ActiveTab>('timeline');

  // サービスマスター（承認操作で更新される共有ステート）
  const [services, setServices] = useState<Service[]>(ALL_SERVICES);

  // 入力フォームデータ（初期値はデモサンプル）
  const [userInput, setUserInput] = useState<UserInputData>(DEMO_SAMPLE_INPUT);
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);

  // タイムライン状態
  const [monthlyBudget, setMonthlyBudget] = useState<number>(userInput.monthlyBudget);
  const [activeSlot, setActiveSlot] = useState<TimelineSlot | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);

  // 初期スロット（Before状態）
  const initialSlots = useMemo(() => {
    return generateInitialTimeline(userInput);
  }, [userInput]);

  // 現在表示されているスロット（最初からサービスを当てはめた状態で始める）
  const [currentSlots, setCurrentSlots] = useState<TimelineSlot[]>(
    () => buildOptimizedSlots(DEMO_SAMPLE_INPUT, DEMO_SAMPLE_INPUT.monthlyBudget, ALL_SERVICES)
  );

  // 指標
  const currentMetrics = useMemo(() => {
    return calculateMetrics(initialSlots, currentSlots, userInput.careLevel);
  }, [initialSlots, currentSlots, userInput.careLevel]);

  // 初期家族時間
  const initialFamilyHours = useMemo(() => {
    return initialSlots.reduce((sum, s) => sum + (s.needsTagId ? s.effectiveHours : 0), 0);
  }, [initialSlots]);

  // 予算スライダー変更（即時再割り当て）
  const handleBudgetChange = (newBudget: number) => {
    setMonthlyBudget(newBudget);
    setCurrentSlots(buildOptimizedSlots(userInput, newBudget, services));
  };

  // 手動調整をやめて、最適な割り当てに戻す
  const handleResetAssignments = () => {
    setCurrentSlots(buildOptimizedSlots(userInput, monthlyBudget, services));
  };

  // サービス承認ステータスの更新（AdminPipelineから呼ばれる）
  const handleUpdateServiceStatus = (id: string, newStatus: 'approved' | 'rejected' | 'draft') => {
    setServices((prev) => {
      const updated = prev.map((s) =>
        s.id === id
          ? { ...s, status: newStatus, verifiedAt: new Date().toISOString().split('T')[0], verifiedBy: '管理者（人手確認）' }
          : s
      );
      setCurrentSlots(buildOptimizedSlots(userInput, monthlyBudget, updated));
      return updated;
    });
  };

  // 一括ステータス更新（AdminPipelineから呼ばれる）
  const handleBulkUpdateStatus = (ids: string[], newStatus: 'approved' | 'rejected' | 'draft') => {
    const idSet = new Set(ids);
    setServices((prev) => {
      const updated = prev.map((s) =>
        idSet.has(s.id)
          ? { ...s, status: newStatus, verifiedAt: new Date().toISOString().split('T')[0], verifiedBy: '管理者（人手確認）' }
          : s
      );
      setCurrentSlots(buildOptimizedSlots(userInput, monthlyBudget, updated));
      return updated;
    });
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

  // 入力例の読み込み
  const handleLoadDemo = () => {
    setUserInput(DEMO_SAMPLE_INPUT);
    setMonthlyBudget(DEMO_SAMPLE_INPUT.monthlyBudget);
    setIsWizardOpen(false);
    setActiveTab('timeline');
    setCurrentSlots(buildOptimizedSlots(DEMO_SAMPLE_INPUT, DEMO_SAMPLE_INPUT.monthlyBudget, services));
  };

  // ウィザード完了時：サービスを当てはめた状態のタイムラインへ進む
  const handleWizardSubmit = (newData: UserInputData) => {
    setUserInput(newData);
    setMonthlyBudget(newData.monthlyBudget);
    setIsWizardOpen(false);
    setCurrentSlots(buildOptimizedSlots(newData, newData.monthlyBudget, services));
  };

  // 印刷ダイアログの起動
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900 selection:bg-orange-500 selection:text-white">
      {/* グローバルヘッダー */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onReset={() => {
          setActiveTab('timeline');
          setIsWizardOpen(true);
        }}
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
                  {/* 現在の条件（予算スライダーも同じカードにまとめる） */}
                  <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                    <div className="px-4 sm:px-5 py-3 border-b border-stone-200 flex items-center justify-between gap-3">
                      <h2 className="text-sm font-bold text-stone-900">いまの条件</h2>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setIsShareModalOpen(true)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-stone-300 hover:bg-stone-50 text-stone-600 text-xs font-bold transition-colors"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">共有</span>
                        </button>
                        <button
                          type="button"
                          onClick={handlePrint}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-stone-300 hover:bg-stone-50 text-stone-600 text-xs font-bold transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">印刷</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsWizardOpen(true)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-orange-600 text-orange-700 hover:bg-orange-50 text-sm font-bold transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                          条件を変更
                        </button>
                      </div>
                    </div>

                    <div className="px-4 sm:px-5 py-4">
                      <dl className="grid grid-cols-3 gap-x-6 gap-y-3">
                        <div>
                          <dt className="text-[11px] text-stone-500 mb-0.5">要介護度</dt>
                          <dd className="text-sm font-bold text-stone-900">
                            {CARE_LEVEL_LIMITS[userInput.careLevel].name}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[11px] text-stone-500 mb-0.5">世帯状況</dt>
                          <dd className="text-sm font-bold text-stone-900">
                            {userInput.householdType === 'living_together' && '同居家族あり'}
                            {userInput.householdType === 'single' && '独居'}
                            {userInput.householdType === 'elderly_only' && '高齢者のみ世帯'}
                            {userInput.householdType === 'long_distance' && '遠距離介護'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[11px] text-stone-500 mb-0.5">困りごと</dt>
                          <dd className="text-sm font-bold text-stone-900 tabular-nums">
                            {userInput.selectedNeeds.length} 件
                          </dd>
                        </div>
                      </dl>

                      {/* 予算 */}
                      <div className="mt-4 pt-4 border-t border-stone-100">
                        <div className="flex items-baseline justify-between gap-3 mb-2">
                          <label
                            htmlFor="budget-range"
                            className="text-[11px] text-stone-500"
                          >
                            月の予算（動かすと組み合わせを作り直します）
                          </label>
                          <div className="flex items-baseline gap-3 shrink-0">
                            <span className="text-lg font-bold text-orange-700 tabular-nums">
                              ¥{monthlyBudget.toLocaleString()}
                            </span>
                            <button
                              type="button"
                              onClick={handleResetAssignments}
                              className="text-[11px] text-stone-500 hover:text-orange-700 underline"
                            >
                              おすすめに戻す
                            </button>
                          </div>
                        </div>

                        <input
                          id="budget-range"
                          type="range"
                          min="0"
                          max="200000"
                          step="5000"
                          value={monthlyBudget}
                          onChange={(e) => handleBudgetChange(Number(e.target.value))}
                          className="w-full h-2 bg-stone-200 rounded-lg cursor-pointer accent-orange-600"
                        />
                        <div className="flex justify-between text-[11px] text-stone-400 tabular-nums mt-1">
                          <span>0円</span>
                          <span>5万</span>
                          <span>10万</span>
                          <span>15万</span>
                          <span>20万</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3大指標カード */}
                  <MetricsCards
                    metrics={currentMetrics}
                    initialFamilyHours={initialFamilyHours}
                  />

                  {/* 28スロット週次ケアタイムライン */}
                  <TimelineGrid
                    slots={currentSlots}
                    onSlotClick={(slot) => setActiveSlot(slot)}
                  />

                  {/* このプランで使うサービスの一覧 */}
                  <ServicePlanList
                    slots={currentSlots}
                    onSelectSlot={(slot) => setActiveSlot(slot)}
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
          {activeTab === 'gov' && <GovDashboard services={services} />}

          {/* タブ3: AI収集＆承認管理 */}
          {activeTab === 'admin' && (
            <AdminPipeline
              services={services}
              onUpdateStatus={handleUpdateServiceStatus}
              onBulkUpdateStatus={handleBulkUpdateStatus}
            />
          )}
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
      <footer className="bg-white border-t border-stone-200 py-6 px-4 text-center text-xs text-stone-500 space-y-2 no-print">
        <div className="max-w-4xl mx-auto flex items-center justify-center space-x-2 text-stone-600 font-semibold">
          <HelpCircle className="w-4 h-4 text-orange-600" />
          <span>免責事項 ＆ 掲載基準について</span>
        </div>
        <p className="max-w-3xl mx-auto leading-relaxed text-stone-400 text-[11px]">
          本システムで試算される金額・介護保険給付・サービス利用可否は目安であり、個別の所得状況や身体状況により異なります。
          実際のケアプラン作成や利用にあたっては、必ず担当ケアマネジャー、地域包括支援センター、または各提供事業者にご相談ください。
          掲載されているサービス情報は、広告費や掲載料による順位優遇を行わない公平な基準でAI構造化および人手承認を行っています。
        </p>
        <div className="pt-2 text-[10px] text-stone-400">
          © 2026 けあしる - 介護の「見えない時間」可視化 × 保険外サービス横断検索
        </div>
      </footer>
    </div>
  );
}
