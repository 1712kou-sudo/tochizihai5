/**
 * A4 1枚 印刷最適化ビュー コンポーネント
 * 
 * ブラウザの印刷機能（Ctrl+P / Cmd+P）または「印刷する」ボタン押下時に
 * A4 1枚にぴったり収まるケアタイムライン計画書を出力します。
 */

'use client';

import React from 'react';
import { CARE_LEVEL_LIMITS, DAYS_OF_WEEK, NEEDS_TAGS, TIME_PERIODS } from '@/constants/careConstants';
import { CareLevel, HouseholdType, SlotId, TimelineMetrics, TimelineSlot } from '@/types';
import { SLOT_COLORS } from '@/utils/colors';

interface PrintViewProps {
  slots: TimelineSlot[];
  metrics: TimelineMetrics;
  careLevel: CareLevel;
  householdType: HouseholdType;
}

export const PrintView: React.FC<PrintViewProps> = ({
  slots,
  metrics,
  careLevel,
  householdType,
}) => {
  const getSlot = (slotId: SlotId) => slots.find((s) => s.id === slotId);
  const careInfo = CARE_LEVEL_LIMITS[careLevel];

  return (
    <div className="hidden print:block print-page p-2 text-slate-900 bg-white">
      {/* 印刷ヘッダー */}
      <div className="border-b-2 border-slate-900 pb-2 mb-3 flex justify-between items-end">
        <div>
          <span className="text-[10px] text-teal-800 font-bold tracking-wider">
            介護の「見えない時間」可視化 × ケアプラン共有シート
          </span>
          <h1 className="text-xl font-black text-slate-900">1週間のケアタイムライン計画書</h1>
        </div>
        <div className="text-right text-[10px] text-slate-500">
          <div>発行日: {new Date().toLocaleDateString('ja-JP')}</div>
          <div>要介護度: <strong className="text-slate-900">{careInfo.name}</strong></div>
        </div>
      </div>

      {/* 3指標サマリー */}
      <div className="grid grid-cols-4 gap-2 mb-3 bg-slate-50 p-2.5 rounded-xl border border-slate-300 text-center">
        <div>
          <span className="text-[9px] text-slate-500 block">家族が支える時間</span>
          <span className="text-base font-black text-rose-800">
            {metrics.familyHoursPerWeek} <span className="text-[10px] font-normal">時間/週</span>
          </span>
        </div>
        <div>
          <span className="text-[9px] text-slate-500 block">自己負担額目安</span>
          <span className="text-base font-black text-slate-900">
            ¥{metrics.selfPayPerMonth.toLocaleString()} <span className="text-[10px] font-normal">円/月</span>
          </span>
        </div>
        <div>
          <span className="text-[9px] text-slate-500 block">サービス充足率</span>
          <span className="text-base font-black text-teal-800">
            {metrics.coverageRate}%
          </span>
        </div>
        <div>
          <span className="text-[9px] text-slate-500 block">時間の買い戻し単価</span>
          <span className="text-base font-black text-indigo-800">
            約 ¥{metrics.repurchaseUnitPrice.toLocaleString()} <span className="text-[10px] font-normal">円/h</span>
          </span>
        </div>
      </div>

      {/* 28スロットマトリックス（印刷用） */}
      <div className="border border-slate-300 rounded-lg overflow-hidden mb-3">
        <table className="w-full text-left border-collapse text-[9px]">
          <thead>
            <tr className="bg-slate-200 text-slate-800 border-b border-slate-300">
              <th className="p-1 border-r border-slate-300 w-14 font-bold text-center">時間帯</th>
              {DAYS_OF_WEEK.map((d) => (
                <th key={d.key} className="p-1 border-r border-slate-300 text-center font-bold">
                  {d.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIME_PERIODS.map((period) => (
              <tr key={period.key} className="border-b border-slate-300">
                <td className="p-1 border-r border-slate-300 bg-slate-100 font-bold text-center">
                  <div>{period.label}</div>
                  <div className="text-[8px] text-slate-500">{period.timeRange}</div>
                </td>
                {DAYS_OF_WEEK.map((day) => {
                  const slotId: SlotId = `${day.key}-${period.key}`;
                  const slot = getSlot(slotId);
                  const needTag = NEEDS_TAGS.find((t) => t.id === slot?.needsTagId);
                  const colorConfig = slot ? SLOT_COLORS[slot.state] : null;

                  return (
                    <td
                      key={slotId}
                      className="p-1 border-r border-slate-300 align-top h-14"
                      style={{
                        backgroundColor: colorConfig?.bgHex || '#ffffff',
                        color: colorConfig?.textHex || '#000000',
                      }}
                    >
                      {slot?.needsTagId ? (
                        <div className="space-y-0.5">
                          <div className="font-bold line-clamp-1">{needTag?.name}</div>
                          {slot.assignedService ? (
                            <div className="text-[8px] font-medium opacity-90 line-clamp-1">
                              {slot.assignedService.name}
                            </div>
                          ) : (
                            <div className="text-[8px] font-bold text-rose-800">
                              [家族担当]
                            </div>
                          )}
                          <div className="text-[7px] opacity-75">
                            {slot.assignedPerson ? `担当: ${slot.assignedPerson}` : ''}
                          </div>
                        </div>
                      ) : (
                        <div className="text-slate-300 text-[8px] text-center">-</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 免責・注記 */}
      <div className="text-[8px] text-slate-500 border-t border-slate-200 pt-1 leading-normal flex justify-between">
        <span>※ 金額・利用可否は目安です。必ずケアマネジャー・地域包括支援センターにご相談ください。</span>
        <span>ケアタイムライン提供</span>
      </div>
    </div>
  );
};
