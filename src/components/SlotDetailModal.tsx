/**
 * スロット詳細 ＆ サービス候補差し替えモーダル
 * 
 * 指定されたスロット（例: 月曜・日中）に適合する保険内外のサービス候補一覧を表示し、
 * 出典URL・原文抜粋・削減時間を確認しながら手動で差し替えが可能です。
 * また家族担当者の名前（「長女」「長男」など）も編集できます。
 */

'use client';

import React, { useRef, useState } from 'react';
import { useDelayedValue } from '@/hooks/useDelayedUnmount';
import { useDialogFocus } from '@/hooks/useDialogFocus';
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
  CalendarPlus,
  Trash2,
  Pencil,
} from 'lucide-react';

interface SlotDetailModalProps {
  slot: TimelineSlot | null;
  careLevel: CareLevel;
  householdType: HouseholdType;
  onClose: () => void;
  onSelectService: (service: Service | null) => void;
  onUpdatePerson: (personName: string) => void;
  /** この枠の予定（困りごと）を差し替える。null を渡すと空き枠に戻す */
  onChangeNeed: (needId: string | null) => void;
}

/** 予定ピッカーのカテゴリ表示順 */
const NEEDS_CATEGORY_ORDER: { key: string; label: string }[] = [
  { key: 'housework', label: '家事' },
  { key: 'physical_care', label: '身体介護' },
  { key: 'monitoring', label: '見守り・安否確認' },
  { key: 'outing', label: '外出の付き添い' },
  { key: 'social', label: '社会参加・つながり' },
  { key: 'housing', label: '住まい・環境' },
  { key: 'family_rest', label: '家族の休息' },
];

type SlotDetailModalInnerProps = Omit<SlotDetailModalProps, 'slot'> & {
  slot: TimelineSlot;
  panelState: 'open' | 'closing';
};

/**
 * スロット未選択のときは何も描画しないラッパー。
 * フックを持たないので、ここでの早期 return は安全です。
 */
export const SlotDetailModal: React.FC<SlotDetailModalProps> = ({ slot, ...rest }) => {
  // 閉じる動きを見せるため、slot が null になっても少しだけ直前の内容を残す
  const { shown, state } = useDelayedValue(slot);

  if (!shown) return null;
  // key を渡すことで、対象スロットが変わったら担当者メモの入力状態をリセットする
  return <SlotDetailModalInner key={shown.id} slot={shown} panelState={state} {...rest} />;
};

