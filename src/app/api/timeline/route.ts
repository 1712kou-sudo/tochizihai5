/**
 * ケアタイムライン生成 API
 * POST /api/timeline
 * 
 * 要介護度・世帯状況・ニーズタグ・スロット設定・予算を受け取り、
 * 初期タイムライン（Before）、最適化タイムライン（After）、3指標、境界説明ルールを返します。
 */

import { NextRequest, NextResponse } from 'next/server';
import { RESTRICTION_RULES } from '@/constants/careConstants';
import { ALL_SERVICES } from '@/data/servicesSeed';
import { UserInputData } from '@/types';
import {
  generateInitialTimeline,
  optimizeTimeline,
  calculateMetrics,
} from '@/utils/timelineEngine';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as UserInputData;

    // 初期スロット生成
    const initialSlots = generateInitialTimeline(body);

    // 最適化計算
    const { optimizedSlots, metrics } = optimizeTimeline(
      initialSlots,
      body.careLevel,
      body.householdType,
      body.monthlyBudget,
      ALL_SERVICES
    );

    // 関連する境界説明ルール
    const activeRules = RESTRICTION_RULES.filter((r) =>
      body.selectedNeeds.includes(r.needsTagId)
    );

    return NextResponse.json({
      success: true,
      data: {
        initialSlots,
        optimizedSlots,
        metrics,
        restrictionRules: activeRules,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'タイムラインの生成に失敗しました。' },
      { status: 400 }
    );
  }
}
