/**
 * けあしる 28スロットグリッド コンポーネント
 *
 * 7日（月〜日）× 4時間帯（朝・日中・夕方・夜間）の計28スロットを表示。
 *
 * レイアウト方針:
 *   ヘッダー行と4つの時間帯行を「ひとつのCSSグリッド」で描画し、
 *   曜日列は minmax(0, 1fr) で必ず等幅にする。
 *   （1fr は minmax(auto, 1fr) と同義で、長いサービス名が列を押し広げて
 *     行ごとに列幅がずれる原因になるため使わない）
 */

'use client';

import React, { useState } from 'react';
import { useReveal } from '@/hooks/useReveal';
import { DAYS_OF_WEEK, NEEDS_TAGS, TIME_PERIODS } from '@/constants/careConstants';
import { SlotId, TimelineSlot } from '@/types';
import { SLOT_COLORS } from '@/utils/colors';
import { Clock } from 'lucide-react';

interface TimelineGridProps {
  slots: TimelineSlot[];
  onSlotClick: (slot: TimelineSlot) => void;
  /** 予算スライダーを操作している最中は色の遷移を短縮してざわつきを抑える */
  isLive?: boolean;
}

/** 時間帯ラベル列 + 曜日7列（必ず等幅） */
const GRID_COLS = 'grid-cols-[92px_repeat(7,minmax(0,1fr))]';

