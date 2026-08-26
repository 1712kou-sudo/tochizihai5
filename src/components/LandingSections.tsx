/**
 * ランディング下部セクション
 *
 * 保険外サービス例3カード → 60%統計バンド → しくみ（3ステージ）→ フッターCTA
 * デザイン仕様（Redesign.dc.html）に対応。
 */

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { SLOT_COLORS } from '@/utils/colors';
import { useIsNarrow } from '@/hooks/useIsNarrow';

const INK = '#2D231E';
const CREAM = '#FFF8F3';
const PRIMARY = '#C4511A';
const SUB = '#8A7F76';

/* ---------- 保険外サービスの実例 ---------- */
const EXAMPLES = [
  { short: '庭の草むしり', price: '1時間 1,450円', provider: 'シルバー人材センター', d: 'M12 4v16' },
  { short: '部屋の掃除', price: '1時間 1,350円', provider: 'シルバー人材センター', d: 'M6 12h12' },
  { short: '病院での付き添い', price: '1時間 3,300円', provider: '便利屋ベンリー', d: 'M12 6v12M6 12h12' },
];

/** 保険外サービスの実例カード1枚 */
const ExampleCard: React.FC<{ e: (typeof EXAMPLES)[number] }> = ({ e }) => (
  <div
    style={{
      border: `2px solid ${INK}`,
      borderRadius: 16,
      background: '#fff',
      padding: 'clamp(22px,5vw,34px) clamp(20px,5vw,30px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      height: '100%',
    }}
  >
    <span
      aria-hidden="true"
      style={{
        width: 60, height: 60, borderRadius: 15, background: '#FDE8DC',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}
    >
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={PRIMARY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="8" />
        <path d={e.d} />
      </svg>
    </span>
    <div style={{ marginTop: 24, fontSize: 'clamp(19px,4.6vw,21px)', fontWeight: 700, lineHeight: 1.5 }}>{e.short}</div>
    <div
      className="font-display"
      style={{
        marginTop: 12, fontSize: 'clamp(26px,6.4vw,32px)', fontWeight: 900, color: PRIMARY,
        fontVariantNumeric: 'tabular-nums', lineHeight: 1.1,
      }}
    >
      {e.price}
    </div>
    <div style={{ marginTop: 'auto', paddingTop: 20, fontSize: 13, color: SUB }}>{e.provider}</div>
  </div>
);

/* ---------- しくみ：3ステージ ---------- */
const STAGES = [
  { who: 'ご家族', title: '3つの質問に答える', caption: 'いまは、ほとんどの枠を家族が担っています' },
  { who: 'このサイト', title: '安い順に当てはめる', caption: '予算に収まる範囲で、色のついた枠が置き換わります' },
  { who: 'ケアマネジャー', title: 'リンクを開いて面談で使う', caption: '残った家族の枠が、そのまま相談すべき項目になります' },
];

/** 完成後の28マスの担い手（しくみ図の右側で使う） */
const FLOWPLAN: (keyof typeof SLOT_COLORS)[] = [
  'family', 'family', 'paid', 'family', 'family', 'paid', 'family',
  'insurance', 'paid', 'paid', 'insurance', 'paid', 'paid', 'paid',
  'family', 'insurance', 'family', 'family', 'insurance', 'family', 'family',
  'paid', 'paid', 'none', 'paid', 'none', 'paid', 'paid',
];

const LADDER = [
  { price: '0円', name: 'ゴミ出しボランティア', w: 14 },
  { price: '500円', name: '区の配食サービス', w: 30 },
  { price: '1,350円', name: 'シルバーの家事援助', w: 58 },
  { price: '3,300円', name: '院内付き添い', w: 88 },
];

const QDATA = [
  { k: '要介護度・世帯', v: '要介護2・同居' },
  { k: '困っていること', v: '9 件' },
  { k: '月に出せる金額', v: '25,000 円' },
];

/* しくみアニメの刻み（デザイン仕様の値） */
const QTICK = 55;      // 1ティックの長さ(ms)
const TPC = 2;         // 1文字あたりのティック数
const QPAUSE = 6;      // 行間の休止ティック
const S1_STEP = 7;     // ステージ1で1件採用するごとのティック
const S2_SEND = 17;    // ステージ2で共有が完了するティック

/** 各行のタイプ開始ティック */
const Q_STARTS = QDATA.reduce<number[]>((acc, r, i) => {
  const prev = i === 0 ? 0 : acc[i - 1] + QDATA[i - 1].v.length * TPC + QPAUSE;
  acc.push(prev);
  return acc;
}, []);
const Q_TOTAL = Q_STARTS[QDATA.length - 1] + QDATA[QDATA.length - 1].v.length * TPC + QPAUSE;
const STAGE_TICKS = [Q_TOTAL, LADDER.length * S1_STEP + 6, S2_SEND + 26];

/** 画面に入ったら一度だけ true になる */
function useInView<T extends HTMLElement>(threshold = 0.3) {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // 同期 setState を避けるため、判定は必ずコールバック内で行う
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const raf = requestAnimationFrame(() => setSeen(true));
      return () => cancelAnimationFrame(raf);
    }

    const ob = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setSeen(true);
            ob.unobserve(e.target);
          }
        }
      },
      { threshold }
    );
    ob.observe(node);
    return () => ob.disconnect();
  }, [threshold]);

  return [ref, seen] as const;
}

