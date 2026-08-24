/**
 * 5ステップ入力ウィザード コンポーネント
 *
 * 1. 要介護認定区分（未申請／要支援／要介護をグループ化して選択）
 * 2. 世帯状況
 * 3. 困りごと（ケアの種類ごとにグループ化したタグ選択）
 * 4. 発生する曜日・時間帯
 * 5. 月額予算
 */

'use client';

import React, { useState } from 'react';
import {
  CARE_LEVEL_LIMITS,
  DAYS_OF_WEEK,
  NEEDS_TAGS,
  TIME_PERIODS,
} from '@/constants/careConstants';
import {
  CareLevel,
  DayOfWeek,
  HouseholdType,
  NeedsCategory,
  SlotId,
  TimePeriod,
  UserInputData,
} from '@/types';
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Home,
  UserCheck,
  Users,
  MapPin,
  CalendarDays,
} from 'lucide-react';

interface InputWizardProps {
  initialData: UserInputData;
  onSubmit: (data: UserInputData) => void;
  onLoadDemo: () => void;
}

/** 認定区分を3グループに整理して表示（支給限度額などの詳細は出さない） */
const CARE_LEVEL_GROUPS: { label: string; note?: string; levels: CareLevel[] }[] = [
  { label: '認定を受けていない', levels: ['unapplied', 'unknown'] },
  { label: '要支援', note: '1〜2', levels: ['support_1', 'support_2'] },
  { label: '要介護', note: '1〜5', levels: ['care_1', 'care_2', 'care_3', 'care_4', 'care_5'] },
];

/** 認定区分ボタンに出す短いラベル */
const CARE_LEVEL_SHORT: Record<CareLevel, string> = {
  unapplied: 'まだ申請していない',
  unknown: '区分がわからない',
  support_1: '要支援1',
  support_2: '要支援2',
  care_1: '要介護1',
  care_2: '要介護2',
  care_3: '要介護3',
  care_4: '要介護4',
  care_5: '要介護5',
};

const HOUSEHOLDS: { id: HouseholdType; title: string; desc: string; icon: React.ElementType }[] = [
  {
    id: 'single',
    title: '独居（一人暮らし）',
    desc: '日中の安否確認・配食・見守りが最優先になります。',
    icon: UserCheck,
  },
  {
    id: 'elderly_only',
    title: '高齢者のみ世帯',
    desc: '重い家事や通院、夜間の見守りを外部に頼る必要があります。',
    icon: Users,
  },
  {
    id: 'living_together',
    title: '同居家族あり',
    desc: '保険の生活援助に制限があるため、保険外サービスの併用が有効です。',
    icon: Home,
  },
  {
    id: 'long_distance',
    title: '遠距離介護',
    desc: '遠隔の見守り、緊急駆けつけ、訪問代行が中心になります。',
    icon: MapPin,
  },
];

/** ケアの種類ごとのグループ見出し */
const NEEDS_CATEGORIES: { key: NeedsCategory; label: string; hint: string }[] = [
  { key: 'housework', label: '家事', hint: '調理・掃除・洗濯・買い物' },
  { key: 'physical_care', label: '身体介護', hint: '入浴・排泄・服薬・着替え' },
  { key: 'monitoring', label: '見守り・安否確認', hint: '日中の声かけ／夜間の不安' },
  { key: 'outing', label: '外出の付き添い', hint: '通院・買い物・手続き' },
  { key: 'social', label: '社会参加・つながり', hint: 'デイサービス・話し相手' },
  { key: 'housing', label: '住まい・環境', hint: '庭木・軽作業・寝具' },
  { key: 'family_rest', label: '家族の休息', hint: 'レスパイト・相談' },
];

/** タスク1件あたりの発生タイミング */
interface TaskTiming {
  days: DayOfWeek[];
  periods: TimePeriod[];
}
type TaskSchedule = Record<string, TaskTiming>;

const WEEKDAYS: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri'];
const WEEKEND: DayOfWeek[] = ['sat', 'sun'];
const ALL_DAYS: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/** 既存の slotNeeds から、タスクごとの曜日・時間帯を復元する */
function scheduleFromSlotNeeds(
  selectedNeeds: string[],
  slotNeeds: Record<string, string | null>
): TaskSchedule {
  const out: TaskSchedule = {};
  for (const needId of selectedNeeds) {
    const days = new Set<DayOfWeek>();
    const periods = new Set<TimePeriod>();
    for (const [slotId, value] of Object.entries(slotNeeds)) {
      if (value !== needId) continue;
      const [d, p] = slotId.split('-') as [DayOfWeek, TimePeriod];
      days.add(d);
      periods.add(p);
    }
    // 未設定のタスクは、タグの既定時間帯を平日に置く
    if (days.size === 0 || periods.size === 0) {
      const tag = NEEDS_TAGS.find((t) => t.id === needId);
      out[needId] = { days: [], periods: tag ? [...tag.defaultSlots] : [] };
    } else {
      out[needId] = { days: [...days], periods: [...periods] };
    }
  }
  return out;
}

