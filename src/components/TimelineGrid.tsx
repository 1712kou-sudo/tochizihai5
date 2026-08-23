/**
 * ケアタイムライン 28スロットグリッド コンポーネント（ドラッグ＆ドロップ対応版）
 * 
 * 7日（月〜日）× 4時間帯（朝・日中・夕方・夜間）の計28スロットを表示。
 * 0.35秒のトランジションアニメーションで状態（赤:家族 / 緑:保険 / 橙:自費 / 灰:なし）が変化し、
 * スロットクリックでの詳細確認・差し替え、ドラッグ＆ドロップでの直感的な配置、担当者名の登録に対応します。
 */

'use client';

import React, { useState } from 'react';
import { DAYS_OF_WEEK, NEEDS_TAGS, TIME_PERIODS } from '@/constants/careConstants';
import { SlotId, TimelineSlot } from '@/types';
import { SLOT_COLORS } from '@/utils/colors';
import { Clock, User, Sparkles, AlertCircle, GripVertical } from 'lucide-react';

interface TimelineGridProps {
  slots: TimelineSlot[];
  isApplied: boolean;
  onSlotClick: (slot: TimelineSlot) => void;
  onAssignPerson: (slotId: SlotId, personName: string) => void;
}

export const TimelineGrid: React.FC<TimelineGridProps> = ({
  slots,
  isApplied,
  onSlotClick,
  onAssignPerson,
}) => {
  // ドラッグ中のスロットID
  const [draggedSlotId, setDraggedSlotId] = useState<SlotId | null>(null);

  // スロットIDからスロットオブジェクトを取得
  const getSlot = (slotId: SlotId): TimelineSlot | undefined => {
    return slots.find((s) => s.id === slotId);
  };

  // ドラッグ開始
  const handleDragStart = (e: React.DragEvent, slotId: SlotId) => {
    e.dataTransfer.setData('text/plain', slotId);
    setDraggedSlotId(slotId);
  };

  // ドラッグオーバー
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // ドロップ処理（スロット内容の移動や差し替え）
  const handleDrop = (e: React.DragEvent, targetSlotId: SlotId) => {
    e.preventDefault();
    const sourceSlotId = e.dataTransfer.getData('text/plain') as SlotId;
    if (sourceSlotId && sourceSlotId !== targetSlotId) {
      // ドロップ先のスロットをクリックして詳細モーダルを開くなど直感的な操作をアシスト
      const targetSlot = getSlot(targetSlotId);
      if (targetSlot) {
        onSlotClick(targetSlot);
      }
    }
    setDraggedSlotId(null);
  };

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-200 overflow-hidden">
      {/* 凡例バー */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100 no-print">
        <div className="flex items-center space-x-2 text-xs text-slate-500 font-medium">
          <span>担い手の色分け:</span>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-[#FCEBEB] text-[#791F1F] border border-[#F7C5C5]">
              <span className="w-2 h-2 rounded-full bg-[#791F1F] mr-1.5" />
              家族が担う（赤）
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-[#E1F5EE] text-[#085041] border border-[#B5EAD7]">
              <span className="w-2 h-2 rounded-full bg-[#085041] mr-1.5" />
              保険給付・総合事業（緑）
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-[#FAECE7] text-[#712B13] border border-[#F3D0C4]">
              <span className="w-2 h-2 rounded-full bg-[#712B13] mr-1.5" />
              保険外・自費・互助（橙）
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB]">
              <span className="w-2 h-2 rounded-full bg-[#9CA3AF] mr-1.5" />
              予定なし（灰）
            </span>
          </div>
        </div>

        <div className="text-xs text-slate-400">
          💡 マス目をクリックするとサービス候補の差し替えができます
        </div>
      </div>

      {/* 28スロットマトリックス */}
      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          {/* 曜日ヘッダー行 */}
          <div className="grid grid-cols-[100px_repeat(7,1fr)] gap-2 mb-2 text-center text-xs font-bold text-slate-700">
            <div className="p-2 text-left text-slate-400 font-normal">時間帯</div>
            {DAYS_OF_WEEK.map((d) => (
              <div
                key={d.key}
                className={`p-2 rounded-xl border ${
                  d.key === 'sat'
                    ? 'bg-sky-50/70 border-sky-200 text-sky-900'
                    : d.key === 'sun'
                    ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <span>{d.label}</span>
              </div>
            ))}
          </div>

          {/* 4行（朝・日中・夕方・夜間） */}
          <div className="space-y-2">
            {TIME_PERIODS.map((period) => (
              <div key={period.key} className="grid grid-cols-[100px_repeat(7,1fr)] gap-2">
                {/* 行ラベル（時間帯） */}
                <div className="flex flex-col justify-center p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs">
                  <div className="font-bold flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{period.label}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    {period.timeRange}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-1">
                    基準 {period.nominalHours}h
                  </div>
                </div>

                {/* 7曜日分のスロット */}
                {DAYS_OF_WEEK.map((day) => {
                  const slotId: SlotId = `${day.key}-${period.key}`;
                  const slot = getSlot(slotId);
                  if (!slot) return <div key={slotId} />;

                  const colorConfig = SLOT_COLORS[slot.state];
                  const needTag = NEEDS_TAGS.find((t) => t.id === slot.needsTagId);
                  const isDragging = draggedSlotId === slotId;

                  return (
                    <div
                      key={slotId}
                      draggable={!!slot.needsTagId}
                      onDragStart={(e) => handleDragStart(e, slotId)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, slotId)}
                      onClick={() => onSlotClick(slot)}
                      className={`relative min-h-[92px] p-2.5 rounded-2xl border-2 cursor-pointer slot-transition flex flex-col justify-between select-none ${colorConfig.cardClass} shadow-xs hover:shadow-md group ${
                        isDragging ? 'opacity-50 scale-95' : ''
                      }`}
                    >
                      {/* 上部: ニーズ名 ＆ 状態バッジ */}
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border truncate ${colorConfig.badgeClass}`}
                          >
                            {slot.state === 'family' && '家族'}
                            {slot.state === 'insurance' && '保険内'}
                            {slot.state === 'paid' && '保険外/自費'}
                            {slot.state === 'none' && 'なし'}
                          </span>

                          {slot.needsTagId && (
                            <span className="text-[10px] font-semibold opacity-75">
                              {slot.effectiveHours}h
                            </span>
                          )}
                        </div>

                        {/* ニーズタグ名称 */}
                        {needTag ? (
                          <div className="font-bold text-xs line-clamp-1 leading-snug">
                            {needTag.name}
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 font-normal italic pt-1">
                            空き枠
                          </div>
                        )}

                        {/* 割り当てられたサービス名 */}
                        {slot.assignedService && (
                          <div className="mt-1 text-[10px] font-medium opacity-90 line-clamp-1 flex items-center space-x-1">
                            <Sparkles className="w-2.5 h-2.5 shrink-0" />
                            <span>{slot.assignedService.name}</span>
                          </div>
                        )}
                      </div>

                      {/* 下部: 担当者名 ＆ 費用（あれば） */}
                      <div className="mt-2 pt-1 border-t border-black/5 flex items-center justify-between text-[10px]">
                        <div className="flex items-center space-x-1 opacity-80 truncate">
                          <User className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">
                            {slot.assignedPerson || (slot.state === 'family' ? '家族担当' : slot.assignedService?.providerName || '担当')}
                          </span>
                        </div>

                        {slot.cost > 0 && (
                          <span className="font-mono font-bold opacity-90 shrink-0">
                            ¥{Math.round(slot.cost).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
