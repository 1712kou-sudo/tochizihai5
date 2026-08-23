/**
 * 保険内外の境界説明カード コンポーネント
 * 
 * 訪問介護の生活援助における同居家族制限、通院等乗降介助と院内介助の境界、
 * 草むしり・ペットの世話など保険外自費サービスの境界ルールを自動判定してわかりやすく解説します。
 */

'use client';

import React from 'react';
import { RESTRICTION_RULES } from '@/constants/careConstants';
import { CareLevel, HouseholdType } from '@/types';
import { HelpCircle, AlertCircle, Info, CheckCircle2, XCircle } from 'lucide-react';

interface RestrictionGuideProps {
  selectedNeedIds: string[];
  householdType: HouseholdType;
  careLevel: CareLevel;
}

export const RestrictionGuide: React.FC<RestrictionGuideProps> = ({
  selectedNeedIds,
  householdType,
  careLevel,
}) => {
  // 選択された困りごとに関連する境界ルールを抽出
  const activeRules = RESTRICTION_RULES.filter((rule) =>
    selectedNeedIds.includes(rule.needsTagId)
  );

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
      <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
        <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
          <HelpCircle className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-base text-slate-900">
            制度の境界線ガイド（保険でできること／自費になること）
          </h3>
          <p className="text-xs text-slate-500">
            ケアマネジャーや自治体への相談時に役立つ「保険適用の可否」と「自費サービスの活用ポイント」です。
          </p>
        </div>
      </div>

      {/* 世帯状況に応じた特記事項 */}
      {householdType === 'living_together' && (
        <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-start space-x-3 text-xs text-amber-900">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">同居家族がいらっしゃる場合の注意点</span>
            <p className="leading-relaxed text-amber-800">
              同居家族がいる世帯では、原則として介護保険の「生活援助（掃除・洗濯・調理・買い物）」は算定できません。家族の就労や疾病等による「やむを得ない事情」の認定が必要となります。そのため、<strong>シルバー人材センター（1時間約1,350円）</strong>や<strong>民間家事代行（自費）</strong>の組み合わせが大変有効です。
            </p>
          </div>
        </div>
      )}

      {/* ルール一覧 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeRules.map((rule) => {
          return (
            <div
              key={rule.id}
              className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-bold text-xs text-slate-900">{rule.title}</div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    rule.isCovered === 'covered'
                      ? 'bg-emerald-100 text-emerald-800'
                      : rule.isCovered === 'conditional'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {rule.isCovered === 'covered' && '保険適用可能'}
                  {rule.isCovered === 'conditional' && '条件付き適用'}
                  {rule.isCovered === 'not_covered' && '全額自費'}
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {rule.conditionText}
              </p>

              <div className="text-[11px] text-slate-500 bg-white p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                💡 {rule.explanation}
              </div>

              <div className="text-[9px] text-slate-400 font-mono">
                根拠: {rule.officialSource}
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-[11px] text-slate-500 italic bg-slate-50 p-3 rounded-xl border border-slate-100">
        ※ 実際のサービス利用可否や給付算定については、市区町村の地域包括支援センターまたは担当ケアマネジャーにご確認ください。
      </div>
    </div>
  );
};