/**
 * タスクごとの「曜日 × 時間帯」を28マスへ展開する。
 * selectedNeeds の順に書き込むため、同じマスが重なった場合は後のタスクが優先される。
 */
function scheduleToSlotNeeds(
  selectedNeeds: string[],
  schedule: TaskSchedule
): Record<SlotId, string | null> {
  const out = {} as Record<SlotId, string | null>;
  for (const d of DAYS_OF_WEEK) {
    for (const p of TIME_PERIODS) {
      out[`${d.key}-${p.key}`] = null;
    }
  }
  for (const needId of selectedNeeds) {
    const timing = schedule[needId];
    if (!timing) continue;
    for (const day of timing.days) {
      for (const period of timing.periods) {
        out[`${day}-${period}`] = needId;
      }
    }
  }
  return out;
}

export const InputWizard: React.FC<InputWizardProps> = ({
  initialData,
  onSubmit,
  onLoadDemo,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  // 前進か後退かで、切り替わる向きを変える
  const [direction, setDirection] = useState<'fwd' | 'back'>('fwd');
  const [formData, setFormData] = useState<UserInputData>(initialData);
  // タスクごとの発生タイミング（ステップ4の入力源）
  const [schedule, setSchedule] = useState<TaskSchedule>(() =>
    scheduleFromSlotNeeds(initialData.selectedNeeds, initialData.slotNeeds)
  );

  /** スケジュールを更新し、28マスへ展開して formData に反映する */
  const applySchedule = (next: TaskSchedule, needsOrder?: string[]) => {
    setSchedule(next);
    setFormData((prev) => {
      const order = needsOrder ?? prev.selectedNeeds;
      return { ...prev, slotNeeds: scheduleToSlotNeeds(order, next) };
    });
  };

  const toggleTaskDay = (needId: string, day: DayOfWeek) => {
    const cur = schedule[needId] ?? { days: [], periods: [] };
    const days = cur.days.includes(day)
      ? cur.days.filter((d) => d !== day)
      : [...cur.days, day];
    applySchedule({ ...schedule, [needId]: { ...cur, days } });
  };

  const setTaskDays = (needId: string, days: DayOfWeek[]) => {
    const cur = schedule[needId] ?? { days: [], periods: [] };
    const same =
      cur.days.length === days.length && days.every((d) => cur.days.includes(d));
    applySchedule({ ...schedule, [needId]: { ...cur, days: same ? [] : days } });
  };

  const toggleTaskPeriod = (needId: string, period: TimePeriod) => {
    const cur = schedule[needId] ?? { days: [], periods: [] };
    const periods = cur.periods.includes(period)
      ? cur.periods.filter((p) => p !== period)
      : [...cur.periods, period];
    applySchedule({ ...schedule, [needId]: { ...cur, periods } });
  };

  const handleCareLevelChange = (level: CareLevel) => {
    setFormData((prev) => ({ ...prev, careLevel: level }));
  };

  const handleHouseholdChange = (type: HouseholdType) => {
    setFormData((prev) => ({ ...prev, householdType: type }));
  };

  /** ニーズのトグル。追加時は既定の時間帯を平日に置き、外したら予定も消す */
  const toggleNeed = (needId: string) => {
    const exists = formData.selectedNeeds.includes(needId);
    const newNeeds = exists
      ? formData.selectedNeeds.filter((id) => id !== needId)
      : [...formData.selectedNeeds, needId];

    const nextSchedule = { ...schedule };
    if (exists) {
      delete nextSchedule[needId];
    } else {
      const tag = NEEDS_TAGS.find((t) => t.id === needId);
      nextSchedule[needId] = {
        days: [...WEEKDAYS],
        periods: tag ? [...tag.defaultSlots] : ['daytime'],
      };
    }

    setFormData((prev) => ({
      ...prev,
      selectedNeeds: newNeeds,
      slotNeeds: scheduleToSlotNeeds(newNeeds, nextSchedule),
    }));
    setSchedule(nextSchedule);
  };

  const handleBudgetChange = (budget: number) => {
    setFormData((prev) => ({ ...prev, monthlyBudget: budget }));
  };

  const nextStep = () => {
    if (currentStep < 5) {
      setDirection('fwd');
      setCurrentStep((prev) => prev + 1);
    } else {
      onSubmit(formData);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setDirection('back');
      setCurrentStep((prev) => prev - 1);
    }
  };

  const STEP_TITLES = [
    '要介護認定の区分',
    'ご本人の世帯状況',
    '困っていること',
    '発生する曜日・時間帯',
    '月に出せる金額',
  ];

  return (
    <div className="glass rounded-xl border border-stone-200 overflow-hidden max-w-3xl mx-auto my-6">
      {/* ヘッダー */}
      <div className="px-6 py-5 border-b border-stone-200">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-orange-700 tracking-wide">
              ステップ {currentStep} / 5
            </span>
            <h2 key={currentStep} className="text-xl font-bold mt-0.5 text-stone-900 swap swap-tight">
              {STEP_TITLES[currentStep - 1]}
            </h2>
          </div>
          <button
            onClick={onLoadDemo}
            type="button"
            className="shrink-0 px-3 py-1.5 rounded-lg border border-stone-300 text-stone-600 hover:bg-stone-50 text-xs font-medium transition-colors"
          >
            入力例を読み込む
          </button>
        </div>

        {/* ステップ進捗（5分割セグメント） */}
        <div
          className="flex gap-1.5 mt-4"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={5}
          aria-valuenow={currentStep}
          aria-label={`ステップ ${currentStep} / 5`}
        >
          {[1, 2, 3, 4, 5].map((step) => (
            <div
              key={step}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                step <= currentStep ? 'bg-orange-600' : 'bg-stone-200'
              }`}
            />
          ))}
        </div>
      </div>

      <div
        key={currentStep}
        className={`p-6 sm:p-7 min-h-[360px] swap ${direction === 'fwd' ? 'swap-fwd' : 'swap-back'}`}
      >
        {/* ---------------- Step 1: 要介護度 ---------------- */}
        {currentStep === 1 && (
          <div className="space-y-5">
            <p className="text-sm text-stone-600">
              ご本人が受けている介護認定を選んでください。まだ申請していない場合も選べます。
            </p>

            <div className="space-y-4">
              {CARE_LEVEL_GROUPS.map((group) => (
                <div key={group.label}>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-xs font-bold text-stone-700">{group.label}</span>
                    {group.note && (
                      <span className="text-[11px] text-stone-400">{group.note}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {group.levels.map((level) => {
                      const isSelected = formData.careLevel === level;
                      return (
                        <button
                          key={level}
                          type="button"
                          onClick={() => handleCareLevelChange(level)}
                          aria-pressed={isSelected}
                          className={`press inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border text-sm transition-colors ${
                            isSelected
                              ? 'border-orange-600 bg-orange-50 text-orange-900 font-bold'
                              : 'border-stone-300 text-stone-700 hover:bg-stone-50 font-medium'
                          }`}
                        >
                          {isSelected && <Check className="w-4 h-4 text-orange-600" />}
                          {CARE_LEVEL_SHORT[level]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* 選択中の区分の説明のみを1行で表示 */}
            <div className="p-3.5 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-600 leading-relaxed">
              {CARE_LEVEL_LIMITS[formData.careLevel].description}
            </div>
          </div>
        )}

        {/* ---------------- Step 2: 世帯状況 ---------------- */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-stone-600">
              同居家族の有無で、介護保険の生活援助が使えるかどうかが変わります。
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {HOUSEHOLDS.map((item) => {
                const isSelected = formData.householdType === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleHouseholdChange(item.id)}
                    aria-pressed={isSelected}
                    className={`press text-left p-4 rounded-lg border transition-colors flex items-start gap-3 ${
                      isSelected
                        ? 'border-orange-600 bg-orange-50'
                        : 'border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 mt-0.5 shrink-0 ${
                        isSelected ? 'text-orange-600' : 'text-stone-400'
                      }`}
                    />
                    <span>
                      <span className="flex items-center gap-1.5">
                        <span
                          className={`font-bold text-sm ${
                            isSelected ? 'text-orange-900' : 'text-stone-900'
                          }`}
                        >
                          {item.title}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-orange-600" />}
                      </span>
                      <span className="block text-xs text-stone-600 leading-relaxed mt-1">
                        {item.desc}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ---------------- Step 3: 困りごと（種類別） ---------------- */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm text-stone-600">
                負担に感じていることを選んでください（複数可）。
              </p>
              <span className="shrink-0 text-xs font-bold text-orange-800 tabular-nums">
                {formData.selectedNeeds.length} 件選択中
              </span>
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
              {NEEDS_CATEGORIES.map((cat) => {
                const tags = NEEDS_TAGS.filter((t) => t.category === cat.key);
                if (tags.length === 0) return null;
                const selectedCount = tags.filter((t) =>
                  formData.selectedNeeds.includes(t.id)
                ).length;

                return (
                  <div key={cat.key}>
                    <div className="flex items-baseline gap-2 mb-2 pb-1.5 border-b border-stone-200">
                      <span className="text-xs font-bold text-stone-800">{cat.label}</span>
                      <span className="text-[11px] text-stone-400">{cat.hint}</span>
                      {selectedCount > 0 && (
                        <span className="ml-auto text-[11px] font-bold text-orange-700 tabular-nums">
                          {selectedCount}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => {
                        const isSelected = formData.selectedNeeds.includes(tag.id);
                        return (
                          <button
                            key={tag.id}
                            type="button"
                            title={tag.description}
                            onClick={() => toggleNeed(tag.id)}
                            aria-pressed={isSelected}
                            className={`press-sm inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs transition-colors ${
                              isSelected
                                ? 'border-orange-600 bg-orange-50 text-orange-900 font-bold'
                                : 'border-stone-300 text-stone-700 hover:bg-stone-50'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 text-orange-600" />}
                            {tag.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ---------------- Step 4: タスクごとの発生タイミング ---------------- */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <p className="text-sm text-stone-600">
              困りごとごとに、発生する曜日と時間帯を選んでください。次の画面で、この予定にサービスを自動で当てはめた結果が表示されます。
            </p>

            {formData.selectedNeeds.length === 0 ? (
              <div className="p-6 rounded-lg border border-dashed border-stone-300 text-center text-sm text-stone-500">
                困りごとがまだ選ばれていません。「戻る」から選択してください。
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {formData.selectedNeeds.map((needId) => {
                  const tag = NEEDS_TAGS.find((t) => t.id === needId);
                  if (!tag) return null;
                  const timing = schedule[needId] ?? { days: [], periods: [] };
                  // 重なりで上書きされた分を除いた、実際に確保できたコマ数
                  const actual = Object.values(formData.slotNeeds).filter(
                    (v) => v === needId
                  ).length;
                  const isWeekdays =
                    timing.days.length === 5 && WEEKDAYS.every((d) => timing.days.includes(d));
                  const isWeekend =
                    timing.days.length === 2 && WEEKEND.every((d) => timing.days.includes(d));
                  const isEveryDay = timing.days.length === 7;
                  // 選んだ数と、実際に確保できた数の差＝他の困りごとに取られた分
                  const requested = timing.days.length * timing.periods.length;
                  const takenByOthers = Math.max(0, requested - actual);

                  return (
                    <div
                      key={needId}
                      className="rounded-lg border border-stone-200 overflow-hidden"
                    >
                      <div className="px-3.5 py-2.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between gap-3">
                        <span className="text-sm font-bold text-stone-900 truncate">
                          {tag.name}
                        </span>
                        <span
                          key={actual}
                          className={`swap swap-tight shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums ${
                            actual > 0
                              ? 'bg-orange-50 text-orange-800 border border-orange-200'
                              : 'bg-stone-100 text-stone-500 border border-stone-200'
                          }`}
                        >
                          週 {actual} コマ
                        </span>
                      </div>

                      <div className="px-3.5 py-3 space-y-2.5">
                        {/* 曜日 */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] text-stone-500 w-12 shrink-0">曜日</span>
                          <button
                            type="button"
                            onClick={() => setTaskDays(needId, ALL_DAYS)}
                            className={`px-2 py-1 rounded-md border text-[11px] font-bold transition-colors ${
                              isEveryDay
                                ? 'border-orange-600 bg-orange-50 text-orange-800'
                                : 'border-stone-300 text-stone-600 hover:bg-stone-50'
                            }`}
                          >
                            毎日
                          </button>
                          <button
                            type="button"
                            onClick={() => setTaskDays(needId, WEEKDAYS)}
                            className={`px-2 py-1 rounded-md border text-[11px] font-bold transition-colors ${
                              isWeekdays
                                ? 'border-orange-600 bg-orange-50 text-orange-800'
                                : 'border-stone-300 text-stone-600 hover:bg-stone-50'
                            }`}
                          >
                            平日
                          </button>
                          <button
                            type="button"
                            onClick={() => setTaskDays(needId, WEEKEND)}
                            className={`px-2 py-1 rounded-md border text-[11px] font-bold transition-colors ${
                              isWeekend
                                ? 'border-orange-600 bg-orange-50 text-orange-800'
                                : 'border-stone-300 text-stone-600 hover:bg-stone-50'
                            }`}
                          >
                            土日
                          </button>
                          <span className="w-px h-4 bg-stone-200 mx-0.5" />
                          {DAYS_OF_WEEK.map((d) => {
                            const on = timing.days.includes(d.key);
                            return (
                              <button
                                key={d.key}
                                type="button"
                                aria-pressed={on}
                                aria-label={d.label}
                                onClick={() => toggleTaskDay(needId, d.key)}
                                className={`press-sm w-7 h-7 rounded-md border text-[11px] font-bold transition-colors ${
                                  on
                                    ? 'border-orange-600 bg-orange-600 text-white'
                                    : 'border-stone-300 text-stone-600 hover:bg-stone-50'
                                }`}
                              >
                                {d.shortLabel}
                              </button>
                            );
                          })}
                        </div>

                        {/* 時間帯 */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] text-stone-500 w-12 shrink-0">時間帯</span>
                          {TIME_PERIODS.map((tp) => {
                            const on = timing.periods.includes(tp.key);
                            return (
                              <button
                                key={tp.key}
                                type="button"
                                aria-pressed={on}
                                onClick={() => toggleTaskPeriod(needId, tp.key)}
                                className={`press-sm px-2.5 py-1 rounded-md border text-[11px] font-bold transition-colors ${
                                  on
                                    ? 'border-orange-600 bg-orange-50 text-orange-800'
                                    : 'border-stone-300 text-stone-600 hover:bg-stone-50'
                                }`}
                              >
                                {tp.label}
                                <span className="ml-1 font-normal text-[11px] opacity-70">
                                  {tp.timeRange}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {takenByOthers > 0 && (
                          <p className="text-[11px] text-amber-700">
                            選んだ {requested} コマのうち {takenByOthers} コマは、他の困りごとと重なっているためそちらが優先されています。
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex items-center gap-2 p-3 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-600">
              <CalendarDays className="w-4 h-4 text-stone-400 shrink-0" />
              <span>
                1週間で
                <strong className="text-stone-900 tabular-nums mx-1">
                  {Object.values(formData.slotNeeds).filter(Boolean).length}
                </strong>
                コマの困りごとが登録されています（最大28コマ）。同じ枠が重なった場合は、あとから選んだ困りごとが優先されます。
              </span>
            </div>
          </div>
        )}

        {/* ---------------- Step 5: 予算 ---------------- */}
        {currentStep === 5 && (
          <div className="space-y-5">
            <p className="text-sm text-stone-600">
              保険外サービス（自費・シルバー人材・互助）に月々出せる上限を設定してください。
            </p>
            <div className="bg-stone-50 p-6 rounded-lg border border-stone-200 text-center space-y-4">
              <span className="text-xs font-semibold text-stone-500">月額の自己負担 上限</span>
              <div className="text-4xl font-bold text-orange-700 tabular-nums">
                {formData.monthlyBudget.toLocaleString()}
                <span className="text-lg font-normal text-stone-600 ml-1">円 / 月</span>
              </div>

              <input
                type="range"
                min="0"
                max="200000"
                step="5000"
                aria-label="月額予算"
                value={formData.monthlyBudget}
                onChange={(e) => handleBudgetChange(Number(e.target.value))}
                style={{ '--range-progress': `${(formData.monthlyBudget / 200000) * 100}%` } as React.CSSProperties}
                className="w-full h-6 cursor-pointer"
              />

              <div className="flex justify-between text-[11px] text-stone-400 font-medium tabular-nums">
                <span>0円</span>
                <span>5万円</span>
                <span>10万円</span>
                <span>15万円</span>
                <span>20万円</span>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-orange-50 border border-orange-200 text-xs text-orange-900 leading-relaxed">
              <strong>0円でも大丈夫です。</strong>{' '}
              地域のボランティア、社協のサロン、自治体の助成（おむつ支給など）だけで組める案も探します。
            </div>
          </div>
        )}
      </div>

      {/* フッター */}
      <div className="bg-stone-50 border-t border-stone-200 px-6 py-4 flex items-center justify-between">
        <button
          type="button"
          onClick={prevStep}
          disabled={currentStep === 1}
          className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            currentStep === 1
              ? 'text-stone-300 cursor-not-allowed'
              : 'text-stone-700 hover:bg-stone-200'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          戻る
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onSubmit(formData)}
            className="text-xs text-stone-500 hover:text-stone-800 underline"
          >
            入力を省略して結果を見る
          </button>

          <button
            type="button"
            onClick={nextStep}
            className="press lift flex items-center gap-1.5 px-6 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm transition-colors"
          >
            {currentStep === 5 ? 'サービスを当てはめる' : '次へ'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
