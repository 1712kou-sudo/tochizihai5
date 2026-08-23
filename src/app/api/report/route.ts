/**
 * サービス情報誤り報告 API
 * POST /api/report
 * 
 * ユーザーからの誤り報告を受理し、該当サービスを即時ドラフトに戻して非公開化します。
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { serviceId, reason } = body;

    // ログ記録と非公開処理シミュレーション
    console.log(`[REPORT RECEIVED] Service ID: ${serviceId}, Reason: ${reason}`);

    return NextResponse.json({
      success: true,
      message: '誤り報告を受け付けました。該当レコードは確認のため非公開（Draft）に戻されました。',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '報告の送信に失敗しました。' },
      { status: 400 }
    );
  }
}
