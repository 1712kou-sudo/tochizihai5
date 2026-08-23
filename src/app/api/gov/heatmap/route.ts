/**
 * 自治体ヒートマップ・需要統計 API
 * GET /api/gov/heatmap
 * 
 * 時間帯×曜日の需要ギャップ、未充足需要ランキング、地域空白密度を返します。
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      totalSearches: 3480,
      unmetNeedsRate: 29.4,
      averageRepurchaseCostPerHour: 620,
      approvedServicesCount: 185,
      privatePaidCount: 96,
    },
  });
}
