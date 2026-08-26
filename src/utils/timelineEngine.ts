/**
 * けあしる 最適化・計算エンジン
 * 
 * 28スロットの初期生成、貪欲法による予算制約つきサービス最適化、
 * 介護保険区分支給限度基準額の判定、指標（家族時間・自己負担・充足率・買い戻し単価）の計算を行います。
 */

import { CARE_LEVEL_LIMITS, DAYS_OF_WEEK, TIME_PERIODS } from '@/constants/careConstants';
import { ALL_SERVICES } from '@/data/servicesSeed';
import {
  CareLevel,
  DayOfWeek,
  HouseholdType,
  Service,
  SlotId,
  TimePeriod,
  TimelineMetrics,
  TimelineSlot,
  UserInputData,
} from '@/types';

// 月換算係数（1ヶ月 ≒ 4.33週）
export const WEEKS_PER_MONTH = 4.33;

/**
 * 1スロットの実負担時間（effectiveHours）を計算
 */
export function calculateEffectiveHours(
  period: TimePeriod,
  careLevel: CareLevel,
  householdType: HouseholdType
): number {
  switch (period) {
    case 'morning':
      return 2.0;
    case 'daytime':
      // 日中は要介護度が高い場合や同居の場合、常時見守り負担が増加
      if (careLevel === 'care_4' || careLevel === 'care_5') return 6.0;
      if (careLevel === 'care_3') return 5.0;
      if (householdType === 'living_together') return 4.0;
      return 3.0;
    case 'evening':
      return 3.0;
    case 'night':
      if (careLevel === 'care_3' || careLevel === 'care_4' || careLevel === 'care_5') return 3.0;
      return 2.5;
    default:
      return 2.0;
  }
}

/**
 * 初期タイムライン（Before: 家族が全負担を担っている状態）を生成
 */
export function generateInitialTimeline(input: UserInputData): TimelineSlot[] {
  const slots: TimelineSlot[] = [];

  for (const dayObj of DAYS_OF_WEEK) {
    for (const periodObj of TIME_PERIODS) {
      const slotId: SlotId = `${dayObj.key}-${periodObj.key}`;
      const needsTagId = input.slotNeeds[slotId] || undefined;
      const nominalHours = periodObj.nominalHours;
      const effectiveHours = needsTagId
        ? calculateEffectiveHours(periodObj.key, input.careLevel, input.householdType)
        : 0;

      slots.push({
        id: slotId,
        day: dayObj.key,
        period: periodObj.key,
        state: needsTagId ? 'family' : 'none',
        needsTagId: needsTagId,
        assignedService: undefined,
        nominalHours: nominalHours,
        effectiveHours: effectiveHours,
        cost: 0,
      });
    }
  }

  return slots;
}

/**
 * 対象スロットに適合するサービス候補を検索
 */
export function getCandidatesForSlot(
  day: DayOfWeek,
  period: TimePeriod,
  needsTagId: string,
  careLevel: CareLevel,
  householdType: HouseholdType,
  allServices: Service[] = ALL_SERVICES
): Service[] {
  return allServices.filter((service) => {
    // 承認済みステータスのみ
    if (service.status !== 'approved') return false;

    // ニーズタグが一致するか
    if (!service.needsTagIds.includes(needsTagId)) return false;

    // 曜日・時間帯が対応可能か
    if (!service.availableDays.includes(day)) return false;
    if (!service.availablePeriods.includes(period)) return false;

    // 要介護度の適合
    if (!service.targetCareLevels.includes(careLevel)) {
      // 未申請の場合、保険給付サービスは利用不可
      if (careLevel === 'unapplied' && service.scheme === 'insurance') return false;
    }

    // 保険の生活援助で同居家族がいる場合の制限判定
    if (
      householdType === 'living_together' &&
      service.scheme === 'insurance' &&
      service.needsTagIds.some((id) => ['cleaning', 'cooking', 'laundry', 'shopping_daily'].includes(id))
    ) {
      // 厳密には同居家族制限があるが、除外せずスコアを下げるか注意喚起
    }

    return true;
  });
}

