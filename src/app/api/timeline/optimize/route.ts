/**
 * 予算制約付きタイムライン最適化 API
 * POST /api/timeline/optimize
 * 
 * 予算スライダー操作時に呼び出され、効率順の貪欲法によって
 * 100ms以内の高速レスポンスで最適なサービス割り当てを返します。
 */

import { NextRequest, NextResponse } from 'next/server';
import { ALL_SERVICES } from '@/data/servicesSeed';
import { CareLevel, HouseholdType, TimelineSlot } from '@/types';
import { optimizeTimeline } from '@/utils/timelineEngine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slots, careLevel, householdType, budget } = body as {
      slots: TimelineSlot[];
      careLevel: CareLevel;
      householdType: HouseholdType;
      budget: number;
    };

    const startTime = performance.now();

    const { optimizedSlots, metrics } = optimizeTimeline(
      slots,
      careLevel,
      householdType,
      budget,
      ALL_SERVICES
    );

    const calculationTimeMs = Math.round((performance.now() - startTime) * 100) / 100;

    return NextResponse.json({
      success: true,
      calculationTimeMs,
      data: {
        optimizedSlots,
        metrics,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '最適化計算に失敗しました。' },
      { status: 400 }
    );
  }
}
