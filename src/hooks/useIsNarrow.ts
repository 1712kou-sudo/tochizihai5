/**
 * 画面が狭いかどうか
 *
 * インラインstyleではメディアクエリが書けないので、
 * レイアウトそのものを組み替えたいところだけこれを使う。
 * 見た目だけの調整は clamp() か globals.css のクラスで済ませること。
 *
 * SSR時は false（＝広い画面）を返す。ハイドレーション後に実際の幅で切り替わる。
 */

'use client';

import { useSyncExternalStore } from 'react';

const QUERY = '(max-width: 760px)';

const subscribe = (onChange: () => void) => {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
};

const getSnapshot = () => window.matchMedia(QUERY).matches;
const getServerSnapshot = () => false;

export function useIsNarrow(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
