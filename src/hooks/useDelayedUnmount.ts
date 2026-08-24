/**
 * 退場アニメーションのための遅延アンマウント
 *
 * `if (!isOpen) return null` で即座に消すと閉じる動きが物理的に作れないため、
 * 閉じる指示のあと duration 分だけ DOM に残す。
 *
 * 実装上の注意:
 * 「開く／閉じるの切り替わり」はレンダー中の状態調整で行う（Reactが認めるパターン）。
 * エフェクト本体で同期的に setState すると連鎖レンダーになるため、
 * エフェクトでは rAF とタイマーのコールバック内でのみ状態を変える。
 */

'use client';

import { useEffect, useState } from 'react';

export type PanelState = 'open' | 'closing';

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function useDelayedUnmount(isOpen: boolean, durationMs = 180) {
  const [isMounted, setIsMounted] = useState(isOpen);
  const [state, setState] = useState<PanelState>(isOpen ? 'open' : 'closing');
  const [prevOpen, setPrevOpen] = useState(isOpen);

  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen);
    if (isOpen) setIsMounted(true);
    else setState('closing');
  }

  useEffect(() => {
    if (isOpen) {
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => setState('open'));
      });
      return () => cancelAnimationFrame(raf);
    }

    const timer = window.setTimeout(
      () => setIsMounted(false),
      prefersReducedMotion() ? 0 : durationMs
    );
    return () => window.clearTimeout(timer);
  }, [isOpen, durationMs]);

  return { isMounted, state };
}

/**
 * value が null になっても、閉じ切るまで直前の値を返し続ける。
 */
export function useDelayedValue<T>(value: T | null, durationMs = 180) {
  const [shown, setShown] = useState<T | null>(value);
  const [state, setState] = useState<PanelState>(value ? 'open' : 'closing');
  const [prevValue, setPrevValue] = useState<T | null>(value);

  if (value !== prevValue) {
    setPrevValue(value);
    if (value !== null) setShown(value);
    else setState('closing');
  }

  useEffect(() => {
    if (value !== null) {
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => setState('open'));
      });
      return () => cancelAnimationFrame(raf);
    }

    const timer = window.setTimeout(
      () => setShown(null),
      prefersReducedMotion() ? 0 : durationMs
    );
    return () => window.clearTimeout(timer);
  }, [value, durationMs]);

  return { shown, state };
}
