/**
 * ランディング冒頭のスクロール駆動ヒーロー
 *
 * 散乱した介護情報が1枚のカードに集約され、画面全体が天地反転して
 * 裏面が1週間のカレンダー表に展開する。
 *
 * 実装方針:
 * - 状態は heroP（0..1）ひとつだけ。表示値はすべて buildHeroScene() の純関数で導く
 * - スクロールは rAF スロットリングを挟まず同期更新する
 *   （バックグラウンドタブで rAF が止まると進捗が取り残されるため）
 * - マウス押しのけだけは rAF ループで、style.transform を直接書いて
 *   React の再レンダリングを介さない（チップ72個 × 毎フレームのため）
 */

'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildHeroScene,
  clamp01,
  DAYS,
  SWIRL_PATH,
  type HeroScene,
} from '@/utils/heroScene';

interface ScrollHeroProps {
  /** 「3つの質問に答える」 */
  onStart: () => void;
  /** 「完成例を見る」 */
  onLoadDemo: () => void;
}

/** カーソルの押しのけ半径と最大押し出し量 */
const PUSH_RADIUS = 175;
const PUSH_STRENGTH = 54;
/** 追従の減衰（毎フレーム この割合だけ目標へ近づく） */
const PUSH_EASING = 0.16;

export const ScrollHero: React.FC<ScrollHeroProps> = ({ onStart, onLoadDemo }) => {
  const heroRef = useRef<HTMLDivElement | null>(null);
  const [heroP, setHeroP] = useState(0);
  // 判定は初回レンダー時に一度だけ（エフェクト内の同期 setState を避ける）
  const [reduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  /* ---------- スクロール進捗 ---------- */
  const readProgress = useCallback(() => {
    const el = heroRef.current;
    if (!el) return;
    const vh = window.innerHeight || 800;
    const box = el.getBoundingClientRect();
    const span = box.height - vh;
    const p = span <= 0 ? 0 : clamp01(-box.top / span);
    // 0.001 未満の揺れでは再レンダリングしない
    setHeroP((prev) => (Math.abs(p - prev) > 0.001 ? p : prev));
  }, []);

  useEffect(() => {
    if (reduced) {
      // 動きを減らす設定では、完成状態を即座に見せる
      const raf = requestAnimationFrame(() => setHeroP(1));
      return () => cancelAnimationFrame(raf);
    }

    // 同期更新（rAF を挟まない）
    window.addEventListener('scroll', readProgress, { passive: true });
    window.addEventListener('resize', readProgress);
    readProgress();
    return () => {
      window.removeEventListener('scroll', readProgress);
      window.removeEventListener('resize', readProgress);
    };
  }, [readProgress, reduced]);

  /* ---------- マウス押しのけ（React を介さない） ---------- */
  useEffect(() => {
    if (reduced) return;

    const offsets = new WeakMap<Element, { x: number; y: number }>();
    let mx = -9999;
    let my = -9999;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
    };
    window.addEventListener('mousemove', onMove, { passive: true });

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const el = heroRef.current;
      if (!el) return;

      // ヒーローが画面外なら計算しない
      const zr = el.getBoundingClientRect();
      if (zr.bottom < 0 || zr.top > (window.innerHeight || 800)) return;

      const nodes = el.querySelectorAll<HTMLElement>('.mchip');
      // 読み取りと書き込みを分けてレイアウトのスラッシングを避ける
      const reads: { el: HTMLElement; cur: { x: number; y: number }; cx: number; cy: number }[] = [];
      nodes.forEach((n) => {
        let cur = offsets.get(n);
        if (!cur) {
          cur = { x: 0, y: 0 };
          offsets.set(n, cur);
        }
        const r = n.getBoundingClientRect();
        reads.push({
          el: n,
          cur,
          cx: r.left + r.width / 2 - cur.x,
          cy: r.top + r.height / 2 - cur.y,
        });
      });

      for (const q of reads) {
        const dx = q.cx - mx;
        const dy = q.cy - my;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        let tx = 0;
        let ty = 0;
        if (d < PUSH_RADIUS) {
          const f = 1 - d / PUSH_RADIUS;
          const k = f * f * PUSH_STRENGTH;
          tx = (dx / d) * k;
          ty = (dy / d) * k;
        }
        q.cur.x += (tx - q.cur.x) * PUSH_EASING;
        q.cur.y += (ty - q.cur.y) * PUSH_EASING;
        if (Math.abs(q.cur.x) > 0.15 || Math.abs(q.cur.y) > 0.15) {
          q.el.style.transform = `translate(${q.cur.x.toFixed(1)}px,${q.cur.y.toFixed(1)}px)`;
        } else if (q.el.style.transform) {
          q.el.style.transform = '';
        }
      }
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
    };
  }, [reduced]);

  /* ---------- 表示値（進捗が変わったときだけ再計算） ---------- */
  const H: HeroScene = useMemo(() => buildHeroScene(heroP), [heroP]);

  const drift = (dur: string, delay: string): React.CSSProperties =>
    reduced
      ? { display: 'block' }
      : {
          display: 'block',
          animation: `driftXY ${dur} ease-in-out infinite alternate`,
          animationDelay: delay,
        };

  return (
    <div
      ref={heroRef}
      style={{ position: 'relative', height: '320vh', background: H.bg }}
    >
      <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, perspective: '1500px' }}>
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              transformStyle: 'preserve-3d',
              transform: H.flipTf,
            }}
          >
            {/* ========== 表面：混沌 → 集約 ========== */}
            <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden' }}>
              {/* 「あなたの1週間」カード */}
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '54%',
                  transform: `translate(-50%,-50%) scale(${H.cardSc})`,
                  opacity: Number(H.cardOp),
                  width: 'min(340px,64vw)',
                  height: '31vh',
                  border: '2px solid #2D231E',
                  borderRadius: 16,
                  background: '#FFFDFB',
                  boxShadow: '0 9px 0 -4px #2D231E',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: -15,
                    transform: 'translateX(-50%)',
                    padding: '5px 14px',
                    borderRadius: 999,
                    background: '#C4511A',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                  }}
                >
                  あなたの1週間
                </span>
              </div>

              {/* 説明文 */}
              <p
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: '73.5%',
                  textAlign: 'center',
                  zIndex: 4,
                  opacity: Number(H.convOp),
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    padding: '20px 34px',
                    borderRadius: 22,
                    maxWidth: '92vw',
                    background: 'rgba(255,248,243,0.78)',
                    backdropFilter: 'blur(5px)',
                    WebkitBackdropFilter: 'blur(5px)',
                  }}
                >
                  <span
                    className="font-display"
                    style={{
                      // デザイン仕様の2倍
                      fontSize: 'clamp(32px,4vw,48px)',
                      fontWeight: 900,
                      letterSpacing: '-0.01em',
                      lineHeight: 1.35,
                      color: '#2D231E',
                      // マーカーの下塗りも文字サイズに合わせて厚くする
                      background: 'linear-gradient(transparent 62%, #FDE8DC 62%)',
                      padding: '0 12px',
                      boxDecorationBreak: 'clone',
                      WebkitBoxDecorationBreak: 'clone',
                    }}
                  >
                    <span style={{ display: 'inline-block' }}>けあしるが代わりに情報を集めて、</span>
                    <span style={{ display: 'inline-block' }}>プランニングしてくれる</span>
                  </span>
                </span>
              </p>

              {/* アイコンタイル12個 */}
              {H.icons.map((ic, j) => (
                <span
                  key={`ic-${j}`}
                  style={{
                    position: 'absolute',
                    left: ic.x,
                    top: ic.y,
                    transform: ic.tf,
                    opacity: Number(ic.op),
                    zIndex: 3,
                  }}
                >
                  <span className="mchip" style={{ display: 'block' }}>
                    <span style={drift(ic.dur, ic.delay)}>
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: ic.size,
                          height: ic.size,
                          borderRadius: 14,
                          border: '2px solid #2D231E',
                          background: ic.bg,
                        }}
                      >
                        <svg
                          width="26"
                          height="26"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#2D231E"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d={ic.d1} />
                          {ic.d2 && <path d={ic.d2} />}
                        </svg>
                      </span>
                    </span>
                  </span>
                </span>
              ))}

              {/* テキストチップ72個 */}
              {H.chips.map((c, i) => (
                <span
                  key={`ch-${i}`}
                  style={{
                    position: 'absolute',
                    left: c.x,
                    top: c.y,
                    transform: c.tf,
                    opacity: Number(c.op),
                  }}
                >
                  <span className="mchip" style={{ display: 'block' }}>
                    <span style={drift(c.dur, c.delay)}>
                      <span
                        style={{
                          display: 'inline-flex',
                          padding: '6px 11px',
                          borderRadius: 999,
                          border: `2px solid ${H.chipBc}`,
                          background: H.chipBg,
                          fontSize: c.fs,
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          color: H.chipFg,
                        }}
                      >
                        {c.text}
                      </span>
                    </span>
                  </span>
                </span>
              ))}

              {/* 中央の見出し＋渦巻き */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  textAlign: 'center',
                  pointerEvents: 'none',
                  zIndex: 4,
                }}
              >
                <span
                  style={{
                    position: 'relative',
                    display: 'inline-block',
                    padding: '26px 44px',
                    borderRadius: 26,
                    maxWidth: '92vw',
                    background: 'rgba(255,248,243,0.78)',
                    backdropFilter: 'blur(5px)',
                    WebkitBackdropFilter: 'blur(5px)',
                    opacity: Number(H.introOp),
                  }}
                >
                  <svg
                    viewBox="0 0 120 60"
                    width="min(760px,88vw)"
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      transform: 'translate(-50%,-50%)',
                      opacity: Number(H.swirlOpSoft),
                    }}
                    fill="none"
                    stroke="#E4D9CE"
                    strokeWidth="2"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d={SWIRL_PATH} />
                  </svg>
                  <span
                    className="font-display"
                    style={{
                      position: 'relative',
                      // デザイン仕様の2.5倍
                      fontSize: 'clamp(53px,6.75vw,85px)',
                      fontWeight: 900,
                      letterSpacing: '-0.02em',
                      lineHeight: 1.2,
                      color: '#2D231E',
                    }}
                  >
                    介護の情報は、多すぎる。
                  </span>
                </span>
              </div>
            </div>

            {/* ========== 裏面：週表 → 見出し → CTA ========== */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backfaceVisibility: 'hidden',
                transform: 'rotateX(180deg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: 'min(1040px,88vw)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 'clamp(14px,2.6vh,30px)',
                }}
              >
                <h1
                  className="font-display"
                  style={{
                    // 週表より手前に置く。2行目が下から差し込まれる間、
                    // カードの背面に潜って消えてしまうのを防ぐ。
                    position: 'relative',
                    zIndex: 2,
                    textAlign: 'center',
                    fontSize: 'clamp(34px,6vw,92px)',
                    fontWeight: 900,
                    letterSpacing: '-0.05em',
                    lineHeight: 1.16,
                    color: '#2D231E',
                  }}
                >
                  {/* 各行は自分の行帯の中だけで動く。帯の外にはみ出さないので、
                      下から差し込まれる2行目が週表に重ならない。 */}
                  <span style={{ display: 'block', overflow: 'hidden' }}>
                    <span style={{ display: 'block', opacity: Number(H.headOp), transform: H.l1Tf }}>
                      知らないまま、
                    </span>
                  </span>
                  <span style={{ display: 'block', overflow: 'hidden' }}>
                    <span style={{ display: 'block', opacity: Number(H.headOp), transform: H.l2Tf }}>
                      終わらせない。
                    </span>
                  </span>
                </h1>

                <div style={{ position: 'relative', zIndex: 1, width: '100%', transform: `scale(${H.tableSc})` }}>
                  <div
                    style={{
                      position: 'relative',
                      border: '2px solid #2D231E',
                      borderRadius: 18,
                      background: '#FFFDFB',
                      boxShadow: '0 9px 0 -4px #2D231E',
                      padding:
                        'clamp(18px,3.2vh,32px) clamp(16px,2.4vw,30px) clamp(14px,2.6vh,24px)',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: -15,
                        transform: 'translateX(-50%)',
                        padding: '5px 14px',
                        borderRadius: 999,
                        background: '#C4511A',
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      あなたの1週間
                    </span>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7,minmax(0,1fr))',
                        // 狭い画面でマスが潰れないよう、隙間から先に詰める
                        gap: 'clamp(4px,1.2vw,9px)',
                        marginBottom: 9,
                      }}
                    >
                      {DAYS.map((d) => (
                        <span
                          key={d}
                          style={{
                            textAlign: 'center',
                            fontSize: 'clamp(10px,2.6vw,12px)',
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            color: '#8A7F76',
                            opacity: Number(H.daysOp),
                          }}
                        >
                          {d}
                        </span>
                      ))}
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7,minmax(0,1fr))',
                        gap: 'clamp(4px,1.2vw,9px)',
                      }}
                    >
                      {H.cells.map((c, i) => (
                        <div
                          key={`cell-${i}`}
                          style={{
                            height: 'clamp(32px,5.8vh,54px)',
                            borderRadius: 9,
                            background: c.bg,
                            border: `2px ${c.bs} ${c.bc}`,
                            opacity: Number(c.op),
                            transform: c.tf,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0 clamp(2px,0.7vw,5px)',
                            fontSize: 'clamp(8.5px,2.3vw,11px)',
                            fontWeight: 700,
                            lineHeight: 1.25,
                            overflow: 'hidden',
                            textAlign: 'center',
                            color: '#2D231E',
                          }}
                        >
                          {c.label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 20,
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    opacity: Number(H.ctaOp),
                    transform: H.ctaTf,
                  }}
                >
                  <button
                    type="button"
                    onClick={onStart}
                    className="press"
                    style={{
                      height: 64,
                      padding: '0 36px',
                      borderRadius: 999,
                      background: '#C4511A',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: 18,
                      border: '2px solid #2D231E',
                      boxShadow: '0 4px 0 #2D231E',
                    }}
                  >
                    3つの質問に答える
                  </button>
                  <button
                    type="button"
                    onClick={onLoadDemo}
                    style={{
                      minHeight: 44,
                      fontSize: 15,
                      fontWeight: 700,
                      color: '#B04512',
                      textDecoration: 'underline',
                      textUnderlineOffset: 5,
                    }}
                  >
                    完成例を見る
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* スクロール誘導 */}
        <div
          style={{
            position: 'absolute',
            bottom: 34,
            left: '50%',
            marginLeft: -70,
            width: 140,
            padding: '8px 0',
            borderRadius: 999,
            background: 'rgba(255,248,243,0.75)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            textAlign: 'center',
            fontSize: 13,
            fontWeight: 700,
            color: H.sub,
            opacity: H.hintOp,
            animation: reduced ? undefined : 'bob 2.4s ease-in-out infinite',
          }}
        >
          ↓ スクロール
        </div>
      </div>
    </div>
  );
};
