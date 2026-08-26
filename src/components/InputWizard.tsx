/**
 * 入力ウィザード（3ステップ）
 *
 * 1. ご本人のこと   … 要介護認定の区分 ＋ 世帯
 * 2. 困っていること … ケアの種類ごとにまとめたタグ選択
 * 3. 月に出せる金額 … 上限スライダー ＋ 相場の目安
 *
 * 曜日・時間帯は選んだ内容から自動で埋め、次のタイムライン画面の
 * マス目から直せるようにしている（デザイン仕様に合わせた構成）。
 */

'use client';

import React, { useState } from 'react';
import { CARE_LEVEL_LIMITS, DAYS_OF_WEEK, NEEDS_TAGS, TIME_PERIODS } from '@/constants/careConstants';
import { CareLevel, DayOfWeek, HouseholdType, NeedsCategory, SlotId, UserInputData } from '@/types';

const INK = '#2D231E';
const PRIMARY = '#C4511A';
const SUB = '#6E625B';

interface InputWizardProps {
  initialData: UserInputData;
  onSubmit: (data: UserInputData) => void;
  onLoadDemo: () => void;
}

/* ---------- 選択肢 ---------- */
const CARE_ORDER: CareLevel[] = [
  'unapplied', 'unknown', 'support_1', 'support_2',
  'care_1', 'care_2', 'care_3', 'care_4', 'care_5',
];
const CARE_SHORT: Record<CareLevel, string> = {
  unapplied: 'まだ申請していない',
  unknown: '区分がわからない',
  support_1: '要支援1',
  support_2: '要支援2',
  care_1: '要介護1',
  care_2: '要介護2',
  care_3: '要介護3',
  care_4: '要介護4',
  care_5: '要介護5',
};

const HOUSEHOLDS: { id: HouseholdType; title: string; desc: string }[] = [
  { id: 'single', title: '独居（一人暮らし）', desc: '日中の安否確認・配食・見守りが最優先になります。' },
  { id: 'elderly_only', title: '高齢者のみ世帯', desc: '重い家事や通院、夜間の見守りを外部に頼る必要があります。' },
  { id: 'living_together', title: '同居家族あり', desc: '保険の生活援助に制限があるため、保険外サービスの併用が有効です。' },
  { id: 'long_distance', title: '遠距離介護', desc: '遠隔の見守り、緊急駆けつけ、訪問代行が中心になります。' },
];

const NEEDS_CATEGORIES: { key: NeedsCategory; label: string; hint: string }[] = [
  { key: 'housework', label: '家事', hint: '調理・掃除・洗濯・買い物' },
  { key: 'physical_care', label: '身体介護', hint: '入浴・排泄・服薬・着替え' },
  { key: 'monitoring', label: '見守り・安否確認', hint: '日中の声かけ／夜間の不安' },
  { key: 'outing', label: '外出の付き添い', hint: '通院・買い物・手続き' },
  { key: 'social', label: '社会参加・つながり', hint: 'デイサービス・話し相手' },
  { key: 'housing', label: '住まい・環境', hint: '庭木・軽作業・寝具' },
  { key: 'family_rest', label: '家族の休息', hint: 'レスパイト・相談' },
];

/** 金額を決める前に見せる相場 */
const MARKET_RATES = [
  { label: 'ボランティアのゴミ出し・声かけ', price: '無料' },
  { label: '区の配食サービス（安否確認つき）', price: '1食 500円' },
  { label: 'シルバー人材センターの家事援助', price: '1時間 1,350円' },
  { label: '見守りセンサー（セコム）', price: '月 4,950円' },
  { label: '夜間の宿泊見守り', price: '1泊 18,000円' },
];

const STEP_TITLES = ['ご本人のこと', '困っていること', '月に出せる金額'];
const STEP_HELPS = [
  '介護認定の区分と世帯の状況で、使える制度が変わります。',
  '負担に感じていることを選んでください。いくつでも選べます。',
  '上限を決めると、安いものから順に組み合わせます。あとから何度でも変えられます。',
];

const WEEKDAYS: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri'];

/** 選んだ困りごとを、既定の時間帯（平日）へ自動で配置する */
function autoFillSlots(selectedNeeds: string[]): Record<SlotId, string | null> {
  const out = {} as Record<SlotId, string | null>;
  for (const d of DAYS_OF_WEEK) {
    for (const p of TIME_PERIODS) out[`${d.key}-${p.key}`] = null;
  }
  for (const needId of selectedNeeds) {
    const tag = NEEDS_TAGS.find((t) => t.id === needId);
    if (!tag) continue;
    for (const day of WEEKDAYS) {
      for (const period of tag.defaultSlots) {
        const slotId: SlotId = `${day}-${period}`;
        if (!out[slotId]) out[slotId] = needId;
      }
    }
  }
  return out;
}

