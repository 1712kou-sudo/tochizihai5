/**
 * このプランで使うサービス一覧
 *
 * 28マスを眺めなくても「結局どのサービスを何回使って、いくらかかるのか」が
 * 分かるように、割り当て済みサービスをまとめて表示します。
 */

'use client';

import React, { useMemo } from 'react';
import { useReveal } from '@/hooks/useReveal';
import { Service, TimelineSlot } from '@/types';
import { SCHEME_LABELS } from '@/utils/colors';
import { ExternalLink } from 'lucide-react';

interface ServicePlanListProps {
  slots: TimelineSlot[];
  onSelectSlot: (slot: TimelineSlot) => void;
}

interface PlanRow {
  service: Service;
  timesPerWeek: number;
  monthlyCost: number;
  firstSlot: TimelineSlot;
}

export const ServicePlanList: React.FC<ServicePlanListProps> = ({ slots, onSelectSlot }) => {
  const list = useReveal<HTMLUListElement>();
  const rows = useMemo<PlanRow[]>(() => {
    const map = new Map<string, PlanRow>();
    for (const slot of slots) {
      const svc = slot.assignedService;
      if (!svc) continue;
      const existing = map.get(svc.id);
      if (existing) {
        existing.timesPerWeek += 1;
        existing.monthlyCost += slot.cost;
      } else {
        map.set(svc.id, {
          service: svc,
          timesPerWeek: 1,
          monthlyCost: slot.cost,
          firstSlot: slot,
        });
      }
    }
    return [...map.values()].sort((a, b) => b.monthlyCost - a.monthlyCost);
  }, [slots]);

  const total = rows.reduce((sum, r) => sum + r.monthlyCost, 0);

  if (rows.length === 0) {
    return (
      <div className="glass rounded-xl border border-stone-200 p-6 text-center text-sm text-stone-500">
        まだサービスが割り当てられていません。予算を上げるか、マス目から個別に選んでください。
      </div>
    );
  }

  return (
    <div className="glass rounded-xl border border-stone-200 overflow-hidden">
      <div className="px-4 sm:px-5 py-3 border-b border-stone-200 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-bold text-stone-900">
          このプランで使うサービス
          <span className="ml-2 text-xs font-normal text-stone-500 tabular-nums">
            {rows.length} 種類
          </span>
        </h2>
        <span className="text-xs text-stone-500 shrink-0">
          合計{' '}
          <strong className="text-stone-900 tabular-nums">¥{total.toLocaleString()}</strong> /月
        </span>
      </div>

      <ul
        {...list.containerProps}
        className={`divide-y divide-stone-100 ${list.containerProps.className ?? ''}`}
      >
        {rows.map((row, i) => {
          const scheme = SCHEME_LABELS[row.service.scheme];
          return (
            <li
              key={row.service.id}
              {...list.item(i)}
              style={{ ...list.item(i).style, ['--rv-y' as string]: '8px', ['--rv-step' as string]: 'var(--stag-base)', ['--rv-dur' as string]: 'var(--dur-base)' }}
              className={list.item(i).className}
            >
              <button
                type="button"
                onClick={() => onSelectSlot(row.firstSlot)}
                className="press w-full text-left px-4 sm:px-5 py-3.5 hover:bg-stone-50 transition-colors flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md border shrink-0 ${scheme.badgeColor}`}
                    >
                      {scheme.label}
                    </span>
                    <span className="text-[11px] text-stone-500 truncate">
                      {row.service.providerName}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-stone-900 leading-snug">
                    {row.service.name}
                  </div>
                </div>

                <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                  <div className="text-right">
                    <div className="text-[11px] text-stone-500">週の回数</div>
                    <div className="text-sm font-bold text-stone-900 tabular-nums">
                      {row.timesPerWeek} 回
                    </div>
                  </div>
                  <div className="text-right min-w-[76px]">
                    <div className="text-[11px] text-stone-500">月あたり</div>
                    <div className="text-sm font-bold text-stone-900 tabular-nums">
                      {row.monthlyCost > 0 ? `¥${Math.round(row.monthlyCost).toLocaleString()}` : '無料'}
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-stone-300 hidden sm:block" />
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
