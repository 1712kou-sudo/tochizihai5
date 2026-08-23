/**
 * ヘッダーナビゲーション コンポーネント
 * 
 * アプリのロゴ、各画面（一般向けタイムライン、自治体ダッシュボード、AI収集管理画面）の切り替え、
 * 5分ピッチツアーバーの表示切替、デモ用ワンクリックボタンを提供します。
 */

'use client';

import React from 'react';
import { Clock, Shield, BarChart3, Database, Sparkles, Play } from 'lucide-react';

export type ActiveTab = 'timeline' | 'gov' | 'admin';

interface HeaderProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onLoadDemo: () => void;
  onReset: () => void;
  isTourOpen: boolean;
  onToggleTour: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onLoadDemo,
  onReset,
  isTourOpen,
  onToggleTour,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-xs no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* ロゴとキャッチコピー */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={onReset}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-teal-600/20">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl tracking-tight text-slate-900">
                  ケアタイムライン
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                  v2 ハッカソン版
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                介護の「見えない時間」可視化 × 保険外サービス横断検索
              </p>
            </div>
          </div>

          {/* ナビゲーションタブ */}
          <nav className="flex items-center space-x-1 sm:space-x-2 bg-slate-100/80 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => onSelectTab('timeline')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'timeline'
                  ? 'bg-white text-teal-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Clock className="w-4 h-4 text-teal-600" />
              <span>タイムライン</span>
            </button>

            <button
              onClick={() => onSelectTab('gov')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'gov'
                  ? 'bg-white text-indigo-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <span className="flex items-center">
                自治体D/B
                <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-indigo-100 text-indigo-700 rounded-sm">to G</span>
              </span>
            </button>

            <button
              onClick={() => onSelectTab('admin')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'admin'
                  ? 'bg-white text-amber-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Database className="w-4 h-4 text-amber-600" />
              <span className="flex items-center">
                AI収集・承認
                <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-amber-100 text-amber-700 rounded-sm">管</span>
              </span>
            </button>
          </nav>

          {/* デモ用クイックアクション */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onToggleTour}
              className={`inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                isTourOpen
                  ? 'bg-slate-900 text-teal-300 border-teal-500 shadow-md'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
              title="審査員向け：5分間ピッチのストーリーガイドを展開します"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>5分デモツアー</span>
            </button>

            <button
              onClick={onLoadDemo}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-teal-600 to-emerald-600 text-white hover:from-teal-700 hover:to-emerald-700 shadow-sm hover:shadow-md transition-all active:scale-95"
              title="審査員向け：要介護2・同居家族の典型的な困りごとをワンクリックで読み込みます"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
              <span>デモ用サンプル</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