interface LandingSectionsProps {
  onStart: () => void;
}

export const LandingSections: React.FC<LandingSectionsProps> = ({ onStart }) => {
  const [statRef, statSeen] = useInView<HTMLElement>(0.4);
  const [stage, setStage] = useState(0);
  const [tick, setTick] = useState(0);
  // 狭い画面かどうか。レイアウトを組み替えるところだけで使う
  const narrow = useIsNarrow();
  // 実例カード：狭い画面では1枚ずつ入れ替える
  const [exIdx, setExIdx] = useState(0);
  // 判定は初回レンダー時に一度だけ（エフェクト内の同期 setState を避ける）
  const [reduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  // 実例カードの入れ替え。狭い画面のときだけ回す
  useEffect(() => {
    if (!narrow || reduced) return;
    const id = window.setInterval(
      () => setExIdx((i) => (i + 1) % EXAMPLES.length),
      3400
    );
    return () => window.clearInterval(id);
  }, [narrow, reduced]);

  /**
   * ステージ内をティックで進め、終端に達したら次のステージへ。
   *
   * ステージ番号とティックは ref を正として1本のインターバルで進める。
   * setTick の更新関数の中で setStage を呼ぶと、開発時に更新関数が
   * 2回実行されてステージを飛ばすため（1→3 のように見える）。
   */
  const tickRef = useRef(0);
  const stageRef = useRef(0);

  useEffect(() => {
    if (reduced) {
      const raf = requestAnimationFrame(() => setTick(STAGE_TICKS[stageRef.current]));
      return () => cancelAnimationFrame(raf);
    }

    const id = window.setInterval(() => {
      const limit = STAGE_TICKS[stageRef.current] + 14; // 終端で少し置く
      if (tickRef.current >= limit) {
        tickRef.current = 0;
        stageRef.current = (stageRef.current + 1) % STAGES.length;
        setStage(stageRef.current);
      } else {
        tickRef.current += 1;
      }
      setTick(tickRef.current);
    }, QTICK);

    return () => window.clearInterval(id);
  }, [reduced]);

  const pickStage = (i: number) => {
    stageRef.current = i;
    tickRef.current = 0;
    setStage(i);
    setTick(0);
  };

  /* ---- 派生値 ---- */
  // ステージ1: 安い順に何件採用できたか
  const adopted = stage === 0 ? 0 : stage === 1 ? Math.min(LADDER.length, Math.floor(tick / S1_STEP)) : LADDER.length;
  // ステージ0: 3項目すべて打ち終わったか
  const allTyped = stage === 0 && tick >= Q_TOTAL;
  // ステージ2: リンクが相手に届いたか（届くまでは右側は待機状態）
  const arrived = stage === 2 && tick >= S2_SEND;
  // 左の週表で色がつく枠の数（採用数に応じて増える）
  const litRatio = stage === 0 ? 0 : stage === 1 ? adopted / LADDER.length : 1;

  return (
    <div style={{ background: CREAM, color: INK }}>
      {/* ============ 保険外サービス例 ============ */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: 'clamp(56px,9vw,112px) clamp(16px,4vw,32px) 0' }}>
        <p style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, letterSpacing: '0.16em', color: '#B04512' }}>
          保険外サービス
        </p>
        <h2
          className="font-display"
          style={{ marginTop: 16, textAlign: 'center', fontSize: 'clamp(26px,3.4vw,40px)', fontWeight: 900, letterSpacing: '-0.03em' }}
        >
          介護保険では、頼めません
        </h2>
        {narrow ? (
          /* 狭い画面では3枚並べると縦に長くなりすぎるので、1枚ずつ入れ替える */
          <div style={{ marginTop: 32 }}>
            <div style={{ minHeight: 232 }}>
              <div key={EXAMPLES[exIdx].short} className="swap">
                <ExampleCard e={EXAMPLES[exIdx]} />
              </div>
            </div>
            <div
              role="tablist"
              aria-label="保険外サービスの実例"
              style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 10 }}
            >
              {EXAMPLES.map((e, i) => (
                <button
                  key={e.short}
                  type="button"
                  role="tab"
                  aria-selected={i === exIdx}
                  aria-label={e.short}
                  onClick={() => setExIdx(i)}
                  style={{
                    width: i === exIdx ? 26 : 10,
                    height: 10,
                    borderRadius: 999,
                    background: i === exIdx ? PRIMARY : '#E0D2C6',
                    transition: 'width .32s cubic-bezier(.22,1,.36,1), background-color .32s ease',
                  }}
                />
              ))}
            </div>
          </div>
        ) : (
          <div
            style={{
              marginTop: 48,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))',
              gap: 20,
            }}
          >
            {EXAMPLES.map((e) => (
              <ExampleCard key={e.short} e={e} />
            ))}
          </div>
        )}
      </section>

      {/* ============ 60%統計バンド ============ */}
      <section ref={statRef} style={{ maxWidth: 1180, margin: '0 auto', padding: 'clamp(52px,8vw,104px) clamp(16px,4vw,32px) 0' }}>
        <div
          style={{
            border: `2px solid ${INK}`,
            borderRadius: 20,
            background: '#FDE8DC',
            padding: 'clamp(28px,6vw,52px) clamp(22px,5.5vw,48px)',
            display: 'grid',
            // 狭い画面では数字を上、文章を下に積む
            gridTemplateColumns: narrow ? 'minmax(0,1fr)' : 'auto minmax(0,1fr)',
            gap: narrow ? 20 : 52,
            alignItems: 'center',
          }}
        >
          <div
            className="font-display"
            style={{ fontSize: 'clamp(64px,17vw,140px)', fontWeight: 900, color: PRIMARY, lineHeight: 0.86, fontVariantNumeric: 'tabular-nums' }}
          >
            60<span style={{ fontSize: '0.42em' }}>%</span>
          </div>
          <div>
            <p style={{ fontSize: 'clamp(18px,4.4vw,27px)', fontWeight: 700, lineHeight: 1.7 }}>
              使ったことがない人のうち、
              <br />
              「知っていたら使いたかった」
            </p>
            <div style={{ marginTop: 26, height: 14, borderRadius: 999, background: '#F4D3B9', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  borderRadius: 999,
                  background: PRIMARY,
                  width: statSeen ? '60%' : '0%',
                  transition: 'width 1.5s cubic-bezier(.22,1,.36,1) .25s',
                }}
              />
            </div>
            <p style={{ marginTop: 18, fontSize: 12, lineHeight: 1.8, color: SUB }}>
              出典：介護ポストセブン「介護保険外サービス、未利用77％でも将来的必要性は61％【利用実態調査】」
            </p>
          </div>
        </div>
      </section>

      {/* ============ しくみ ============ */}
      <section style={{ background: INK, color: '#F6F0EA', marginTop: 112 }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: 'clamp(52px,8vw,96px) clamp(16px,4vw,32px)' }}>
          <p style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, letterSpacing: '0.16em', color: '#D98A55' }}>
            しくみ
          </p>
          <h2
            className="font-display"
            style={{ marginTop: 16, textAlign: 'center', fontSize: 'clamp(26px,3.4vw,40px)', fontWeight: 900, letterSpacing: '-0.03em' }}
          >
            面談の材料になるまで
          </h2>

          {/* ステージ切替 */}
          <div
            style={{
              marginTop: 'clamp(28px,5vw,52px)',
              display: 'flex',
              // 狭い画面では横に3つ並べると見出しが1文字ずつ折り返すので縦に積む
              flexDirection: narrow ? 'column' : 'row',
              alignItems: 'stretch',
              justifyContent: 'center',
              gap: narrow ? 4 : 0,
            }}
          >
            {STAGES.map((s, i) => (
              <button
                key={s.title}
                type="button"
                onClick={() => pickStage(i)}
                aria-current={stage === i ? 'step' : undefined}
                style={{
                  flex: 1,
                  maxWidth: narrow ? 'none' : 280,
                  padding: narrow ? '14px 4px 16px' : '20px 18px 22px',
                  borderTop: `3px solid ${stage === i ? PRIMARY : '#4A3E37'}`,
                  opacity: stage === i ? 1 : 0.34,
                  transition: 'opacity .45s ease, border-color .45s ease',
                  textAlign: 'left',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      width: 26, height: 26, borderRadius: 999,
                      background: stage === i ? PRIMARY : '#4A3E37',
                      color: '#fff', fontSize: 12, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, transition: 'background-color .45s ease',
                    }}
                  >
                    {i + 1}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: '#A79A90' }}>{s.who}</span>
                </span>
                <span style={{ display: 'block', marginTop: narrow ? 8 : 14, fontSize: 'clamp(16px,4vw,21px)', fontWeight: 700, lineHeight: 1.5 }}>
                  {s.title}
                </span>
              </button>
            ))}
          </div>

          {/* パネル：左=週表 / 右=ステージ別の内容 */}
          <div
            style={{
              marginTop: narrow ? 24 : 36,
              border: '2px solid #4A3E37',
              borderRadius: 20,
              background: '#241C18',
              padding: 'clamp(18px,4.5vw,44px)',
              display: 'grid',
              // 列構成はステージによらず固定。移動した瞬間に枠の形が変わらないようにする
              // 狭い画面だけは3列に収まらないので、週表→コネクタ→内容の順に縦に積む
              gridTemplateColumns: narrow ? 'minmax(0,1fr)' : 'minmax(0,1fr) 56px minmax(0,1fr)',
              gap: narrow ? 8 : 20,
              // 上下中央。リンク行は高さをアニメーションさせるので、
              // 中央位置も一気に飛ばず滑らかに移動する
              alignItems: 'center',
              minHeight: narrow ? 0 : 432,
            }}
          >
            {/* ---------- 左：週表 ---------- */}
            {/* 凡例とリンク行は絶対配置にして、週表の中央位置を動かさない */}
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  border: `2px solid ${arrived ? '#ED6A2C' : '#4A3E37'}`,
                  borderRadius: 12,
                  background: '#2D231E',
                  padding: 14,
                  transition: 'border-color .6s ease',
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: 8 }}>
                  {FLOWPLAN.map((k, i) => {
                    // 採用が進むほど、左から順に本来の色へ変わる
                    const lit = i / FLOWPLAN.length < litRatio;
                    const shown = k === 'none' ? 'none' : lit ? k : 'family';
                    const tok = SLOT_COLORS[shown];
                    return (
                      <div
                        key={i}
                        style={{
                          height: 30,
                          borderRadius: 8,
                          background: tok.bgHex,
                          border: `2px ${shown === 'none' ? 'dashed' : 'solid'} ${tok.borderHex}`,
                          transition: `background-color .55s cubic-bezier(.22,1,.36,1) ${(i % 7) * 26}ms, border-color .55s cubic-bezier(.22,1,.36,1) ${(i % 7) * 26}ms`,
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* 凡例とリンク行。横並びのときは絶対配置にして週表の中央位置を固定するが、
                  縦積みのときは下の内容に重なるので、素直に流し込む。 */}
              <div style={narrow ? undefined : { position: 'absolute', top: '100%', left: 0, right: 0 }}>
              <div style={{ marginTop: 18, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {(['family', 'insurance', 'paid'] as const).map((k) => (
                  <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700, color: '#BFB4AA' }}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: SLOT_COLORS[k].bgHex, border: `2px solid ${SLOT_COLORS[k].borderHex}` }} />
                    {SLOT_COLORS[k].label}
                  </span>
                ))}
              </div>

              {/*
                共有リンク行。ステージ2でだけ見せるが、出し入れで左カラムの高さが
                変わると週表が上下にズレるため、grid-template-rows で滑らかに開閉する。
              */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateRows: stage === 2 ? '1fr' : '0fr',
                  transition: 'grid-template-rows .55s cubic-bezier(.22,1,.36,1)',
                }}
                aria-hidden={stage !== 2}
              >
                <div style={{ minHeight: 0, overflow: 'hidden' }}>
                  <div
                    style={{
                      marginTop: 16, display: 'flex', alignItems: 'center', gap: 11,
                      padding: '13px 15px', borderRadius: 12,
                      border: `2px solid ${arrived ? PRIMARY : '#4A3E37'}`,
                      background: '#241C18',
                      opacity: stage === 2 ? 1 : 0,
                      transition: 'border-color .5s cubic-bezier(.22,1,.36,1), opacity .4s ease',
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={arrived ? '#ED6A2C' : '#8A7F76'} strokeWidth="2.4" strokeLinecap="round" aria-hidden="true" style={{ transition: 'stroke .5s ease' }}>
                      <path d="M10 14l4-4" /><path d="M13.5 6.5l1.5-1.5a3.5 3.5 0 0 1 5 5l-1.5 1.5" /><path d="M10.5 17.5L9 19a3.5 3.5 0 0 1-5-5l1.5-1.5" />
                    </svg>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#F6F0EA' }}>keashiru.jp/p/8f2a</span>
                    <span
                      style={{
                        marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8,
                        fontSize: 13, fontWeight: 700,
                        color: arrived ? '#ED6A2C' : '#8A7F76',
                        transition: 'color .5s ease',
                      }}
                    >
                      {arrived ? '開かれました' : '送りました'}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={arrived ? '#ED6A2C' : '#8A7F76'} strokeWidth="2.6" strokeLinecap="round" aria-hidden="true" style={{ transition: 'stroke .5s ease' }}>
                        <path d="M5 12h13M13 6l6 6-6 6" />
                      </svg>
                    </span>
                  </div>
                </div>
              </div>
              </div>
            </div>

            {/* ---------- 中央：コネクタ（ステージ2のみ） ---------- */}
            <div
              aria-hidden="true"
              style={{
                height: 40, display: 'flex', alignItems: 'center',
                justifyContent: narrow ? 'center' : 'stretch',
                opacity: stage === 2 ? 1 : 0, transition: 'opacity .5s ease',
              }}
            >
              {stage === 2 && (
                /* 縦積みのときは同じ矢印を90度倒して、下へ流れるように見せる */
                <div
                  style={{
                    position: 'relative', display: 'flex', alignItems: 'center',
                    ...(narrow ? { width: 48, transform: 'rotate(90deg)' } : { flex: 1 }),
                  }}
                >
                  <span style={{ flex: 1, borderTop: '2px dashed #ED6A2C' }} />
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ED6A2C" strokeWidth="3" strokeLinecap="round" style={{ marginLeft: -2 }}>
                    <path d="M8 5l7 7-7 7" />
                  </svg>
                  <span
                    style={{
                      position: 'absolute', left: 0, top: '50%', marginTop: -5,
                      width: 10, height: 10, borderRadius: 999, background: '#ED6A2C',
                      boxShadow: '0 0 12px 4px rgba(237,106,44,0.45)',
                      opacity: arrived ? 0 : 1,
                      animation: reduced ? undefined : 'zap 0.95s linear infinite',
                      transition: 'opacity .45s ease',
                    }}
                  />
                </div>
              )}
            </div>

            {/* ---------- 右：ステージ別 ---------- */}
            <div style={{ position: 'relative', minHeight: narrow ? 264 : 340 }}>
              {/* ===== ステージ0：上から順にタイプされて埋まる ===== */}
              <div
                style={{
                  position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center',
                  opacity: stage === 0 ? 1 : 0, transform: stage === 0 ? 'none' : 'translateY(10px)',
                  transition: 'opacity .5s ease, transform .5s cubic-bezier(.22,1,.36,1)',
                  pointerEvents: stage === 0 ? 'auto' : 'none',
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: '#D98A55' }}>
                  整理された条件
                </span>

                {/* 全部そろうと、3枚まとめて浮き上がる */}
                <div
                  style={{
                    marginTop: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    transform: allTyped ? 'translateY(-2px)' : 'none',
                    transition: 'transform .5s cubic-bezier(.22,1,.36,1)',
                  }}
                >
                  {QDATA.map((r, i) => {
                    const startT = Q_STARTS[i];
                    const typed = Math.max(0, Math.min(r.v.length, Math.floor((tick - startT) / TPC)));
                    const started = tick >= startT;
                    const typing = stage === 0 && started && typed < r.v.length;
                    const done = started && typed >= r.v.length;
                    // 入力中の1枚だけを強調し、全部そろったら3枚とも強調する
                    const lit = typing || allTyped;
                    return (
                      <div
                        key={r.k}
                        style={{
                          border: `2px solid ${lit ? PRIMARY : '#4A3E37'}`,
                          borderRadius: 12,
                          padding: '13px 16px',
                          background: typing ? '#33261F' : '#241C18',
                          // 入力中の枠だけ手前に持ち上げる
                          transform: typing ? 'scale(1.015)' : 'scale(1)',
                          boxShadow: typing
                            ? '0 0 0 4px rgba(237,106,44,0.14)'
                            : allTyped
                            ? '0 0 0 3px rgba(237,106,44,0.09)'
                            : 'none',
                          opacity: started ? 1 : 0.32,
                          transition:
                            'border-color .3s ease, background-color .3s ease, box-shadow .45s ease, transform .35s cubic-bezier(.22,1,.36,1), opacity .4s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: typing ? '#D98A55' : '#A79A90', transition: 'color .3s ease' }}>
                            {r.k}
                          </span>
                          <span
                            aria-hidden="true"
                            style={{
                              width: 22, height: 22, borderRadius: 999, background: PRIMARY,
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                              opacity: done ? 1 : 0,
                              transform: done ? 'scale(1)' : 'scale(0.5)',
                              transition: 'opacity .3s ease, transform .35s cubic-bezier(.22,1,.36,1)',
                            }}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round">
                              <path d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                        </div>

                        {/* 1文字ずつ現れる値。入力中の行にだけキャレットを出す */}
                        <div style={{ marginTop: 6, height: 30, display: 'flex', alignItems: 'center', gap: 2 }}>
                          <span style={{ fontSize: 21, fontWeight: 700, color: '#F6F0EA', whiteSpace: 'pre' }}>
                            {r.v.slice(0, typed)}
                          </span>
                          <span
                            aria-hidden="true"
                            style={{
                              width: typing ? 3 : 0,
                              height: 23,
                              background: PRIMARY,
                              borderRadius: 1,
                              animation: reduced || !typing ? undefined : 'caretBlink 0.9s step-end infinite',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 全部そろってから、左の表へ向かう矢印が出る */}
                <div
                  style={{
                    marginTop: 16, display: 'flex', alignItems: 'center', gap: 10,
                    opacity: allTyped ? 1 : 0,
                    transform: allTyped ? 'none' : 'translateY(6px)',
                    transition: 'opacity .5s ease .15s, transform .5s cubic-bezier(.22,1,.36,1) .15s',
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 30, height: 30, borderRadius: 999, background: PRIMARY,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round">
                      <path d="M19 12H6M12 6l-6 6 6 6" />
                    </svg>
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#BFB4AA' }}>
                    この条件で、{narrow ? '上' : '左'}の表を組みます
                  </span>
                </div>
              </div>

              {/* ===== ステージ1：安い順に採用 ===== */}
              <div
                style={{
                  position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14,
                  opacity: stage === 1 ? 1 : 0, transform: stage === 1 ? 'none' : 'translateY(10px)',
                  transition: 'opacity .5s ease, transform .5s cubic-bezier(.22,1,.36,1)',
                  pointerEvents: stage === 1 ? 'auto' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: '#A79A90' }}>1回あたりの安い順に採用</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#D98A55', fontVariantNumeric: 'tabular-nums' }}>
                    採用 {adopted} / {LADDER.length}
                  </span>
                </div>
                {LADDER.map((l, i) => {
                  const on = i < adopted;
                  return (
                    <div key={l.name} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <span style={{ width: 66, textAlign: 'right', fontSize: 14, fontWeight: 700, color: on ? '#F6F0EA' : '#8A7F76', fontVariantNumeric: 'tabular-nums', transition: 'color .4s ease' }}>
                        {l.price}
                      </span>
                      <span style={{ flex: 1, position: 'relative', height: 38, borderRadius: 10, background: '#2D231E', overflow: 'hidden' }}>
                        <span
                          style={{
                            position: 'absolute', inset: 0, borderRadius: 10, background: PRIMARY,
                            width: on ? `${l.w}%` : '0%',
                            transition: 'width .7s cubic-bezier(.22,1,.36,1)',
                          }}
                        />
                        <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 14, fontWeight: 700, color: '#F6F0EA', whiteSpace: 'nowrap' }}>
                          {l.name}
                        </span>
                      </span>
                      <span
                        aria-hidden="true"
                        style={{
                          width: 22, height: 22, borderRadius: 999, background: PRIMARY,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          opacity: on ? 1 : 0, transform: on ? 'scale(1)' : 'scale(0.6)',
                          transition: 'opacity .35s ease, transform .35s cubic-bezier(.22,1,.36,1)',
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round">
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* ===== ステージ2：ケアマネジャーの画面（届く前は待機） ===== */}
              <div
                style={{
                  position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center',
                  opacity: stage === 2 ? 1 : 0, transform: stage === 2 ? 'none' : 'translateY(10px)',
                  transition: 'opacity .5s ease, transform .5s cubic-bezier(.22,1,.36,1)',
                  pointerEvents: stage === 2 ? 'auto' : 'none',
                }}
              >
                <div
                  style={{
                    // 届くまでは点灯させない
                    border: `2px solid ${arrived ? PRIMARY : '#4A3E37'}`,
                    borderRadius: 16,
                    background: '#2D231E',
                    padding: 20,
                    boxShadow: arrived ? '0 0 0 4px rgba(237,106,44,0.12)' : 'none',
                    transition: 'border-color .55s cubic-bezier(.22,1,.36,1), box-shadow .55s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span aria-hidden="true" style={{ width: 46, height: 46, borderRadius: 999, background: '#3A2E27', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#BFB4AA" strokeWidth="2" strokeLinecap="round">
                        <path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" />
                        <path d="M12 12.4a3.4 3.4 0 1 1 0-6.8 3.4 3.4 0 0 1 0 6.8z" />
                      </svg>
                    </span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#F6F0EA' }}>ケアマネジャーの画面</div>
                      <div style={{ marginTop: 4, fontSize: 13, color: '#BFB4AA', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {arrived ? 'ご家族と同じ表を、そのまま見ています' : 'リンクが届くのを待っています'}
                      </div>
                    </div>
                    {/* 届いた瞬間にバッジが現れる */}
                    <span
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 7, flexShrink: 0,
                        padding: '10px 17px', borderRadius: 999, background: PRIMARY,
                        fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap',
                        opacity: arrived ? 1 : 0,
                        transform: arrived ? 'scale(1)' : 'scale(0.82)',
                        transition: 'opacity .4s ease, transform .45s cubic-bezier(.22,1,.36,1)',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                      共有されました
                    </span>
                  </div>

                  {/* 届く前は空の点線枠、届いたらミニ週表が入る */}
                  <div
                    style={{
                      marginTop: 16, position: 'relative', minHeight: 108,
                      border: `2px ${arrived ? 'solid' : 'dashed'} #4A3E37`,
                      borderRadius: 12, padding: 10,
                      transition: 'border-style .3s ease',
                    }}
                  >
                    {/* 待機表示 */}
                    <div
                      style={{
                        position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', padding: 12,
                        opacity: arrived ? 0 : 1,
                        transition: 'opacity .35s ease',
                        pointerEvents: 'none',
                      }}
                    >
                      <span style={{ fontSize: 13, color: '#8A7F76' }}>リンクを開くと、ここに同じ表が入ります</span>
                    </div>

                    {/* 到着後：同じ週表が流し込まれる */}
                    <div style={{ opacity: arrived ? 1 : 0, transition: 'opacity .45s ease .12s' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: 4 }}>
                        {FLOWPLAN.map((k, i) => {
                          const tok = SLOT_COLORS[k];
                          return (
                            <div
                              key={i}
                              style={{
                                height: 14, borderRadius: 4,
                                background: tok.bgHex,
                                border: `1.5px ${k === 'none' ? 'dashed' : 'solid'} ${tok.borderHex}`,
                                // 左上から順に流し込まれる
                                opacity: arrived ? 1 : 0,
                                transform: arrived ? 'none' : 'scale(0.7)',
                                transition: `opacity .3s ease ${140 + i * 14}ms, transform .35s cubic-bezier(.22,1,.36,1) ${140 + i * 14}ms`,
                              }}
                            />
                          );
                        })}
                      </div>
                      <p style={{ marginTop: 12, fontSize: 12, color: '#A79A90' }}>
                        家族が担う枠には、印がついたまま届きます
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: '#A79A90' }}>
            {stage === 0 && 'いまは、ほとんどの枠を家族が担っています'}
            {stage === 1 && `採用したぶんだけ、${narrow ? '上' : '左'}の表の枠が色づきます`}
            {stage === 2 && '印のついた枠が、そのまま議題になります'}
          </p>
        </div>
      </section>

      {/* ============ フッターCTA ============ */}
      <section style={{ textAlign: 'center', padding: 'clamp(52px,8vw,104px) clamp(16px,4vw,32px) clamp(64px,10vw,120px)' }}>
        <h2 className="font-display" style={{ fontSize: 'clamp(24px,3vw,34px)', fontWeight: 900, letterSpacing: '-0.03em' }}>
          1分で、はじめられます
        </h2>
        <button
          type="button"
          onClick={onStart}
          className="press"
          style={{
            marginTop: 32, height: 64, padding: '0 38px', borderRadius: 999,
            background: PRIMARY, color: '#fff', fontWeight: 700, fontSize: 18,
            border: `2px solid ${INK}`, boxShadow: `0 4px 0 ${INK}`,
          }}
        >
          3つの質問に答える
        </button>
        <p style={{ marginTop: 20, fontSize: 14, color: '#6E625B' }}>無料・登録不要</p>
      </section>
    </div>
  );
};
