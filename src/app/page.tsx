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

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useReveal } from '@/hooks/useReveal';
import {
  CARE_LEVEL_LIMITS,
  DEMO_SAMPLE_INPUT,
} from '@/constants/careConstants';
import { ALL_SERVICES } from '@/data/servicesSeed';
import { ActiveTab, Header } from '@/components/Header';
import { InputWizard } from '@/components/InputWizard';
import { ScrollHero } from '@/components/ScrollHero';
import { LandingSections } from '@/components/LandingSections';
import { MetricsCards } from '@/components/MetricsCards';
import { TimelineGrid } from '@/components/TimelineGrid';
import { SlotDetailModal } from '@/components/SlotDetailModal';
import { RestrictionGuide } from '@/components/RestrictionGuide';
import { ShareModal } from '@/components/ShareModal';
import { PrintView } from '@/components/PrintView';
import { GovDashboard } from '@/components/GovDashboard';
import { ServicePlanList } from '@/components/ServicePlanList';
import { ResultHeader } from '@/components/ResultHeader';
import { AskSection, HandoffSection } from '@/components/ResultFooterSections';
import { HandoffView } from '@/components/HandoffView';
import { ConsultChat, ConsultItem } from '@/components/ConsultChat';
import { ConsultContext } from '@/utils/consult';
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
import { Share2, Printer, Edit3, HelpCircle, Clock3, ArrowRight } from 'lucide-react';