export const InputWizard: React.FC<InputWizardProps> = ({ initialData, onSubmit, onLoadDemo }) => {
  const [step, setStep] = useState<number>(1);
  const [formData, setFormData] = useState<UserInputData>(initialData);

  const setCareLevel = (level: CareLevel) => setFormData((p) => ({ ...p, careLevel: level }));
  const setHousehold = (type: HouseholdType) => setFormData((p) => ({ ...p, householdType: type }));
  const setBudget = (budget: number) => setFormData((p) => ({ ...p, monthlyBudget: budget }));

  const toggleNeed = (needId: string) => {
    setFormData((prev) => {
      const next = prev.selectedNeeds.includes(needId)
        ? prev.selectedNeeds.filter((id) => id !== needId)
        : [...prev.selectedNeeds, needId];
      return { ...prev, selectedNeeds: next, slotNeeds: autoFillSlots(next) };
    });
  };

  const next = () => (step < 3 ? setStep(step + 1) : onSubmit(formData));
  const prev = () => step > 1 && setStep(step - 1);

  const pill = (on: boolean): React.CSSProperties => ({
    minHeight: 48,
    padding: '0 18px',
    borderRadius: 999,
    border: `2px solid ${INK}`,
    background: on ? PRIMARY : '#fff',
    color: on ? '#fff' : INK,
    fontSize: 15,
    fontWeight: 700,
    transition: 'background-color .2s ease, color .2s ease',
  });

  const note = (bg: string): React.CSSProperties => ({
    marginTop: 16,
    padding: '16px 18px',
    borderRadius: 8,
    background: bg,
    fontSize: 14,
    lineHeight: 1.9,
    color: '#4A413A',
  });

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* 入力例の読み込み */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button
          type="button"
          onClick={onLoadDemo}
          style={{ fontSize: 14, fontWeight: 700, color: '#B04512', textDecoration: 'underline', textUnderlineOffset: 4 }}
        >
          入力例を読み込む
        </button>
      </div>

      <div style={{ border: `2px solid ${INK}`, borderRadius: 16, background: '#fff', overflow: 'hidden' }}>
        {/* ヘッダー：3分割の進捗 */}
        <div style={{ padding: '28px 32px 24px', borderBottom: `2px solid ${INK}` }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 18 }} role="progressbar" aria-valuemin={1} aria-valuemax={3} aria-valuenow={step}>
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                style={{
                  flex: 1, height: 6, borderRadius: 999,
                  background: n <= step ? PRIMARY : '#E8DCD3',
                  transition: 'background-color .35s ease',
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#B04512' }}>ステップ {step} / 3</span>
          <h1 className="font-display" style={{ marginTop: 6, fontSize: 30, fontWeight: 700, color: INK }}>
            {STEP_TITLES[step - 1]}
          </h1>
          <p style={{ marginTop: 10, fontSize: 15, lineHeight: 1.9, color: SUB }}>{STEP_HELPS[step - 1]}</p>
        </div>

        <div style={{ padding: 32 }}>
          {/* ========== ステップ1：ご本人のこと ========== */}
          {step === 1 && (
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: SUB }}>要介護認定の区分</h2>
              <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {CARE_ORDER.map((lv) => (
                  <button
                    key={lv}
                    type="button"
                    onClick={() => setCareLevel(lv)}
                    aria-pressed={formData.careLevel === lv}
                    className="press-sm"
                    style={pill(formData.careLevel === lv)}
                  >
                    {CARE_SHORT[lv]}
                  </button>
                ))}
              </div>
              <p style={note('#FFF3EA')}>{CARE_LEVEL_LIMITS[formData.careLevel].description}</p>

              <h2 style={{ marginTop: 36, fontSize: 15, fontWeight: 700, color: SUB }}>ご本人の世帯</h2>
              <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 10 }}>
                {HOUSEHOLDS.map((h) => {
                  const on = formData.householdType === h.id;
                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => setHousehold(h.id)}
                      aria-pressed={on}
                      className="press"
                      style={{
                        padding: '18px 20px', borderRadius: 12, border: `2px solid ${INK}`,
                        background: on ? PRIMARY : '#fff', textAlign: 'left',
                        transition: 'background-color .2s ease',
                      }}
                    >
                      <div style={{ fontSize: 16, fontWeight: 700, color: on ? '#fff' : INK }}>{h.title}</div>
                      <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.8, color: on ? '#FFE6D6' : SUB }}>{h.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========== ステップ2：困っていること ========== */}
          {step === 2 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
                <span style={{ fontSize: 14, color: SUB }}>当てはまるものをすべて選んでください</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#B04512', fontVariantNumeric: 'tabular-nums' }}>
                  {formData.selectedNeeds.length} 件
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxHeight: 460, overflowY: 'auto', paddingRight: 6 }}>
                {NEEDS_CATEGORIES.map((cat) => {
                  const tags = NEEDS_TAGS.filter((t) => t.category === cat.key);
                  if (tags.length === 0) return null;
                  return (
                    <div key={cat.key}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, paddingBottom: 8, borderBottom: '1px solid #E8DCD3' }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: INK }}>{cat.label}</span>
                        <span style={{ fontSize: 13, color: '#8A7F76' }}>{cat.hint}</span>
                      </div>
                      <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {tags.map((t) => {
                          const on = formData.selectedNeeds.includes(t.id);
                          return (
                            <button
                              key={t.id}
                              type="button"
                              title={t.description}
                              onClick={() => toggleNeed(t.id)}
                              aria-pressed={on}
                              className="press-sm"
                              style={{ ...pill(on), minHeight: 46, padding: '0 16px', fontSize: 14 }}
                            >
                              {t.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <p style={note('#FFF3EA')}>
                曜日と時間帯は、選んだ内容からいったん自動で埋めます。次の画面のマス目を押せば、その場で直せます。
              </p>
            </div>
          )}

          {/* ========== ステップ3：月に出せる金額 ========== */}
          {step === 3 && (
            <div>
              <div style={{ border: `2px solid ${INK}`, borderRadius: 12, padding: 28, textAlign: 'center', background: '#FFF3EA' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: SUB }}>月に出せる金額の上限</span>
                <div
                  className="font-display"
                  style={{ marginTop: 10, fontSize: 52, fontWeight: 900, color: PRIMARY, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}
                >
                  {formData.monthlyBudget.toLocaleString()} 円
                </div>
                <div style={{ marginTop: 20 }}>
                  <input
                    type="range"
                    min="0"
                    max="200000"
                    step="5000"
                    aria-label="月に出せる金額"
                    value={formData.monthlyBudget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    style={{ '--range-progress': `${(formData.monthlyBudget / 200000) * 100}%`, width: '100%', height: 24, cursor: 'pointer' } as React.CSSProperties}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 500, color: SUB, fontVariantNumeric: 'tabular-nums' }}>
                  <span>0円</span><span>5万</span><span>10万</span><span>15万</span><span>20万</span>
                </div>
              </div>

              <h2 style={{ marginTop: 32, fontSize: 15, fontWeight: 700, color: SUB }}>決める前に、相場です</h2>
              <ul style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {MARKET_RATES.map((m) => (
                  <li
                    key={m.label}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16,
                      padding: '12px 16px', borderRadius: 8, background: '#FAF5F1',
                    }}
                  >
                    <span style={{ fontSize: 15, color: INK }}>{m.label}</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#B04512', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      {m.price}
                    </span>
                  </li>
                ))}
              </ul>

              <p style={note('#FDE8DC')}>
                <strong style={{ fontWeight: 700 }}>0円でもかまいません。</strong>
                ボランティアのゴミ出し、社協の傾聴訪問、区の紙おむつ支給など、費用のかからない選択肢だけで組みます。
              </p>
            </div>
          )}
        </div>

        {/* フッター */}
        <div
          style={{
            padding: '20px 32px', borderTop: `2px solid ${INK}`, background: '#FFF3EA',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
          }}
        >
          <button
            type="button"
            onClick={prev}
            disabled={step === 1}
            style={{
              minHeight: 48, padding: '0 18px', borderRadius: 999,
              fontSize: 15, fontWeight: 700,
              color: step === 1 ? '#C4B5A8' : INK,
              cursor: step === 1 ? 'not-allowed' : 'pointer',
            }}
          >
            ← 戻る
          </button>
          <button
            type="button"
            onClick={next}
            className="press"
            style={{
              minHeight: 52, padding: '0 28px', borderRadius: 999,
              border: `2px solid ${INK}`, background: PRIMARY, color: '#fff',
              fontSize: 16, fontWeight: 700, boxShadow: `0 3px 0 ${INK}`,
            }}
          >
            {step === 3 ? '1週間の表をつくる →' : '次へ →'}
          </button>
        </div>
      </div>
    </div>
  );
};
