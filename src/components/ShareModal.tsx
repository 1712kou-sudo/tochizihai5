/**
 * タイムライン共有モーダル コンポーネント
 * 
 * きょうだいや遠方の親族とタイムラインを共有するための有効期限付きURL（30日）を発行します。
 * 個人情報はサーバーに保存せず、プライバシーを保護します。
 */

'use client';

import React, { useMemo, useState } from 'react';
import { useDelayedUnmount } from '@/hooks/useDelayedUnmount';
import { X, Copy, Check, Share2, Shield } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  // 共有トークンは一度だけ生成して固定する（表示URLとコピーURLを一致させる）
  const { isMounted, state } = useDelayedUnmount(isOpen);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const token = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    return `${window.location.origin}/?share=${token}`;
  }, []);

  if (!isMounted) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div
      className="scrim fixed inset-0 z-50 flex items-center justify-center p-4 no-print"
      data-state={state}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="panel panel-from-top glass-solid rounded-xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-5"
        data-state={state}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center space-x-2.5 text-orange-800">
            <div className="p-2 rounded-xl bg-orange-100">
              <Share2 className="w-5 h-5 text-orange-700" />
            </div>
            <h3 className="font-bold text-lg text-stone-900">タイムライン共有リンクの発行</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-stone-600 leading-relaxed">
          発行されたリンクをきょうだいや親族にLINE・メールで送ると、同じタイムラインを見ながら「誰がどの枠を担当するか」を話し合えます。
        </p>

        {/* URLコピーボックス */}
        <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 flex items-center space-x-2">
          <input
            type="text"
            readOnly
            value={shareUrl}
            className="flex-1 bg-transparent text-xs font-mono text-stone-700 select-all outline-none truncate"
          />
          <button
            type="button"
            onClick={handleCopy}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-orange-600 hover:bg-orange-700 text-white shadow-xs'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>コピー完了</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>URLをコピー</span>
              </>
            )}
          </button>
        </div>

        {/* プライバシー保護・倫理配慮 */}
        <div className="p-4 rounded-lg bg-stone-50 border border-stone-200/80 space-y-2 text-xs text-stone-600">
          <div className="flex items-center space-x-2 font-bold text-stone-800">
            <Shield className="w-4 h-4 text-orange-600" />
            <span>プライバシー・個人情報の保護について</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-stone-500">
            <li>お名前や要配慮個人情報はサーバーに保存されません。</li>
            <li>共有リンクの有効期限は発行から30日間です。</li>
            <li>マス目に記入した担当者メモは各ブラウザ内のみで保持されます。</li>
          </ul>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-all"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