/**
 * サービス割り当て最適化（予算制約つき効率順貪欲法）
 * 100ms以内で実行される高速アルゴリズム
 */
export function optimizeTimeline(
  currentSlots: TimelineSlot[],
  careLevel: CareLevel,
  householdType: HouseholdType,
  monthlyBudget: number,
  allServices: Service[] = ALL_SERVICES
): {
  optimizedSlots: TimelineSlot[];
  metrics: TimelineMetrics;
} {
  const limitInfo = CARE_LEVEL_LIMITS[careLevel];
  const maxInsuranceUnits = limitInfo.maxUnits;

  // ニーズがあるスロットを抽出
  const slotsToFill = currentSlots.map((slot) => ({ ...slot }));
  
  let currentUsedInsuranceUnits = 0;
  let currentMonthlySelfPay = 0;

  // 1. 各スロットについて候補サービスを収集し、削減効率（reductionHours / 1回あたりコスト）を算出
  interface CandidateOption {
    slotIndex: number;
    slotId: SlotId;
    service: Service;
    monthlyCost: number;
    monthlyReductionHours: number;
    efficiency: number; // reductionHours / cost (高いほどお得)
    isInsurance: boolean;
    unitCount: number;
  }

  const allOptions: CandidateOption[] = [];

  slotsToFill.forEach((slot, index) => {
    if (!slot.needsTagId || slot.needsTagId === '') return;

    const candidates = getCandidatesForSlot(
      slot.day,
      slot.period,
      slot.needsTagId,
      careLevel,
      householdType,
      allServices
    );

    for (const service of candidates) {
      // 月換算コスト（週1回と仮定 × 4.33週）
      let oneTimeCost = service.price;
      const unitCount = service.unitCount || 0;

      // 保険給付サービスで1単位=10円、1割自己負担
      if (service.scheme === 'insurance' && unitCount > 0) {
        oneTimeCost = Math.round(unitCount * 1.0); // 1割負担
      }

      const monthlyCost = Math.round(oneTimeCost * WEEKS_PER_MONTH);
      const monthlyReductionHours = service.reductionHours * WEEKS_PER_MONTH;
      
      // コストが0（無料・ボランティア）の場合は超高効率として扱う
      const efficiency = monthlyCost === 0 ? 99999 : monthlyReductionHours / monthlyCost;

      allOptions.push({
        slotIndex: index,
        slotId: slot.id,
        service: service,
        monthlyCost: monthlyCost,
        monthlyReductionHours: monthlyReductionHours,
        efficiency: efficiency,
        isInsurance: service.scheme === 'insurance',
        unitCount: unitCount * WEEKS_PER_MONTH,
      });
    }
  });

  // 2. 効率（efficiency）の降順でソート
  allOptions.sort((a, b) => b.efficiency - a.efficiency);

  // 3. スロットが重複しないように貪欲に割り当て
  const filledSlotIndices = new Set<number>();

  // まずは無料サービス・互助サービスを無条件で適用
  for (const opt of allOptions) {
    if (opt.monthlyCost === 0 && !filledSlotIndices.has(opt.slotIndex)) {
      filledSlotIndices.add(opt.slotIndex);
      const slot = slotsToFill[opt.slotIndex];
      slot.assignedService = opt.service;
      slot.state = opt.service.scheme === 'insurance' ? 'insurance' : 'paid';
      slot.cost = 0;
    }
  }

  // 予算制約と介護保険支給限度額の範囲で割り当て
  for (const opt of allOptions) {
    if (filledSlotIndices.has(opt.slotIndex)) continue;

    // 保険枠のチェック
    let extraSelfPay = opt.monthlyCost;
    let unitsToAdd = 0;

    if (opt.isInsurance) {
      if (currentUsedInsuranceUnits + opt.unitCount <= maxInsuranceUnits) {
        // 限度内
        unitsToAdd = opt.unitCount;
      } else {
        // 限度超過分は10割負担（全額自己負担）
        const withinUnits = Math.max(0, maxInsuranceUnits - currentUsedInsuranceUnits);
        const overUnits = opt.unitCount - withinUnits;
        unitsToAdd = withinUnits;
        extraSelfPay = Math.round(withinUnits * 1.0 + overUnits * 10.0);
      }
    }

    // 予算チェック
    if (currentMonthlySelfPay + extraSelfPay <= monthlyBudget || monthlyBudget === 0) {
      if (monthlyBudget === 0 && extraSelfPay > 0) {
        // 予算0円の場合は有償サービスはスキップ
        continue;
      }

      // 採用
      filledSlotIndices.add(opt.slotIndex);
      currentUsedInsuranceUnits += unitsToAdd;
      currentMonthlySelfPay += extraSelfPay;

      const slot = slotsToFill[opt.slotIndex];
      slot.assignedService = opt.service;
      slot.state = opt.service.scheme === 'insurance' ? 'insurance' : 'paid';
      slot.cost = extraSelfPay;
    }
  }

  // 4. 指標の計算
  const metrics = calculateMetrics(currentSlots, slotsToFill, careLevel);

  return {
    optimizedSlots: slotsToFill,
    metrics: metrics,
  };
}