const SlotDetailModalInner: React.FC<SlotDetailModalInnerProps> = ({
  slot,
  careLevel,
  householdType,
  onClose,
  onSelectService,
  onUpdatePerson,
  onChangeNeed,
  panelState,
}) => {
  const [personName, setPersonName] = useState<string>(slot.assignedPerson || '');
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(panelState === 'open', onClose, dialogRef);
  // 空き枠に予定を入れる／既存の予定を変更するピッカーの開閉
  const [isNeedPickerOpen, setIsNeedPickerOpen] = useState<boolean>(!slot.needsTagId);
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
    <div
      className="scrim fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto no-print"
      data-state={panelState}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="panel glass-solid w-full max-w-2xl overflow-hidden rounded-[28px] border-2 border-stone-900"
        data-state={panelState}
        role="dialog"
        aria-modal="true"
        aria-labelledby="slot-detail-title"
      >
        {/* モーダルヘッダー */}
        <div className="flex items-center justify-between gap-4 border-b-2 border-stone-900 bg-orange-100 px-5 py-5 sm:px-6">
          <div className="flex items-center space-x-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-stone-900 bg-white text-orange-800">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[13px] text-orange-800 font-bold">
                {dayLabel} ・ {periodObj?.label}（{periodObj?.timeRange}）
              </div>
              <h3 id="slot-detail-title" className="text-lg sm:text-xl font-extrabold text-stone-900">
                {needTag ? needTag.name : 'この枠は空いています'}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="詳細画面を閉じる"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-stone-900 bg-white text-stone-700 hover:bg-orange-50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* モーダル本文 */}
        <div className="max-h-[75vh] space-y-6 overflow-y-auto p-5 sm:p-6">
          {/* この枠の予定（困りごと）の設定 */}
          <div className="overflow-hidden rounded-[20px] border-2 border-stone-900">
            <div className="flex items-center justify-between gap-3 border-b-2 border-stone-200 bg-stone-50 px-4 py-3">
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-stone-500">この枠の予定</div>
                <div className="text-sm sm:text-base font-extrabold text-stone-900 truncate">
                  {needTag ? needTag.name : '予定なし（空き）'}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {slot.needsTagId && (
                  <button
                    type="button"
                    onClick={() => onChangeNeed(null)}
                    className="inline-flex min-h-11 items-center gap-1 px-3 rounded-xl border-2 border-stone-300 text-stone-700 hover:bg-orange-50 text-[13px] font-bold transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    空きにする
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsNeedPickerOpen((v) => !v)}
                  aria-expanded={isNeedPickerOpen}
                  className={`inline-flex min-h-11 items-center gap-1 px-3 rounded-xl border-2 text-[13px] font-bold transition-colors ${
                    slot.needsTagId
                      ? 'border-stone-300 text-stone-700 hover:bg-orange-50'
                      : 'border-stone-900 bg-orange-600 text-white hover:bg-orange-800'
                  }`}
                >
                  {slot.needsTagId ? (
                    <>
                      <Pencil className="w-3.5 h-3.5" />
                      変更
                    </>
                  ) : (
                    <>
                      <CalendarPlus className="w-3.5 h-3.5" />
                      予定を入れる
                    </>
                  )}
                </button>
              </div>
            </div>

            {isNeedPickerOpen && (
              <div className="p-4 space-y-3 max-h-[220px] overflow-y-auto">
                <p className="text-sm leading-relaxed text-stone-600">
                  この時間帯に発生する困りごとを選ぶと、条件に合うサービスを探し直します。
                </p>
                {NEEDS_CATEGORY_ORDER.map((cat) => {
                  const tags = NEEDS_TAGS.filter((t) => t.category === cat.key);
                  if (tags.length === 0) return null;
                  return (
                    <div key={cat.key}>
                      <div className="text-[13px] font-bold text-stone-600 mb-2">
                        {cat.label}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {tags.map((tag) => {
                          const isCurrent = slot.needsTagId === tag.id;
                          return (
                            <button
                              key={tag.id}
                              type="button"
                              title={tag.description}
                              onClick={() => onChangeNeed(tag.id)}
                              aria-pressed={isCurrent}
                              className={`inline-flex min-h-11 items-center gap-1 px-3 py-2 rounded-xl border-2 text-[13px] transition-colors ${
                                isCurrent
                                  ? 'border-orange-600 bg-orange-50 text-orange-900 font-bold'
                                  : 'border-stone-300 text-stone-700 hover:bg-stone-50'
                              }`}
                            >
                              {isCurrent && <Check className="w-3 h-3 text-orange-600" />}
                              {tag.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 現在の状態 ＆ 担当者設定 */}
          <div className="space-y-3 rounded-[20px] border-2 border-stone-900 bg-stone-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <span className="text-[13px] font-bold text-stone-600">現在の担い手:</span>
                <span
                  className={`text-[13px] font-bold px-3 py-1.5 rounded-full border-2 ${
                    SLOT_COLORS[slot.state].badgeClass
                  }`}
                >
                  {SLOT_COLORS[slot.state].label}
                </span>
              </div>
              <div className="text-[13px] text-stone-600 font-semibold tabular-nums">
                実負担時間: <strong>{slot.effectiveHours} 時間</strong>
              </div>
            </div>

            {/* 担当者名の設定（ブラウザ保持） */}
            <div className="pt-3 border-t-2 border-stone-200 flex items-center space-x-2">
              <User className="w-4 h-4 text-stone-400 shrink-0" />
              <input
                type="text"
                placeholder="担当者メモ（例: 長女、長男、ヘルパー）"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                onBlur={handleSavePerson}
                className="min-h-11 flex-1 rounded-xl border-2 border-stone-300 bg-white px-3 text-sm focus:border-orange-700 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSavePerson}
                className="min-h-11 px-4 rounded-xl border-2 border-stone-900 bg-white hover:bg-orange-50 text-stone-800 text-[13px] font-bold transition-colors"
              >
                保存
              </button>
            </div>
          </div>

          {/* サービス候補一覧（予定がある枠のみ） */}
          {slot.needsTagId && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm sm:text-base font-extrabold text-stone-900 flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-orange-600" />
                <span>この枠を肩代わりできるサービス候補（{candidates.length}件）</span>
              </h4>
              <button
                onClick={() => onSelectService(null)}
                className="min-h-11 px-2 text-[13px] text-orange-800 hover:text-orange-900 font-bold underline underline-offset-4"
              >
                家族担当（自力）に戻す
              </button>
            </div>

            {candidates.length === 0 ? (
              <div className="p-6 rounded-[20px] bg-orange-50 border-2 border-orange-300 text-center space-y-3">
                <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
                <div>
                  <div className="text-sm sm:text-base font-extrabold text-orange-900">
                    この時間帯に該当するサービスが登録されていません
                  </div>
                  <p className="text-sm text-stone-600 mt-2 leading-relaxed">
                    平日夜間や休日早朝など、サービス提供事業者が不足している時間帯です。
                    この需要は匿名ログとして記録され、自治体向けのサービス拡充要望ヒートマップに反映されます。
                  </p>
                </div>
                <div className="text-[13px] text-stone-600 bg-white p-3 rounded-xl border-2 border-orange-200 inline-block text-left leading-relaxed">
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
                      className={`p-4 rounded-[20px] border-2 transition-all ${
                        isAssigned
                          ? 'border-stone-900 bg-orange-50 shadow-[0_3px_0_#251B17]'
                          : 'border-stone-300 hover:border-stone-900 hover:bg-stone-50'
                      }`}
                    >
                      {/* 上部: サービス名 ＆ スキームバッジ */}
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span
                              className={`text-[13px] font-bold px-2.5 py-1 rounded-full border-2 ${schemeInfo.badgeColor}`}
                            >
                              {schemeInfo.label}
                            </span>
                            <span className="text-[13px] text-stone-500 font-semibold">
                              {srv.providerName}
                            </span>
                          </div>
                          <div className="font-extrabold text-sm sm:text-base text-stone-900 mt-1.5">
                            {srv.name}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onSelectService(srv)}
                          className={`flex min-h-11 items-center space-x-1 px-3 py-2 rounded-xl border-2 text-[13px] font-bold transition-colors ${
                            isAssigned
                              ? 'border-stone-900 bg-orange-600 text-white'
                              : 'bg-white border-stone-300 hover:border-stone-900 hover:bg-orange-50 text-stone-700'
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
                      <p className="text-sm text-stone-600 mt-3 leading-relaxed">
                        {srv.description}
                      </p>

                      {/* 費用 ＆ 家族時間削減効果 */}
                      <div className="mt-3 pt-3 border-t-2 border-stone-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[13px]">
                        <div className="bg-stone-50 p-3 rounded-xl border-2 border-stone-200">
                          <span className="text-[13px] text-stone-500 block">自己負担目安</span>
                          <span className="font-bold text-stone-900">
                            {srv.price === 0 ? '無料' : `約 ${srv.price.toLocaleString()} 円 / 回`}
                          </span>
                        </div>
                        <div className="bg-stone-50 p-3 rounded-xl border-2 border-stone-200">
                          <span className="text-[13px] text-stone-500 block">家族時間の削減</span>
                          <span className="font-bold text-emerald-700">
                            1回あたり {srv.reductionHours} 時間
                          </span>
                        </div>
                      </div>

                      {/* 出典 ＆ 根拠情報（厳格な出所管理） */}
                      <div className="mt-3 pt-3 border-t-2 border-dashed border-stone-200 flex flex-wrap items-center justify-between text-[13px] text-stone-500 gap-2">
                        <div className="flex items-center space-x-2">
                          <ShieldCheck className="w-3.5 h-3.5 text-orange-600" />
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
                            className="inline-flex min-h-11 items-center space-x-1 rounded-lg px-2 text-orange-800 hover:text-orange-900 font-bold underline underline-offset-4"
                          >
                            <span>公式根拠</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>

                      {/* 原文スニペット */}
                      {srv.priceSourceSnippet && (
                        <div className="mt-2 p-2.5 rounded-xl bg-stone-100 text-[12px] leading-relaxed text-stone-600 font-mono">
                          抜粋: 「{srv.priceSourceSnippet}」
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          )}
        </div>

        {/* モーダルフッター */}
        <div className="bg-stone-50 border-t-2 border-stone-900 px-6 py-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 px-6 py-2 rounded-xl bg-stone-900 hover:bg-orange-800 text-white text-sm font-bold transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
