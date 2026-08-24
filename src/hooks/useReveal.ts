/**
 * 登場アニメーション用フック
 *
 * 設計上の要点:
 * - 初期状態 opacity:0 を SSR の HTML に焼き込まない。
 *   親に .rv-armed が付いて初めて子の .reveal が隠れる。
 *   JS が落ちた場合・reduced-motion の場合は全部見えたまま。
 * - 動きは globals.css の .reveal / .is-in が担当し、
 *   ここでは「隠す準備ができたか」「入ったか」の2状態だけを管理する。
 */

'use client';

import { useEffect, useRef, useState } from 'react';

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

interface UseRevealOptions {
  /** 要素がこの割合だけ見えたら発火（0〜1） */
  threshold?: number;
  /** 発火位置の調整 */
  rootMargin?: string;
  /** マウント直後に発火させる（ファーストビュー用。既定 false = スクロール監視） */
  immediate?: boolean;
}

/**
 * 戻り値を親要素に展開して使う。
 *   const reveal = useReveal();
 *   <div {...reveal.containerProps}>
 *     <p className="reveal" style={{ '--rv-i': 0 }}>…</p>
 *   </div>
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>({
  threshold = 0.12,
  rootMargin = '0px 0px -8% 0px',
  immediate = false,
}: UseRevealOptions = {}) {
  const ref = useRef<T | null>(null);
  // armed: 子を隠してよい状態か（rAF 1回分待ってから true）
  const [armed, setArmed] = useState(false);
  const [isIn, setIsIn] = useState(false);

  useEffect(() => {
    // エフェクト本体で同期的に setState しない（連鎖レンダーを避ける）
    if (prefersReducedMotion()) {
      const raf = requestAnimationFrame(() => setIsIn(true));
      return () => cancelAnimationFrame(raf);
    }

    const node = ref.current;
    if (!node) return;

    if (immediate) {
      // 1フレーム目で隠し、2フレーム目で戻す。同フレームだと transition が走らない
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        setArmed(true);
        raf2 = requestAnimationFrame(() => setIsIn(true));
      });
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    }

    const armRaf = requestAnimationFrame(() => setArmed(true));

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsIn(true);
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(node);
    return () => {
      cancelAnimationFrame(armRaf);
      observer.disconnect();
    };
  }, [threshold, rootMargin, immediate]);

  return {
    ref,
    isIn,
    containerProps: {
      ref,
      className: armed ? 'rv-armed' : undefined,
      'data-in': isIn ? 'true' : undefined,
    },
    /** 子要素に付けるクラス。順番を渡すと stagger になる */
    item: (index = 0): { className: string; style: React.CSSProperties } => ({
      className: `reveal${isIn ? ' is-in' : ''}`,
      style: { ['--rv-i' as string]: index },
    }),
  };
}