/**
 * 3大指標 ＋ 買い戻し単価の算出
 */
export function calculateMetrics(
  initialSlots: TimelineSlot[],
  currentSlots: TimelineSlot[],
  careLevel: CareLevel
): TimelineMetrics {
  const limitInfo = CARE_LEVEL_LIMITS[careLevel];
  
  // 1. 家族の介護時間（時間/週）
  let familyHoursPerWeek = 0;
  let totalNeededSlots = 0;
  let coveredSlots = 0;
  let selfPayPerMonth = 0;
  let insuranceUnitsUsed = 0;

  for (const slot of currentSlots) {
    if (slot.needsTagId) {
      totalNeededSlots++;
      if (slot.state === 'family') {
        familyHoursPerWeek += slot.effectiveHours;
      } else if (slot.state === 'insurance' || slot.state === 'paid') {
        coveredSlots++;
        selfPayPerMonth += slot.cost;
        if (slot.assignedService?.unitCount) {
          insuranceUnitsUsed += slot.assignedService.unitCount * WEEKS_PER_MONTH;
        }
      }
    }
  }

  // 初期家族時間（時間/週）
  let initialFamilyHoursPerWeek = 0;
  for (const slot of initialSlots) {
    if (slot.needsTagId) {
      initialFamilyHoursPerWeek += slot.effectiveHours;
    }
  }

  // 削減された家族時間（時間/月）
  const savedHoursPerWeek = Math.max(0, initialFamilyHoursPerWeek - familyHoursPerWeek);
  const savedHoursPerMonth = Math.round(savedHoursPerWeek * WEEKS_PER_MONTH * 10) / 10;

  // サービスで対応できた割合（%）
  const coverageRate = totalNeededSlots > 0 ? Math.round((coveredSlots / totalNeededSlots) * 100) : 0;

  // 時間の買い戻し単価（円/時間）
  // 買い戻し単価 = （追加自己負担額 / 月） ÷ （削減された家族時間 / 月）
  const repurchaseUnitPrice =
    savedHoursPerMonth > 0 ? Math.round(selfPayPerMonth / savedHoursPerMonth) : 0;

  const isLimitExceeded = insuranceUnitsUsed > limitInfo.maxUnits;

  return {
    familyHoursPerWeek: Math.round(familyHoursPerWeek * 10) / 10,
    selfPayPerMonth: Math.round(selfPayPerMonth),
    coverageRate: coverageRate,
    coveredSlotCount: coveredSlots,
    neededSlotCount: totalNeededSlots,
    savedHoursPerMonth: savedHoursPerMonth,
    repurchaseUnitPrice: repurchaseUnitPrice,
    insuranceUnitsUsed: Math.round(insuranceUnitsUsed),
    insuranceUnitsLimit: limitInfo.maxUnits,
    isLimitExceeded: isLimitExceeded,
  };
}
