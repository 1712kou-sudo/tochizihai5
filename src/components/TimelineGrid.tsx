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
import { DayOfWeek, SlotId, SlotState, TimelineSlot } from '@/types';
import { SLOT_COLORS } from '@/utils/colors';
import {
  Check,
  CircleOff,
  Clock,
  LayoutGrid,
  ShieldCheck,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

interface TimelineGridProps {
  slots: TimelineSlot[];
  onSlotClick: (slot: TimelineSlot) => void;
  /** 予算スライダーを操作している最中は色の遷移を短縮してざわつきを抑える */
  isLive?: boolean;
}

/** 時間帯ラベル列 + 曜日7列（必ず等幅） */
const GRID_COLS = 'grid-cols-[76px_repeat(7,minmax(0,1fr))]';

type ResponsibilityFilter = 'all' | SlotState;

interface ResponsibilityFilterOption {
  value: ResponsibilityFilter;
  label: string;
  description: string;
  Icon: LucideIcon;
}

const RESPONSIBILITY_FILTERS: ResponsibilityFilterOption[] = [
  {
    value: 'all',
    label: 'すべて',
    description: 'すべての担い手を表示',
    Icon: LayoutGrid,
  },
  {
    value: 'family',
    label: '家族',
    description: '家族が担当する枠を強調',
    Icon: Users,
  },
  {
    value: 'insurance',
    label: '公的サービス',
    description: '介護保険給付・総合事業の枠を強調',
    Icon: ShieldCheck,
  },
  {
    value: 'paid',
    label: '保険外・自費',
    description: '保険外・自費・互助の枠を強調',
    Icon: Wallet,
  },
  {
    value: 'none',
    label: '予定なし',
    description: '予定が入っていない枠を強調',
    Icon: CircleOff,
  },
];

export const TimelineGrid: React.FC<TimelineGridProps> = ({
  slots,
  onSlotClick,
  isLive = false,
}) => {
  const [draggedSlotId, setDraggedSlotId] = useState<SlotId | null>(null);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('mon');
  const [responsibilityFilter, setResponsibilityFilter] =
    useState<ResponsibilityFilter>('all');
  // 28マスをスクロール到達時に波打つように出す
  const grid = useReveal<HTMLDivElement>();

  const responsibilityCounts = slots.reduce<Record<SlotState, number>>(
    (counts, slot) => {
      counts[slot.state] += 1;
      return counts;
    },
    { family: 0, insurance: 0, paid: 0, none: 0 },
  );

  const selectedFilterOption = RESPONSIBILITY_FILTERS.find(
    (option) => option.value === responsibilityFilter,
  ) ?? RESPONSIBILITY_FILTERS[0];
  const selectedFilterCount = responsibilityFilter === 'all'
    ? slots.length
    : responsibilityCounts[responsibilityFilter];

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

  const responsibilityLabel = (slot: TimelineSlot) => {
    if (slot.state === 'family') return '家族が担当';
    if (slot.state === 'insurance') return '公的サービス';
    if (slot.state === 'paid') return '保険外・自費';
    return '予定なし';
  };

  const renderSlotCard = (
    day: (typeof DAYS_OF_WEEK)[number],
    period: (typeof TIME_PERIODS)[number],
    variant: 'desktop' | 'mobile',
    revealIndex?: number,
  ) => {
    const slotId: SlotId = `${day.key}-${period.key}`;
    const slot = getSlot(slotId);
    if (!slot) return <div key={slotId} className="min-w-0" />;

    const colorConfig = SLOT_COLORS[slot.state];
    const needTag = NEEDS_TAGS.find((tag) => tag.id === slot.needsTagId);
    const isDragging = draggedSlotId === slotId;
    const revealItem = variant === 'desktop' && revealIndex !== undefined
      ? grid.item(revealIndex)
      : undefined;
    const stateLabel = responsibilityLabel(slot);
    const StateIcon = RESPONSIBILITY_FILTERS.find(
      (option) => option.value === slot.state,
    )?.Icon ?? CircleOff;
    const isFilteredOut = responsibilityFilter !== 'all'
      && slot.state !== responsibilityFilter;
    const isFilteredIn = responsibilityFilter !== 'all'
      && slot.state === responsibilityFilter;

    return (
      <div
        key={`${variant}-${slotId}`}
        role="button"
        tabIndex={0}
        data-slot-state={slot.state}
        data-filtered-out={isFilteredOut ? 'true' : undefined}
        data-filtered-in={isFilteredIn ? 'true' : undefined}
        aria-label={`${day.label} ${period.label}${
          needTag ? `：${needTag.name}` : '：空き枠'
        }${slot.assignedService ? `（${slot.assignedService.name}）` : ''}。担い手：${stateLabel}`}
        draggable={!!slot.needsTagId}
        onDragStart={(e) => handleDragStart(e, slotId)}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, slotId)}
        onDragEnd={() => setDraggedSlotId(null)}
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
            : needTag?.name ?? stateLabel
        }
        style={
          variant === 'desktop'
            ? {
                ...revealItem?.style,
                ['--rv-y' as string]: '8px',
                ['--rv-step' as string]: 'var(--stag-tight)',
                ['--rv-dur' as string]: 'var(--dur-base)',
              }
            : undefined
        }
        className={`timeline-slot min-w-0 cursor-pointer select-none border-2 slot-transition slot-lit lift press-sm slot-droppable ${colorConfig.cardClass} ${
          variant === 'desktop'
            ? 'min-h-[112px] overflow-hidden rounded-[16px] p-3 flex flex-col justify-between'
            : 'min-h-[132px] rounded-[20px] p-4'
        } ${revealItem?.className ?? ''} ${isDragging ? 'slot-dragging' : ''} ${
          isFilteredIn
            ? 'relative z-10'
            : ''
        }`}
      >
        {variant === 'mobile' && (
          <div className="mb-3 flex items-start justify-between gap-3 border-b-2 border-[#2D231E]/10 pb-3">
            <div>
              <div className="flex items-center gap-2 text-[15px] font-extrabold text-[#2D231E]">
                <Clock className="h-4 w-4 shrink-0 text-[#B94716]" aria-hidden="true" />
                {period.label}
              </div>
              <div className="mt-0.5 text-[13px] font-semibold text-[#756A64] tabular-nums">
                {period.timeRange}
              </div>
            </div>
            <span className={`slot-state-badge inline-flex min-h-8 items-center gap-1.5 rounded-full border-2 px-3 text-[13px] font-extrabold ${colorConfig.badgeClass}`}>
              <StateIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {stateLabel}
            </span>
          </div>
        )}

        <div className="min-w-0">
          {slot.assignedService ? (
            <>
              <div className={`${variant === 'mobile' ? 'text-[16px]' : 'text-[14px]'} font-extrabold leading-snug text-current line-clamp-3 break-words`}>
                {slot.assignedService.name}
              </div>
              <div className={`slot-secondary ${variant === 'mobile' ? 'text-[13px]' : 'text-[12px]'} mt-1 font-semibold opacity-75 line-clamp-1`}>
                {slot.assignedService.providerName}
              </div>
            </>
          ) : needTag ? (
            <div className={`${variant === 'mobile' ? 'text-[16px]' : 'text-[14px]'} font-extrabold leading-snug text-current line-clamp-3 break-words`}>
              {needTag.name}
            </div>
          ) : (
            <div className="pt-0.5 text-[14px] font-bold text-current">予定はありません</div>
          )}
        </div>

        <div className={`${variant === 'mobile' ? 'mt-3' : 'mt-2'} flex min-w-0 items-center justify-between gap-2 text-[13px]`}>
          {variant === 'desktop' ? (
            <span className={`slot-state-badge inline-flex min-w-0 items-center gap-1 rounded-full border px-2 py-1 text-[12px] font-extrabold ${colorConfig.badgeClass}`}>
              <StateIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{stateLabel}</span>
            </span>
          ) : (
            <span className="slot-secondary truncate font-semibold opacity-80">
              {needTag?.name ?? '予定はありません'}
            </span>
          )}
          {slot.cost > 0 && (
            <span className="shrink-0 font-extrabold tabular-nums">
              ¥{Math.round(slot.cost).toLocaleString()}
            </span>
          )}
        </div>
      </div>
    );
  };

  const activeDay = DAYS_OF_WEEK.find((day) => day.key === selectedDay) ?? DAYS_OF_WEEK[0];

  return (
    <section
      aria-labelledby="timeline-title"
      className="rounded-[24px] border-2 border-[#2D231E] bg-white p-4 shadow-[0_4px_0_#2D231E] sm:p-6"
    >
      <div className="mb-5 border-b-2 border-[#2D231E]/10 pb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="timeline-title" className="font-display text-[22px] font-bold leading-tight text-[#2D231E]">
              1週間の担い手
            </h2>
            <p className="mt-1.5 text-[14px] text-[#6E625B]">押すと差し替えできます</p>
          </div>

          {/* 凡例 */}
          <div className="flex flex-wrap gap-3.5">
            {(['family', 'insurance', 'paid', 'none'] as const).map((k) => {
              const tok = SLOT_COLORS[k];
              return (
                <span
                  key={k}
                  className="inline-flex items-center gap-[7px] text-[13px] font-bold text-[#4A413A]"
                >
                  <span
                    className="h-[14px] w-[14px] rounded"
                    style={{
                      background: tok.bgHex,
                      border: `2px ${k === 'none' ? 'dashed' : 'solid'} ${tok.borderHex}`,
                    }}
                  />
                  {tok.label}
                </span>
              );
            })}
          </div>
        </div>

        <div className="no-print mt-5 rounded-[18px] border-2 border-[#D9C9C0] bg-[#FFF7F2] p-3 sm:p-4">
          <div className="mb-3">
            <h3 id="responsibility-filter-title" className="text-[15px] font-extrabold text-[#2D231E]">
              担い手を選んで強調
            </h3>
            <p id="responsibility-filter-help" className="mt-1 text-[13px] font-semibold leading-relaxed text-[#756A64]">
              選んだ担い手だけが目立ち、それ以外は薄く表示されます。
            </p>
          </div>

          <div
            role="group"
            aria-labelledby="responsibility-filter-title"
            aria-describedby="responsibility-filter-help"
            className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap"
          >
            {RESPONSIBILITY_FILTERS.map((option) => {
              const isSelected = responsibilityFilter === option.value;
              const count = option.value === 'all'
                ? slots.length
                : responsibilityCounts[option.value];
              const stateColor = option.value === 'all'
                ? null
                : SLOT_COLORS[option.value];
              const buttonColorClass = isSelected
                ? stateColor?.filterSelectedClass
                  ?? 'border-[#2D231E] bg-[#2D231E] text-white shadow-[0_3px_0_#B94716]'
                : stateColor?.filterIdleClass
                  ?? 'border-[#2D231E] bg-white text-[#2D231E] hover:bg-[#FDE8DC]';
              const FilterIcon = option.Icon;

              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={`${option.description}（${count}枠）`}
                  title={option.description}
                  onClick={() => setResponsibilityFilter(option.value)}
                  className={`inline-flex min-h-12 w-full items-center justify-between gap-2 rounded-full border-2 px-3 text-[13px] font-extrabold transition-[background-color,color,border-color,box-shadow,transform] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B94716] active:translate-y-px sm:w-auto sm:px-4 ${buttonColorClass}`}
                >
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <FilterIcon className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden="true" />
                    <span className="truncate">{option.label}</span>
                    {isSelected && <Check className="h-4 w-4 shrink-0" strokeWidth={3} aria-hidden="true" />}
                  </span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[12px] tabular-nums ${
                    isSelected ? 'bg-black/15 text-inherit' : 'bg-white/70 text-inherit'
                  }`}>
                    {count}枠
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex min-h-11 flex-wrap items-center justify-between gap-2 border-t border-[#D9C9C0] pt-3">
            <p aria-live="polite" className="text-[13px] font-bold text-[#5E514A]">
              {responsibilityFilter === 'all'
                ? `1週間のすべての担い手（${selectedFilterCount}枠）を表示中`
                : `${selectedFilterOption.label}を1週間で${selectedFilterCount}枠強調表示中`}
            </p>
            {responsibilityFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setResponsibilityFilter('all')}
                className="min-h-11 rounded-full px-3 text-[13px] font-extrabold text-[#9D3D12] underline decoration-2 underline-offset-4 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B94716]"
              >
                絞り込みを解除
              </button>
            )}
          </div>
        </div>
      </div>

      {/* スマホ：曜日を選び、1日分の4時間帯を縦に表示 */}
      <div className="xl:hidden">
        <div className="mb-4">
          <p className="mb-2 text-[13px] font-extrabold text-[#2D231E]">表示する曜日</p>
          <div className="grid grid-cols-7 gap-1" role="group" aria-label="表示する曜日を選択">
            {DAYS_OF_WEEK.map((day) => {
              const isSelected = day.key === selectedDay;
              return (
                <button
                  key={`mobile-tab-${day.key}`}
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={`${day.label}を表示`}
                  onClick={() => setSelectedDay(day.key)}
                  className={`min-h-11 rounded-[14px] border-2 px-1 text-[14px] font-extrabold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B94716] ${
                    isSelected
                      ? 'border-[#2D231E] bg-[#ED6A2C] text-[#2D231E] shadow-[0_3px_0_#2D231E]'
                      : 'border-[#D9C9C0] bg-[#FFF7F2] text-[#5E4D45] hover:border-[#ED6A2C] hover:bg-[#FDE8DC]'
                  }`}
                >
                  {day.shortLabel}
                </button>
              );
            })}
          </div>
        </div>

        <div
          id="mobile-day-panel"
          aria-label={`${activeDay.label}の予定`}
          data-dragging={isLive ? 'true' : undefined}
          data-dnd={draggedSlotId ? 'true' : undefined}
        >
          <h3 className="mb-3 text-[18px] font-extrabold text-[#2D231E]">
            {activeDay.label}のケア予定
          </h3>
          <div className="space-y-3">
            {TIME_PERIODS.map((period) => renderSlotCard(activeDay, period, 'mobile'))}
          </div>
        </div>
      </div>

      {/* PC：7日 × 4時間帯の28スロットを一枚のカード内に表示 */}
      <div className="hidden overflow-x-auto pb-1 xl:block">
        <div
          {...grid.containerProps}
          data-dragging={isLive ? 'true' : undefined}
          data-dnd={draggedSlotId ? 'true' : undefined}
          className={`grid ${GRID_COLS} min-w-[860px] items-stretch gap-2 ${grid.containerProps.className ?? ''}`}
        >
          <div className="self-end p-2 text-left text-[13px] font-extrabold text-[#756A64]">
            時間帯
          </div>
          {DAYS_OF_WEEK.map((day, dayIndex) => (
            <div
              key={`head-${day.key}`}
              {...grid.item(dayIndex)}
              style={{ ...grid.item(dayIndex).style, ['--rv-y' as string]: '6px' }}
              className={`min-w-0 truncate rounded-[14px] border-2 border-[#2D231E] bg-[#FFF7F2] px-2 py-3 text-center text-[14px] font-extrabold text-[#2D231E] ${grid.item(dayIndex).className}`}
            >
              {day.label}
            </div>
          ))}

          {TIME_PERIODS.map((period, periodIndex) => (
            <React.Fragment key={period.key}>
              <div
                {...grid.item(7 + periodIndex * 8)}
                style={{ ...grid.item(7 + periodIndex * 8).style, ['--rv-y' as string]: '6px' }}
                className={`min-w-0 rounded-[16px] border-2 border-[#2D231E] bg-[#FDE8DC] p-3 text-[#2D231E] ${grid.item(7 + periodIndex * 8).className}`}
              >
                <div className="flex items-center gap-1.5 text-[14px] font-extrabold">
                  <Clock className="h-4 w-4 shrink-0 text-[#B94716]" aria-hidden="true" />
                  <span className="truncate">{period.label}</span>
                </div>
                <div className="mt-1 text-[13px] font-semibold text-[#756A64] tabular-nums">
                  {period.timeRange}
                </div>
                <div className="mt-1 text-[13px] text-[#756A64]">
                  基準 {period.nominalHours}h
                </div>
              </div>

              {DAYS_OF_WEEK.map((day, dayIndex) =>
                renderSlotCard(day, period, 'desktop', 8 + periodIndex * 8 + dayIndex),
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
};
