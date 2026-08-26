/**
 * ヘッダー
 *
 * 主役は市民向け画面ひとつ。結果画面を見ているときだけ
 * 「条件を変える」「ケアマネジャーに渡す」を出す。
 * 自治体・管理向けの画面は右端の控えめなリンクに置く。
 */

'use client';

import React from 'react';
import { useIsNarrow } from '@/hooks/useIsNarrow';

export type ActiveTab = 'timeline' | 'gov' | 'admin';

const INK = '#2D231E';
const PRIMARY = '#C4511A';
const SUB = '#6E625B';

interface HeaderProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onHome: () => void;
  /** 結果画面を見ているときだけ、条件変更と共有を出す */
  showResultActions?: boolean;
  /** ランディングを見ているときだけ、開始ボタンを出す */
  showStart?: boolean;
  onStart?: () => void;
  onEditConditions?: () => void;
  onHandoff?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onHome,
  showResultActions = false,
  showStart = false,
  onStart,
  onEditConditions,
  onHandoff,
}) => {
  // 狭い画面ではヘッダーに全部は収まらないので、文言と余白を詰める
  const narrow = useIsNarrow();

  const quietLink: React.CSSProperties = {
    minHeight: 44,
    padding: '0 10px',
    fontSize: 13,
    fontWeight: 700,
    color: '#A99C92',
    background: 'transparent',
  };

  return (
    <header
      className="no-print"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: '#FFF8F3',
        borderBottom: `2px solid ${INK}`,
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          padding: '0 clamp(14px,3vw,32px)',
          height: 68,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        {/* ブランド */}
        <button
          type="button"
          onClick={onHome}
          aria-label="けあしる トップページへ"
          title="トップページへ"
          className="press-sm"
          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
        >
          <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true" style={{ flexShrink: 0 }}>
            <rect width="32" height="32" rx="9" fill={PRIMARY} />
            <rect x="9" y="9" width="14" height="14" rx="4" fill="#FFF8F3" />
          </svg>
          <span className="font-display" style={{ fontWeight: 900, fontSize: narrow ? 17 : 19, color: INK, whiteSpace: 'nowrap' }}>
            けあしる
          </span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: narrow ? 8 : 14, minWidth: 0 }}>
          {showResultActions && (
            <>
              <button
                type="button"
                onClick={onEditConditions}
                style={{
                  minHeight: 44, padding: narrow ? '0 2px' : 0,
                  fontSize: narrow ? 13 : 14, fontWeight: 700, color: SUB,
                  textDecoration: 'underline', textUnderlineOffset: 4, whiteSpace: 'nowrap',
                }}
              >
                {narrow ? '条件' : '条件を変える'}
              </button>
              <button
                type="button"
                onClick={onHandoff}
                className="press"
                style={{
                  minHeight: 44, padding: narrow ? '0 14px' : '0 20px', borderRadius: 999,
                  border: `2px solid ${INK}`, background: PRIMARY, color: '#fff',
                  fontSize: narrow ? 13 : 14, fontWeight: 700, boxShadow: `0 3px 0 ${INK}`,
                  whiteSpace: 'nowrap',
                }}
              >
                {narrow ? 'ケアマネに渡す' : 'ケアマネジャーに渡す'}
              </button>
            </>
          )}

          {/* ランディングは縦に長い。下まで行かなくても始められるようにする。 */}
          {showStart && (
            <button
              type="button"
              onClick={onStart}
              className="press"
              style={{
                minHeight: 44, padding: narrow ? '0 16px' : '0 20px', borderRadius: 999,
                border: `2px solid ${INK}`, background: PRIMARY, color: '#fff',
                fontSize: narrow ? 13 : 14, fontWeight: 700, boxShadow: `0 3px 0 ${INK}`,
                whiteSpace: 'nowrap', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 7,
              }}
            >
              1分ではじめる
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
                <path d="M5 12h13M13 6l6 6-6 6" />
              </svg>
            </button>
          )}

          {/* 関係者向け（控えめに） */}
          {/* 狭い画面では隠す。市民向けの導線を優先する。 */}
          <nav className="header-pro-links" aria-label="関係者向け">
            {activeTab !== 'timeline' && (
              <button
                type="button"
                onClick={() => onSelectTab('timeline')}
                style={{ ...quietLink, color: '#B04512', textDecoration: 'underline', textUnderlineOffset: 4 }}
              >
                ← けあしるに戻る
              </button>
            )}
            <button
              type="button"
              onClick={() => onSelectTab('gov')}
              aria-current={activeTab === 'gov' ? 'page' : undefined}
              style={{ ...quietLink, color: activeTab === 'gov' ? INK : '#A99C92' }}
            >
              自治体の方へ
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('admin')}
              aria-current={activeTab === 'admin' ? 'page' : undefined}
              style={{ ...quietLink, color: activeTab === 'admin' ? INK : '#A99C92' }}
            >
              サービス管理
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
