/**
 * ニーズタグ一覧取得 API
 * GET /api/needs-tags
 * 
 * 介護現場で頻出する困りごと（30タグ）の一覧を返します。
 */

import { NextResponse } from 'next/server';
import { NEEDS_TAGS } from '@/constants/careConstants';

export async function GET() {
  return NextResponse.json({
    success: true,
    total: NEEDS_TAGS.length,
    data: NEEDS_TAGS,
  });
}
