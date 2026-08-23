/**
 * 5ステップ入力ウィザード コンポーネント
 * 
 * 1. 要介護認定区分
 * 2. 世帯状況
 * 3. 困りごと（ニーズタグ選択）
 * 4. 発生時間帯・曜日の設定
 * 5. 月額予算スライダー
 * 
 * 1分以内で直感的に入力でき、「デモ用サンプルで見る」で即座に開始可能です。
 */

'use client';

import React, { useState } from 'react';
import {
  CARE_LEVEL_LIMITS,
  DAYS_OF_WEEK,
  DEMO_SAMPLE_INPUT,
  NEEDS_TAGS,
  TIME_PERIODS,
} from '@/constants/careConstants';
import { CareLevel, DayOfWeek, HouseholdType, SlotId, TimePeriod, UserInputData } from '@/types';
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  DollarSign,
  Calendar,
  Heart,
  Home,
  UserCheck,
  Zap,
} from 'lucide-react';

interface InputWizardProps {
  initialData: UserInputData;
  onSubmit: (data: UserInputData) => void;
  onLoadDemo: () => void;
}

export const InputWizard: React.FC<InputWizardProps> = ({
  initialData,
  onSubmit,
  onLoadDemo,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [formData, setFormData] = useState<UserInputData>(initialData);

  // 要介護度の変更
  const handleCareLevelChange = (level: CareLevel) => {
    setFormData((prev) => ({ ...prev, careLevel: level }));
  };

  // 世帯状況の変更
  const handleHouseholdChange = (type: HouseholdType) => {
    setFormData((prev) => ({ ...prev, householdType: type }));
  };

  // ニーズタグのトグル選択
  const toggleNeed = (needId: string) => {
    setFormData((prev) => {
      const exists = prev.selectedNeeds.includes(needId);
      const newNeeds = exists
        ? prev.selectedNeeds.filter((id) => id !== needId)
        : [...prev.selectedNeeds, needId];

      // 新しく追加されたニーズの既定スロットを自動セット
      const newSlotNeeds = { ...prev.slotNeeds };
      const tag = NEEDS_TAGS.find((t) => t.id === needId);
      if (!exists && tag) {
        // 平日の既定時間帯に割り当て
        for (const day of ['mon', 'wed', 'fri'] as DayOfWeek[]) {
          for (const period of tag.defaultSlots) {
            const slotId: SlotId = `${day}-${period}`;
            if (!newSlotNeeds[slotId]) {
              newSlotNeeds[slotId] = needId;
            }
          }
        }
      }

      return {
        ...prev,
        selectedNeeds: newNeeds,
        slotNeeds: newSlotNeeds,
      };
    });
  };

  // スロットの困りごと変更
  const handleSlotNeedChange = (slotId: SlotId, needId: string | null) => {
    setFormData((prev) => ({
      ...prev,
      slotNeeds: {
        ...prev.slotNeeds,
        [slotId]: needId,
      },
    }));
  };

  // 予算変更
  const handleBudgetChange = (budget: number) => {
    setFormData((prev) => ({ ...prev, monthlyBudget: budget }));
  };

  // 次へ進む
  const nextStep = () => {
    if (currentStep < 5) {
      setCurrentStep((prev) => prev + 1);
    } else {
      onSubmit(formData);
    }
  };

  // 前へ戻る
  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden max-w-4xl mx-auto my-6 transition-all">
      {/* 上部ステッパーヘッダー */}
      <div className="bg-slate-900 text-white px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-400">
              ステップ {currentStep} / 5
            </span>
            <h2 className="text-xl font-bold mt-0.5">
              {currentStep === 1 && '1. ご本人の要介護認定区分'}
              {currentStep === 2 && '2. ご本人の世帯状況'}
              {currentStep === 3 && '3. 困りごと・気になることの選択'}
              {currentStep === 4 && '4. 困りごとが発生する曜日・時間帯'}
              {currentStep === 5 && '5. 月に出せる予算（自己負担枠）'}
            </h2>
          </div>
          <button
            onClick={onLoadDemo}
            type="button"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 text-xs font-medium transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>デモ用サンプルで見る</span>
          </button>
        </div>

        {/* プログレスバー */}
        <div className="w-full bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden">
          <div
            className="bg-gradient-to-r from-teal-400 to-emerald-400 h-full transition-all duration-300"
            style={{ width: `${(currentStep / 5) * 100}%` }}
          />
        </div>
      </div>

      {/* ステップ別コンテンツ */}
      <div className="p-6 sm:p-8 min-h-[380px]">
        {/* Step 1: 要介護度 */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              現在の要介護度を選択してください。公的介護保険の支給限度基準額を自動算出します。
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(Object.keys(CARE_LEVEL_LIMITS) as CareLevel[]).map((level) => {
                const item = CARE_LEVEL_LIMITS[level];
                const isSelected = formData.careLevel === level;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => handleCareLevelChange(level)}
                    className={`text-left p-4 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50/50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-base text-slate-900">{item.name}</span>
                        {isSelected && <CheckCircle2 className="w-5 h-5 text-teal-600" />}
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">{item.description}</p>
                    </div>
                    {item.maxUnits > 0 && (
                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                        <span>支給限度額:</span>
                        <span className="font-semibold text-slate-800">
                          {item.maxUnits.toLocaleString()} 単位
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: 世帯状況 */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              同居家族の有無によって、介護保険の生活援助の利用制限や最適な支援サービスが変わります。
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  id: 'single' as HouseholdType,
                  title: '独居（一人暮らし）',
                  desc: '日中の安否確認・配食・見守り体制が最優先。保険の生活援助もフル活用可能。',
                  icon: UserCheck,
                },
                {
                  id: 'elderly_only' as HouseholdType,
                  title: '高齢者のみ世帯（老老介護）',
                  desc: '夫婦ともに高齢。重い家事や通院・夜間見守りの外部委託が重要。',
                  icon: Heart,
                },
                {
                  id: 'living_together' as HouseholdType,
                  title: '同居家族あり（働き盛り世代と同居）',
                  desc: '保険の生活援助に制限があるため、自費家事代行やシルバー人材、デイサービスの組み合わせが有効。',
                  icon: Home,
                },
                {
                  id: 'long_distance' as HouseholdType,
                  title: '遠距離介護（離れて暮らす家族）',
                  desc: '遠隔での見守りセンサー、緊急駆けつけ、キーパーソンの定期訪問代行が必要。',
                  icon: Calendar,
                },
              ].map((item) => {
                const isSelected = formData.householdType === item.id;
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleHouseholdChange(item.id)}
                    className={`text-left p-5 rounded-2xl border-2 transition-all flex items-start space-x-4 ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50/50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`p-3 rounded-xl ${
                        isSelected ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-base text-slate-900">{item.title}</span>
                        {isSelected && <CheckCircle2 className="w-5 h-5 text-teal-600" />}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: ニーズタグ選択 */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">
                家族が負担を感じている困りごとを選んでください（複数選択可）。
              </p>
              <span className="text-xs font-semibold px-2.5 py-1 bg-teal-100 text-teal-800 rounded-full">
                選択中: {formData.selectedNeeds.length} 件
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
              {NEEDS_TAGS.map((tag) => {
                const isSelected = formData.selectedNeeds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleNeed(tag.id)}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50 text-teal-900 font-semibold shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs line-clamp-1">{tag.name}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />}
                    </div>
                    <span className="text-[10px] text-slate-500 line-clamp-1">{tag.description}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 4: 時間帯・曜日マトリックス */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              困りごとが発生する枠を確認・調整してください。該当する時間帯に家族負担（赤枠）が配置されます。
            </p>
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="p-2.5 border-b border-slate-200 font-bold">時間帯</th>
                    {DAYS_OF_WEEK.map((d) => (
                      <th key={d.key} className="p-2.5 border-b border-slate-200 font-bold text-center">
                        {d.shortLabel}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TIME_PERIODS.map((p) => (
                    <tr key={p.key} className="border-b border-slate-100">
                      <td className="p-2 font-medium bg-slate-50 text-slate-800 whitespace-nowrap">
                        <div>{p.label}</div>
                        <div className="text-[10px] text-slate-400">{p.timeRange}</div>
                      </td>
                      {DAYS_OF_WEEK.map((d) => {
                        const slotId: SlotId = `${d.key}-${p.key}`;
                        const currentNeedId = formData.slotNeeds[slotId];
                        const matchedTag = NEEDS_TAGS.find((t) => t.id === currentNeedId);

                        return (
                          <td key={slotId} className="p-1.5 text-center">
                            <select
                              value={currentNeedId || ''}
                              onChange={(e) => handleSlotNeedChange(slotId, e.target.value || null)}
                              className={`w-full text-[11px] p-1.5 rounded-lg border appearance-none truncate text-center ${
                                currentNeedId
                                  ? 'bg-rose-50 text-rose-800 border-rose-300 font-medium'
                                  : 'bg-white text-slate-400 border-slate-200'
                              }`}
                            >
                              <option value="">なし</option>
                              {formData.selectedNeeds.map((needId) => {
                                const tag = NEEDS_TAGS.find((t) => t.id === needId);
                                return (
                                  <option key={needId} value={needId}>
                                    {tag?.name || needId}
                                  </option>
                                );
                              })}
                            </select>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Step 5: 月額予算スライダー */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <p className="text-sm text-slate-600">
              介護保険外（自費・シルバー・互助）を含めて、月々に出せる自己負担予算の上限を設定してください。
            </p>
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-center space-y-4">
              <span className="text-sm font-semibold text-slate-600">月額自己負担 予算枠</span>
              <div className="text-4xl font-extrabold text-teal-700">
                {formData.monthlyBudget.toLocaleString()}{' '}
                <span className="text-xl font-normal text-slate-600">円／月</span>
              </div>

              <input
                type="range"
                min="0"
                max="100000"
                step="5000"
                value={formData.monthlyBudget}
                onChange={(e) => handleBudgetChange(Number(e.target.value))}
                className="w-full h-3 bg-slate-200 rounded-lg cursor-pointer accent-teal-600"
              />

              <div className="flex justify-between text-xs text-slate-500 font-medium">
                <span>0円（無償・互助のみ）</span>
                <span>2.5万円（標準）</span>
                <span>5万円</span>
                <span>10万円（充実）</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
              💡 <strong>予算0円でもOK</strong>:
              地域ボランティア、社協サロン、自治体助成（おむつ支給等）を活用して家族負担を軽減できる組み合わせを自動探索します。
            </div>
          </div>
        )}
      </div>

      {/* フッターナビゲーションボタン */}
      <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
        <button
          type="button"
          onClick={prevStep}
          disabled={currentStep === 1}
          className={`flex items-center space-x-1 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            currentStep === 1
              ? 'text-slate-300 cursor-not-allowed'
              : 'text-slate-700 hover:bg-slate-200'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          <span>前へ</span>
        </button>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => onSubmit(formData)}
            className="text-xs text-slate-500 hover:text-slate-700 underline"
          >
            スキップしてタイムラインを表示
          </button>

          <button
            type="button"
            onClick={nextStep}
            className="flex items-center space-x-1.5 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-95"
          >
            <span>{currentStep === 5 ? 'タイムラインを生成' : '次へ'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
