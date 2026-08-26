/**
 * このプランで使うサービス一覧
 *
 * 28マスを眺めなくても「結局どのサービスを何回使って、いくらかかるのか」が
 * 分かるように、割り当て済みサービスをまとめて表示します。
 */

'use client';

import React, { useMemo, useState } from 'react';
import { Service, TimelineSlot } from '@/types';
import { SCHEME_LABELS } from '@/utils/colors';

interface ServicePlanListProps {
  slots: TimelineSlot[];
  onSelectSlot: (slot: TimelineSlot) => void;
  /** 「このサービスについて聞く」から相談へ */
  onAskService?: (serviceId: string, serviceName: string) => void;
}

/** 2026-08-20 → 2026年8月20日 */
function formatDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${m[1]}年${Number(m[2])}月${Number(m[3])}日`;
}

/** なぜこの1件が選ばれたのかを、料金と制度から一文で説明する */
function reasonFor(row: PlanRow): string {
  if (row.monthlyCost <= 0) {
    return 'この枠で頼める中でいちばん安い、費用のかからない選択肢です。';
  }
  if (row.service.scheme === 'insurance' || row.service.scheme === 'sogo_jigyo') {
    return '介護保険や総合事業が使えるため、同じ内容を自費で頼むより負担が軽く収まります。';
  }
  if (row.service.scheme === 'municipal_extra') {
    return '自治体の施策として費用の一部が抑えられており、この枠では安いほうの選択肢です。';
  }
  return 'この枠で頼める候補のうち、1回あたりの負担がいちばん軽い組み合わせです。';
}

interface PlanRow {
  service: Service;
  timesPerWeek: number;
  monthlyCost: number;
  firstSlot: TimelineSlot;
}

export const ServicePlanList: React.FC<ServicePlanListProps> = ({ slots, onSelectSlot, onAskService }) => {
  // 一度に開くのは1件だけ
  const [openId, setOpenId] = useState<string | null>(null);
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
    // 仕様どおり「安い順」に並べる
    return [...map.values()].sort((a, b) => a.monthlyCost - b.monthlyCost);
  }, [slots]);

  const total = rows.reduce((sum, r) => sum + r.monthlyCost, 0);

  if (rows.length === 0) {
    return (
      <div className="rounded-[24px] border-2 border-[#2D231E] bg-[#FFF7F2] p-6 text-center text-[14px] font-semibold leading-relaxed text-[#756A64] shadow-[0_4px_0_#2D231E]">
        まだサービスが割り当てられていません。
        <br />
        予算を上げるか、タイムラインのカードから個別に選んでください。
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-[24px] border-2 border-[#2D231E] bg-white shadow-[0_4px_0_#2D231E]">
      <div className="border-b-2 border-[#2D231E] px-6 py-6 sm:px-7">
        <h2 className="font-display text-[22px] font-bold text-[#2D231E]">頼むサービス</h2>
        <p className="mt-1.5 text-[14px] text-[#6E625B] tabular-nums">
          {rows.length} 種類・安い順・合計 ¥{Math.round(total).toLocaleString()}／月
        </p>
      </div>

      <ul>
        {rows.map((row) => {
          const scheme = SCHEME_LABELS[row.service.scheme];
          const isOpen = openId === row.service.id;
          return (
            <li key={row.service.id} className="border-b border-[#E8DCD3] last:border-b-0">
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : row.service.id)}
                aria-expanded={isOpen}
                className={`grid w-full grid-cols-[1fr_auto_auto_28px] items-center gap-4 px-6 py-5 text-left transition-colors sm:gap-5 sm:px-7 ${
                  isOpen ? 'bg-[#FFFBF7]' : 'hover:bg-[#FFF9F5]'
                }`}
              >
                <span className="min-w-0">
                  <span className="block text-[17px] font-bold leading-relaxed text-[#2D231E]">
                    {row.service.name}
                  </span>
                  <span className="mt-1 block text-[13px] text-[#6E625B]">{scheme.label}</span>
                </span>

                <span className="whitespace-nowrap text-right text-[14px] text-[#4A413A]">
                  {row.service.priceModel === 'per_month' ? '月ぎめ' : `週 ${row.timesPerWeek} 回`}
                </span>

                <span className="min-w-[86px] whitespace-nowrap text-right text-[19px] font-bold tabular-nums text-[#B04512]">
                  {row.monthlyCost > 0 ? `¥${Math.round(row.monthlyCost).toLocaleString()}` : '無料'}
                </span>

                <span
                  aria-hidden="true"
                  className="flex h-[26px] w-[26px] items-center justify-center justify-self-end rounded-full bg-[#F3EAE3] transition-transform duration-200"
                  style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6E625B" strokeWidth="3" strokeLinecap="round">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </button>

              {/* 明細（高さを滑らかに開閉する） */}
              <div className="disclosure-collapse" data-open={isOpen ? 'true' : 'false'}>
                <div>
                  <div className="px-6 pb-7 pt-2 sm:px-7">
                    {/* なぜこれが選ばれたか */}
                    <div className="rounded-xl bg-[#FDEFE5] px-5 py-4">
                      <div className="text-[13px] font-bold text-[#B04512]">なぜこれが選ばれたか</div>
                      <p className="mt-2 text-[16px] leading-relaxed text-[#2D231E]">
                        {reasonFor(row)}
                      </p>
                    </div>

                    {/* 内容・事業者・料金の根拠・申込み */}
                    <dl className="mt-6 grid gap-x-10 gap-y-6 sm:grid-cols-2">
                      <div>
                        <dt className="text-[13px] font-bold text-[#8A7F76]">内容</dt>
                        <dd className="mt-1.5 text-[15px] leading-relaxed text-[#2D231E]">
                          {row.service.description}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[13px] font-bold text-[#8A7F76]">事業者</dt>
                        <dd className="mt-1.5 text-[15px] leading-relaxed text-[#2D231E]">
                          {row.service.providerName}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[13px] font-bold text-[#8A7F76]">料金の根拠</dt>
                        <dd className="mt-1.5 text-[15px] leading-relaxed text-[#2D231E]">
                          出典：{row.service.sourceType}（最終確認 {formatDate(row.service.verifiedAt)}）
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[13px] font-bold text-[#8A7F76]">申込み</dt>
                        <dd className="mt-1.5 text-[15px] leading-relaxed text-[#2D231E]">
                          {row.service.applicationRoute}
                        </dd>
                      </div>
                    </dl>

                    <button
                      type="button"
                      onClick={() => (onAskService ? onAskService(row.service.id, row.service.name) : onSelectSlot(row.firstSlot))}
                      className="press mt-6 inline-flex min-h-12 items-center rounded-full border-2 border-[#DCCFC4] bg-white px-6 text-[15px] font-bold text-[#2D231E]"
                    >
                      このサービスについて聞く
                    </button>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
