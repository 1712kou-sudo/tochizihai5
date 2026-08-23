/**
 * スロット詳細 ＆ サービス候補差し替えモーダル
 * 
 * 指定されたスロット（例: 月曜・日中）に適合する保険内外のサービス候補一覧を表示し、
 * 出典URL・原文抜粋・削減時間を確認しながら手動で差し替えが可能です。
 * また家族担当者の名前（「長女」「長男」など）も編集できます。
 */

'use client';

import React, { useState } from 'react';
import { DAYS_OF_WEEK, NEEDS_TAGS, TIME_PERIODS } from '@/constants/careConstants';
import { CareLevel, HouseholdType, Service, TimelineSlot } from '@/types';
import { SCHEME_LABELS, SLOT_COLORS } from '@/utils/colors';
import { getCandidatesForSlot } from '@/utils/timelineEngine';
import {
  X,
  ExternalLink,
  Check,
  Sparkles,
  Clock,
  ShieldCheck,
  User,
  AlertCircle,
  HelpCircle,
  Building,
} from 'lucide-react';

interface SlotDetailModalProps {
  slot: TimelineSlot | null;
  careLevel: CareLevel;
  householdType: HouseholdType;
  onClose: () => void;
  onSelectService: (service: Service | null) => void;
  onUpdatePerson: (personName: string) => void;
}

export const SlotDetailModal: React.FC<SlotDetailModalProps> = ({
  slot,
  careLevel,
  householdType,
  onClose,
  onSelectService,
  onUpdatePerson,
}) => {
  if (!slot) return null;

  const [personName, setPersonName] = useState<string>(slot.assignedPerson || '');
  const dayLabel = DAYS_OF_WEEK.find((d) => d.key === slot.day)?.label || '';
  const periodObj = TIME_PERIODS.find((p) => p.key === slot.period);
  const needTag = NEEDS_TAGS.find((t) => t.id === slot.needsTagId);

  // 候補サービスを検索
  const candidates: Service[] = slot.needsTagId
    ? getCandidatesForSlot(slot.day, slot.period, slot.needsTagId, careLevel, householdType)
    : [];

  const handleSavePerson = () => {
    onUpdatePerson(personName);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto no-print">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* モーダルヘッダー */}
        <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-teal-400 font-semibold">
                {dayLabel} ・ {periodObj?.label}（{periodObj?.timeRange}）
              </div>
              <h3 className="text-lg font-bold">
                {needTag ? needTag.name : '困りごとが未登録のスロット'}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* モーダル本文 */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* 現在の状態 ＆ 担当者設定 */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-slate-600">現在の担い手:</span>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-md border ${
                    SLOT_COLORS[slot.state].badgeClass
                  }`}
                >
                  {SLOT_COLORS[slot.state].label}
                </span>
              </div>
              <div className="text-xs text-slate-500 font-mono">
                実負担時間: <strong>{slot.effectiveHours} 時間</strong>
              </div>
            </div>

            {/* 担当者名の設定（ブラウザ保持） */}
            <div className="pt-2 border-t border-slate-200 flex items-center space-x-2">
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="担当者メモ（例: 長女、長男、ヘルパー）"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                onBlur={handleSavePerson}
                className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-teal-600 bg-white"
              />
              <button
                type="button"
                onClick={handleSavePerson}
                className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-all"
              >
                保存
              </button>
            </div>
          </div>

          {/* サービス候補一覧 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-teal-600" />
                <span>この枠を肩代わりできるサービス候補（{candidates.length}件）</span>
              </h4>
              <button
                onClick={() => onSelectService(null)}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold underline"
              >
                家族担当（自力）に戻す
              </button>
            </div>

            {candidates.length === 0 ? (
              <div className="p-6 rounded-2xl bg-amber-50/70 border border-amber-200 text-center space-y-3">
                <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
                <div>
                  <div className="text-sm font-bold text-amber-900">
                    この時間帯に該当するサービスが登録されていません
                  </div>
                  <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                    平日夜間や休日早朝など、サービス提供事業者が不足している時間帯です。
                    この需要は匿名ログとして記録され、自治体向けのサービス拡充要望ヒートマップに反映されます。
                  </p>
                </div>
                <div className="text-[11px] text-slate-600 bg-white p-3 rounded-xl border border-amber-200 inline-block text-left">
                  <strong>相談窓口</strong>: お近くの地域包括支援センター（あんしんすこやかセンター）または担当ケアマネジャーにご相談ください。
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {candidates.map((srv) => {
                  const isAssigned = slot.assignedService?.id === srv.id;
                  const schemeInfo = SCHEME_LABELS[srv.scheme];

                  return (
                    <div
                      key={srv.id}
                      className={`p-4 rounded-2xl border-2 transition-all ${
                        isAssigned
                          ? 'border-teal-600 bg-teal-50/50 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {/* 上部: サービス名 ＆ スキームバッジ */}
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${schemeInfo.badgeColor}`}
                            >
                              {schemeInfo.label}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                              {srv.providerName}
                            </span>
                          </div>
                          <div className="font-bold text-sm text-slate-900 mt-1">
                            {srv.name}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onSelectService(srv)}
                          className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            isAssigned
                              ? 'bg-teal-600 text-white shadow-xs'
                              : 'bg-white border border-slate-300 hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          {isAssigned ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>割り当て中</span>
                            </>
                          ) : (
                            <span>このサービスを適用</span>
                          )}
                        </button>
                      </div>

                      {/* 説明 */}
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                        {srv.description}
                      </p>

                      {/* 費用 ＆ 家族時間削減効果 */}
                      <div className="mt-3 pt-2 border-t border-slate-200/60 grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-white/80 p-2 rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-500 block">自己負担目安</span>
                          <span className="font-bold text-slate-900">
                            {srv.price === 0 ? '無料' : `約 ${srv.price.toLocaleString()} 円 / 回`}
                          </span>
                        </div>
                        <div className="bg-white/80 p-2 rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-500 block">家族時間の削減</span>
                          <span className="font-bold text-emerald-700">
                            1回あたり {srv.reductionHours} 時間
                          </span>
                        </div>
                      </div>

                      {/* 出典 ＆ 根拠情報（厳格な出所管理） */}
                      <div className="mt-2.5 pt-2 border-t border-dashed border-slate-200 flex flex-wrap items-center justify-between text-[10px] text-slate-500 gap-2">
                        <div className="flex items-center space-x-2">
                          <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                          <span>
                            確認日: <strong>{srv.verifiedAt}</strong> ({srv.verifiedBy})
                          </span>
                          <span>信頼度: {(srv.confidenceScore * 100).toFixed(0)}%</span>
                        </div>

                        {srv.sourceUrl && (
                          <a
                            href={srv.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-1 text-teal-700 hover:text-teal-900 font-semibold underline"
                          >
                            <span>公式根拠</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>

                      {/* 原文スニペット */}
                      {srv.priceSourceSnippet && (
                        <div className="mt-1.5 p-1.5 rounded-lg bg-slate-100/70 text-[10px] text-slate-600 font-mono">
                          抜粋: 「{srv.priceSourceSnippet}」
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* モーダルフッター */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
