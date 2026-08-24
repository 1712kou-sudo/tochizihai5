/**
 * ダーク / ライト切替
 *
 * 3状態を順に巡る: システム設定に従う → ライト → ダーク
 * 選択は localStorage に保存し、次回以降は描画前のスクリプト（layout.tsx）が
 * 同じ値を読んで data-theme を当てるため、切り替わりのちらつきが起きない。
 */

'use client';

import React, { useSyncExternalStore } from 'react';
import { Sun, Moon, MonitorSmartphone } from 'lucide-react';

export type ThemeChoice = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'keashiru-theme';

/** data-theme を実際に当てる。system のときは属性を外して OS 設定に委ねる */
function applyTheme(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    root.dataset.themeChoice = 'system';
  } else {
    root.setAttribute('data-theme', choice);
    root.dataset.themeChoice = choice;
  }
}

const ORDER: ThemeChoice[] = ['system', 'light', 'dark'];

const LABELS: Record<ThemeChoice, { icon: React.ElementType; label: string }> = {
  system: { icon: MonitorSmartphone, label: '端末の設定に合わせる' },
  light: { icon: Sun, label: 'ライト' },
  dark: { icon: Moon, label: 'ダーク' },
};

/** data-theme-choice（描画前スクリプトが設定済み）を購読する */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme-choice'],
  });
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const onSystem = () => {
    if (document.documentElement.dataset.themeChoice === 'system') applyTheme('system');
    onChange();
  };
  mq.addEventListener('change', onSystem);
  return () => {
    observer.disconnect();
    mq.removeEventListener('change', onSystem);
  };
}

function getSnapshot(): ThemeChoice {
  const v = document.documentElement.dataset.themeChoice;
  return v === 'light' || v === 'dark' ? v : 'system';
}

export const ThemeToggle: React.FC = () => {
  // DOM を唯一の真実とし、エフェクト内での setState を避ける
  const choice = useSyncExternalStore<ThemeChoice>(
    subscribe,
    getSnapshot,
    () => 'system' // サーバー描画時
  );
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const cycle = () => {
    const next = ORDER[(ORDER.indexOf(choice) + 1) % ORDER.length];
    applyTheme(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  // サーバー描画時は中身を確定できないので、場所だけ確保しておく
  const current = LABELS[choice];
  const Icon = current.icon;

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`表示テーマ: ${current.label}（クリックで切り替え）`}
      title={`表示テーマ: ${current.label}`}
      className="press-sm w-9 h-9 rounded-lg text-stone-400 hover:text-stone-800 hover:bg-stone-100 flex items-center justify-center transition-colors shrink-0"
    >
      {mounted ? <Icon className="w-4 h-4" /> : <span className="w-4 h-4" />}
    </button>
  );
};
