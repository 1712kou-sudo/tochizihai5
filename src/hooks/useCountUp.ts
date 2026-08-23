/**
 * 数値カウントアップ / カウントダウン用カスタムフック
 * 
 * requestAnimationFrame を使用し、0.35秒〜0.5秒で滑らかに数値をアニメーション変化させます。
 * ライブラリに依存せず軽量かつ確実な動作を実現します。
 */

'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * 渡された数値を滑らかにアニメーションさせて表示用の数値を返すフック
 * 
 * @param targetValue 目標数値
 * @param duration アニメーション所要時間（ミリ秒、デフォルト 350ms）
 * @param decimals 小数点以下の桁数（デフォルト 0）
 * @returns 現在のアニメーション表示値
 */
export function useCountUp(
  targetValue: number,
  duration: number = 350,
  decimals: number = 0
): number {
  const [displayValue, setDisplayValue] = useState<number>(targetValue);
  const startValueRef = useRef<number>(targetValue);
  const startTimeRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    // 目標値が変わったときにアニメーションを開始
    startValueRef.current = displayValue;
    startTimeRef.current = null;

    const animate = (currentTime: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = currentTime;
      }

      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // easeOutCubic イージング関数
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentVal = startValueRef.current + (targetValue - startValueRef.current) * easeOut;

      if (decimals > 0) {
        const factor = Math.pow(10, decimals);
        setDisplayValue(Math.round(currentVal * factor) / factor);
      } else {
        setDisplayValue(Math.round(currentVal));
      }

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(targetValue);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [targetValue, duration, decimals]);

  return displayValue;
}
