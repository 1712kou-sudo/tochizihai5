/**
 * ヘッダー
 *
 * 主役は市民向け画面ただひとつ。行政・管理向けの画面は
 * 右上の控えめなリンクに格下げし、一般ユーザーを迷わせない。
 */

'use client';

import React from 'react';
import { Clock } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

export type ActiveTab = 'timeline' | 'gov' | 'admin';

interface HeaderProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onHome: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onSelectTab, onHome }) => {
  return (
    <header className="sticky top-0 z-40 glass border-b border-stone-200/80 no-print">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-4">
          {/* ブランド */}
          <button
            type="button"
            onClick={onHome}
            aria-label="けあしる ホームへ"
            className="flex items-center gap-2 rounded-lg"
          >
            <span className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center text-white shrink-0">
              <Clock className="w-4.5 h-4.5" />
            </span>
            <span className="font-bold text-lg tracking-tight text-stone-900">
              けあしる
            </span>
          </button>

          {/* 関係者向けリンクと表示設定 */}
          <div className="flex items-center gap-1">
          <nav className="flex items-center gap-0.5 text-[13px]" aria-label="関係者向け">
            {activeTab !== 'timeline' && (
              <button
                type="button"
                onClick={() => onSelectTab('timeline')}
                className="h-9 px-3 rounded-lg font-semibold text-orange-700 hover:bg-orange-50 transition-colors"
              >
                ← けあしるに戻る
              </button>
            )}
            <button
              type="button"
              onClick={() => onSelectTab('gov')}
              aria-current={activeTab === 'gov' ? 'page' : undefined}
              className={`h-9 px-3 rounded-lg transition-colors ${
                activeTab === 'gov'
                  ? 'text-stone-900 font-semibold bg-stone-100'
                  : 'text-stone-400 hover:text-stone-700 hover:bg-stone-50'
              }`}
            >
              自治体の方へ
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('admin')}
              aria-current={activeTab === 'admin' ? 'page' : undefined}
              className={`h-9 px-3 rounded-lg transition-colors ${
                activeTab === 'admin'
                  ? 'text-stone-900 font-semibold bg-stone-100'
                  : 'text-stone-400 hover:text-stone-700 hover:bg-stone-50'
              }`}
            >
              サービス管理
            </button>
          </nav>
          <span className="w-px h-5 bg-stone-200 mx-1" aria-hidden="true" />
          <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
};
