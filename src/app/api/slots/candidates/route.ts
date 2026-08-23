/**
 * スロット適合サービス候補取得 API
 * GET /api/slots/candidates
 * 
 * 指定スロット（曜日・時間帯・ニーズ・要介護度・世帯状況）に合致するサービス候補一覧を返します。
 */

import { NextRequest, NextResponse } from 'next/server';
import { ALL_SERVICES } from '@/data/servicesSeed';
import { CareLevel, DayOfWeek, HouseholdType, TimePeriod } from '@/types';
import { getCandidatesForSlot } from '@/utils/timelineEngine';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const day = (searchParams.get('day') || 'mon') as DayOfWeek;
  const period = (searchParams.get('period') || 'morning') as TimePeriod;
  const needsTagId = searchParams.get('needsTagId') || '';
  const careLevel = (searchParams.get('careLevel') || 'care_2') as CareLevel;
  const householdType = (searchParams.get('householdType') || 'living_together') as HouseholdType;

  if (!needsTagId) {
    return NextResponse.json({ success: true, count: 0, data: [] });
  }

  const candidates = getCandidatesForSlot(
    day,
    period,
    needsTagId,
    careLevel,
    householdType,
    ALL_SERVICES
  );

  return NextResponse.json({
    success: true,
    count: candidates.length,
    data: candidates,
  });
}