export const TimelineGrid: React.FC<TimelineGridProps> = ({
  slots,
  onSlotClick,
  isLive = false,
}) => {
  const [draggedSlotId, setDraggedSlotId] = useState<SlotId | null>(null);
  // 28マスをスクロール到達時に波打つように出す
  const grid = useReveal<HTMLDivElement>();

  const getSlot = (slotId: SlotId): TimelineSlot | undefined =>
    slots.find((s) => s.id === slotId);

  const handleDragStart = (e: React.DragEvent, slotId: SlotId) => {
    e.dataTransfer.setData('text/plain', slotId);
    setDraggedSlotId(slotId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetSlotId: SlotId) => {
    e.preventDefault();
    const sourceSlotId = e.dataTransfer.getData('text/plain') as SlotId;
    if (sourceSlotId && sourceSlotId !== targetSlotId) {
      const targetSlot = getSlot(targetSlotId);
      if (targetSlot) onSlotClick(targetSlot);
    }
    setDraggedSlotId(null);
  };

  return (
    <div className="glass rounded-xl p-4 sm:p-6 border border-stone-200">
      {/* 凡例バー */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-stone-100 no-print">
        <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 font-medium">
          <span className="micro-label shrink-0">担い手</span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-[#FCEBEB] text-[#791F1F] border border-[#F7C5C5]">
            <span className="w-2 h-2 rounded-full bg-[#791F1F] mr-1.5" />
            家族が担う
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-[#E1F5EE] text-[#085041] border border-[#B5EAD7]">
            <span className="w-2 h-2 rounded-full bg-[#085041] mr-1.5" />
            保険給付・総合事業
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-[#FFF1E3] text-[#9A3412] border border-[#FBD3AE]">
            <span className="w-2 h-2 rounded-full bg-[#9A3412] mr-1.5" />
            保険外・自費・互助
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB]">
            <span className="w-2 h-2 rounded-full bg-[#9CA3AF] mr-1.5" />
            予定なし
          </span>
        </div>

        <div className="text-xs text-stone-400 shrink-0">
          マス目をクリックするとサービスを差し替えできます
        </div>
      </div>

      {/* 28スロットマトリックス：ヘッダーと4行をひとつのグリッドで揃える */}
      <div className="overflow-x-auto">
        <div
          {...grid.containerProps}
          data-dragging={isLive ? 'true' : undefined}
          data-dnd={draggedSlotId ? 'true' : undefined}
          className={`grid ${GRID_COLS} gap-2 min-w-[1000px] items-stretch ${grid.containerProps.className ?? ''}`}
        >
          {/* --- ヘッダー行 --- */}
          <div className="p-2 text-left text-xs text-stone-400 font-normal self-end">
            時間帯
          </div>
          {DAYS_OF_WEEK.map((d, di) => (
            <div
              key={`head-${d.key}`}
              {...grid.item(di)}
              style={{ ...grid.item(di).style, ['--rv-y' as string]: '6px' }}
              className={`min-w-0 p-2 rounded-lg border text-center text-xs font-bold truncate ${grid.item(di).className} ${
                d.key === 'sat'
                  ? 'bg-sky-50 border-sky-200 text-sky-900'
                  : d.key === 'sun'
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : 'bg-stone-50 border-stone-200 text-stone-800'
              }`}
            >
              {d.label}
            </div>
          ))}

          {/* --- 4時間帯 × 7曜日 --- */}
          {TIME_PERIODS.map((period, pi) => (
            <React.Fragment key={period.key}>
              {/* 行ラベル */}
              <div
                {...grid.item(pi)}
                style={{ ...grid.item(pi).style, ['--rv-y' as string]: '6px' }}
                className={`min-w-0 flex flex-col justify-center p-2 rounded-lg bg-stone-50 border border-stone-200 text-stone-800 ${grid.item(pi).className}`}
              >
                <div className="font-bold text-xs flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                  <span className="truncate">{period.label}</span>
                </div>
                <div className="text-[11px] text-stone-500 mt-0.5 tabular-nums">
                  {period.timeRange}
                </div>
                <div className="text-[11px] text-stone-400 mt-1">
                  基準 {period.nominalHours}h
                </div>
              </div>

              {/* 7曜日分のスロット */}
              {DAYS_OF_WEEK.map((day, dayIndex) => {
                const slotId: SlotId = `${day.key}-${period.key}`;
                const slot = getSlot(slotId);
                if (!slot) return <div key={slotId} className="min-w-0" />;

                const colorConfig = SLOT_COLORS[slot.state];
                const needTag = NEEDS_TAGS.find((t) => t.id === slot.needsTagId);
                const isDragging = draggedSlotId === slotId;

                return (
                  <div
                    key={slotId}
                    role="button"
                    tabIndex={0}
                    aria-label={`${day.label} ${period.label}${
                      needTag ? `：${needTag.name}` : '：空き枠'
                    }${slot.assignedService ? `（${slot.assignedService.name}）` : ''}`}
                    draggable={!!slot.needsTagId}
                    onDragStart={(e) => handleDragStart(e, slotId)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, slotId)}
                    onClick={() => onSlotClick(slot)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSlotClick(slot);
                      }
                    }}
                    title={
                      slot.assignedService
                        ? `${needTag?.name ?? ''}／${slot.assignedService.name}（${slot.assignedService.providerName}）`
                        : needTag?.name
                    }
                    {...grid.item(pi + dayIndex)}
                    style={{
                      ...grid.item(pi + dayIndex).style,
                      ['--rv-y' as string]: '8px',
                      ['--rv-step' as string]: 'var(--stag-tight)',
                      ['--rv-dur' as string]: 'var(--dur-base)',
                    }}
                    className={`min-w-0 overflow-hidden min-h-[88px] p-2.5 rounded-lg border cursor-pointer slot-transition slot-lit lift press-sm slot-droppable flex flex-col justify-between select-none ${colorConfig.cardClass} ${grid.item(pi + dayIndex).className} ${
                      isDragging ? 'slot-dragging' : ''
                    }`}
                  >
                    {/* 主タイトル：サービス名（なければ困りごと名）だけを見せる */}
                    <div className="min-w-0">
                      {slot.assignedService ? (
                        <div className="font-bold text-xs leading-snug line-clamp-3 break-all">
                          {slot.assignedService.name}
                        </div>
                      ) : needTag ? (
                        <div className="font-bold text-xs leading-snug line-clamp-3 break-all">
                          {needTag.name}
                        </div>
                      ) : (
                        <div className="text-[11px] text-stone-400 pt-0.5">空き</div>
                      )}
                    </div>

                    {/* 下段：担い手（色に頼らない補助表記）と価格のみ */}
                    <div className="mt-1.5 flex items-center justify-between gap-1 text-[11px] min-w-0">
                      <span className="truncate opacity-70">
                        {slot.state === 'family' && '家族が担当'}
                        {slot.state === 'insurance' && '保険内'}
                        {slot.state === 'paid' && '保険外'}
                      </span>
                      {slot.cost > 0 && (
                        <span className="font-bold opacity-90 shrink-0 tabular-nums">
                          ¥{Math.round(slot.cost).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};