/** 入力条件と予算から、サービスを当てはめ済みのタイムラインを組み立てる */
function buildOptimizedSlots(input: UserInputData, budget: number, allServices: Service[] = ALL_SERVICES): TimelineSlot[] {
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
  // 初回訪問かどうか（false の間はランディングを表示する）
  const [hasStarted, setHasStarted] = useState<boolean>(false);

  // タイムライン状態
  const [monthlyBudget, setMonthlyBudget] = useState<number>(userInput.monthlyBudget);
  const [activeSlot, setActiveSlot] = useState<TimelineSlot | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  // 送る画面（ケアマネジャーがリンクを開いたときの見え方）
  const [isHandoffOpen, setIsHandoffOpen] = useState<boolean>(false);

  // 相談パネル
  const [consult, setConsult] = useState<{ open: boolean; ctx: ConsultContext | null; seed: string }>(
    { open: false, ctx: null, seed: '' }
  );
  const [consultItems, setConsultItems] = useState<ConsultItem[]>([]);
  const openConsult = (ctx: ConsultContext | null, seed = '') =>
    setConsult({ open: true, ctx, seed });

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

  // 予算スライダーを操作している最中かどうか（動きの速度を切り替えるために使う）
  const [isBudgetLive, setIsBudgetLive] = useState(false);
  const liveTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (liveTimer.current) window.clearTimeout(liveTimer.current);
  }, []);

  // 予算スライダー変更（即時再割り当て）
  const handleBudgetChange = (newBudget: number) => {
    setMonthlyBudget(newBudget);
    setCurrentSlots(buildOptimizedSlots(userInput, newBudget, services));

    setIsBudgetLive(true);
    if (liveTimer.current) window.clearTimeout(liveTimer.current);
    liveTimer.current = window.setTimeout(() => setIsBudgetLive(false), 420);
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

  // AI収集で取得した新規Draftサービスを追加（AdminPipelineから呼ばれる）
  const handleAddDraftServices = (newServices: Service[]) => {
    setServices((prev) => [...prev, ...newServices]);
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

  /**
   * この枠の予定（困りごと）を変更する。null で空き枠に戻す。
   * 予定が変わると必要時間そのものが変わるため、割り当てを計算し直す。
   * 担当者メモだけは利用者が手で書いたものなので引き継ぐ。
   */
  const handleChangeNeedForSlot = (needId: string | null) => {
    if (!activeSlot) return;

    const nextInput: UserInputData = {
      ...userInput,
      slotNeeds: { ...userInput.slotNeeds, [activeSlot.id]: needId },
      selectedNeeds:
        needId && !userInput.selectedNeeds.includes(needId)
          ? [...userInput.selectedNeeds, needId]
          : userInput.selectedNeeds,
    };

    setUserInput(nextInput);

    const rebuilt = buildOptimizedSlots(nextInput, monthlyBudget, services);
    setCurrentSlots((prev) =>
      rebuilt.map((fresh) => {
        const before = prev.find((s) => s.id === fresh.id);
        return before?.assignedPerson
          ? { ...fresh, assignedPerson: before.assignedPerson }
          : fresh;
      })
    );

    // 予定を入れた直後は、その枠の候補をそのまま見せたいので開いたままにする
    setActiveSlot(
      needId ? rebuilt.find((sl) => sl.id === activeSlot.id) ?? null : null
    );
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
    setHasStarted(true);
    setCurrentSlots(buildOptimizedSlots(DEMO_SAMPLE_INPUT, DEMO_SAMPLE_INPUT.monthlyBudget, services));
  };

  // ウィザード完了時：サービスを当てはめた状態のタイムラインへ進む
  const handleWizardSubmit = (newData: UserInputData) => {
    setUserInput(newData);
    setMonthlyBudget(newData.monthlyBudget);
    setIsWizardOpen(false);
    setHasStarted(true);
    setCurrentSlots(buildOptimizedSlots(newData, newData.monthlyBudget, services));
  };

  // ランディングの登場シーケンス（ファーストビューなので即時発火）
  const landing = useReveal<HTMLElement>({ immediate: true });

  // 印刷ダイアログの起動
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* グローバルヘッダー */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onHome={() => {
          // ロゴはランディングへ戻る入口。開いているものを全部閉じて先頭から見せる。
          setActiveTab('timeline');
          setIsWizardOpen(false);
          setIsHandoffOpen(false);
          setConsult((c) => ({ ...c, open: false }));
          setActiveSlot(null);
          setHasStarted(false);
          window.scrollTo(0, 0);
        }}
        showResultActions={activeTab === 'timeline' && hasStarted && !isWizardOpen}
        showStart={activeTab === 'timeline' && !hasStarted && !isWizardOpen && !isHandoffOpen}
        onStart={() => {
          setIsWizardOpen(true);
          window.scrollTo(0, 0);
        }}
        onEditConditions={() => setIsWizardOpen(true)}
        onHandoff={() => {
          setIsHandoffOpen(true);
          window.scrollTo(0, 0);
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
      <main className="flex-1 no-print">
        {/* 送る画面：開いている間はこれだけを見せる */}
        {isHandoffOpen && (
          <HandoffView
            userInput={userInput}
            slots={currentSlots}
            metrics={currentMetrics}
            initialFamilyHours={initialFamilyHours}
            consultItems={consultItems}
            onBack={() => setIsHandoffOpen(false)}
            onPrint={handlePrint}
          />
        )}

        {/* ランディングは全画面幅が必要なので、max-w コンテナの外に置く */}
        {!isHandoffOpen && activeTab === 'timeline' && !isWizardOpen && !hasStarted && (
          <>
            <ScrollHero
              onStart={() => setIsWizardOpen(true)}
              onLoadDemo={handleLoadDemo}
            />
            <LandingSections onStart={() => setIsWizardOpen(true)} />
          </>
        )}

        <div
          className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16 space-y-6"
          hidden={isHandoffOpen}
        >
          {/* タブ1: タイムライン画面 */}
          {activeTab === 'timeline' && (
            <div className="space-y-5">
              {isWizardOpen ? (
                <InputWizard
                  initialData={userInput}
                  onSubmit={handleWizardSubmit}
                  onLoadDemo={handleLoadDemo}
                />
              ) : !hasStarted ? null : (
                <>
                  {/* 条件 ＋ 結論 ＋ 予算 */}
                  <ResultHeader
                    conditionLine={`${CARE_LEVEL_LIMITS[userInput.careLevel].name}・${
                      userInput.householdType === 'living_together'
                        ? '同居家族あり'
                        : userInput.householdType === 'single'
                        ? '独居'
                        : userInput.householdType === 'elderly_only'
                        ? '高齢者のみ世帯'
                        : '遠距離介護'
                    }`}
                    metrics={currentMetrics}
                    initialFamilyHours={initialFamilyHours}
                    monthlyBudget={monthlyBudget}
                    recommendedBudget={userInput.monthlyBudget}
                    onBudgetChange={handleBudgetChange}
                    onResetBudget={handleResetAssignments}
                  />

                  {/* 1週間の担い手 */}
                  <TimelineGrid
                    slots={currentSlots}
                    onSlotClick={(slot) => setActiveSlot(slot)}
                    isLive={isBudgetLive}
                  />

                  {/* わからないことを聞く（サービス一覧の手前に置く） */}
                  <AskSection
                    onAsk={(q) => openConsult(null, q)}
                    items={consultItems}
                    onRemoveItem={(id) =>
                      setConsultItems((list) => list.filter((it) => it.id !== id))
                    }
                  />

                  {/* 頼むサービス */}
                  <ServicePlanList
                    slots={currentSlots}
                    onSelectSlot={(slot) => setActiveSlot(slot)}
                    onAskService={(serviceId, serviceName) =>
                      openConsult({ serviceId, label: serviceName })
                    }
                  />

                  {/* 確認すること（面談で聞くべき点） */}
                  <RestrictionGuide
                    selectedNeedIds={userInput.selectedNeeds}
                    householdType={userInput.householdType}
                    careLevel={userInput.careLevel}
                    slots={currentSlots}
                  />

                  {/* ケアマネジャーへ渡す */}
                  <HandoffSection
                    onShare={() => {
                      setIsHandoffOpen(true);
                      window.scrollTo(0, 0);
                    }}
                    onPrint={handlePrint}
                  />
                </>
              )}
            </div>
          )}

          {/* タブ2: 自治体ダッシュボード */}
          {activeTab === 'gov' && <GovDashboard />}

          {/* タブ3: AI収集＆承認管理 */}
          {activeTab === 'admin' && (
            <AdminPipeline
              services={services}
              onUpdateStatus={handleUpdateServiceStatus}
              onBulkUpdateStatus={handleBulkUpdateStatus}
              onAddDraftServices={handleAddDraftServices}
            />
          )}
        </div>
      </main>

      {/* スロット候補差し替えモーダル */}
      <SlotDetailModal
        slot={activeSlot}
        careLevel={userInput.careLevel}
        householdType={userInput.householdType}
        allServices={services}
        onClose={() => setActiveSlot(null)}
        onSelectService={handleSelectServiceForSlot}
        onUpdatePerson={handleUpdatePerson}
        onChangeNeed={handleChangeNeedForSlot}
      />

      {/* 相談パネル（自由に書いて聞く） */}
      <ConsultChat
        isOpen={consult.open}
        context={consult.ctx}
        seedQuestion={consult.seed}
        userInput={userInput}
        slots={currentSlots}
        metrics={currentMetrics}
        budget={monthlyBudget}
        onClose={() => setConsult((c) => ({ ...c, open: false }))}
        onSaveItem={(item) => setConsultItems((list) => [...list, item])}
      />

      {/* 共有モーダル */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />

      {/* 免責事項・フッター（全画面共通） */}
      <footer className="bg-stone-50 border-t-2 border-stone-900 py-8 px-4 text-center text-sm text-stone-600 space-y-3 no-print">
        <div className="max-w-4xl mx-auto flex items-center justify-center space-x-2 text-stone-600 font-semibold">
          <HelpCircle className="w-4 h-4 text-orange-600" />
          <span>免責事項 ＆ 掲載基準について</span>
        </div>
        <p className="max-w-3xl mx-auto leading-relaxed text-stone-500 text-[13px]">
          本システムで試算される金額・介護保険給付・サービス利用可否は目安であり、個別の所得状況や身体状況により異なります。
          実際のケアプラン作成や利用にあたっては、必ず担当ケアマネジャー、地域包括支援センター、または各提供事業者にご相談ください。
          掲載されているサービス情報は、広告費や掲載料による順位優遇を行わない公平な基準でAI構造化および人手承認を行っています。
        </p>
        <div className="pt-2 text-[13px] text-stone-500">
          © 2026 けあしる - 介護の「見えない時間」可視化 × 保険外サービス横断検索
        </div>
      </footer>
    </div>
  );
}
