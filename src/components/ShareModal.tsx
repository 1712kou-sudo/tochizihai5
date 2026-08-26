/**
 * タイムライン共有モーダル コンポーネント
 * 
 * きょうだいや遠方の親族とタイムラインを共有するための有効期限付きURL（30日）を発行します。
 * 個人情報はサーバーに保存せず、プライバシーを保護します。
 */

'use client';

import React, { useMemo, useRef, useState } from 'react';
import { useDelayedUnmount } from '@/hooks/useDelayedUnmount';
import { useDialogFocus } from '@/hooks/useDialogFocus';
import { X, Copy, Check, Share2, Shield } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  // 共有トークンは一度だけ生成して固定する（表示URLとコピーURLを一致させる）
  const { isMounted, state } = useDelayedUnmount(isOpen);
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(isOpen, onClose, dialogRef);

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
        ref={dialogRef}
        tabIndex={-1}
        className="panel panel-from-top w-full max-w-lg space-y-5 rounded-[28px] border-2 border-[#2D231E] bg-white p-5 sm:p-7"
        data-state={state}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
      >
        <div className="flex items-center justify-between gap-3 border-b-2 border-[#FDE8DC] pb-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FDE8DC]">
              <Share2 className="h-5 w-5 text-[#B94716]" />
            </div>
            <h3 id="share-modal-title" className="text-lg font-bold leading-snug text-[#2D231E]">
              タイムライン共有リンクの発行
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="共有モーダルを閉じる"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-[#2D231E] bg-white text-[#2D231E] transition-colors hover:bg-[#FDE8DC]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm leading-relaxed text-[#5E514A] sm:text-base">
          発行されたリンクをきょうだいや親族にLINE・メールで送ると、同じタイムラインを見ながら「誰がどの枠を担当するか」を話し合えます。
        </p>

        {/* URLコピーボックス */}
        <div className="flex flex-col gap-3 rounded-[20px] border-2 border-[#2D231E] bg-[#FFF7F2] p-3 sm:flex-row sm:items-center">
          <input
            type="text"
            readOnly
            value={shareUrl}
            aria-label="共有URL"
            className="min-h-11 min-w-0 flex-1 select-all truncate rounded-xl bg-white px-3 text-sm text-[#5E514A] outline-none ring-1 ring-[#FDE8DC] focus:ring-2 focus:ring-[#ED6A2C]"
          />
          <button
            type="button"
            onClick={handleCopy}
            className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border-2 px-4 text-sm font-bold transition-colors ${
              copied
                ? 'border-[#2D231E] bg-[#FDE8DC] text-[#2D231E]'
                : 'border-[#2D231E] bg-[#C4511A] text-white hover:bg-[#9D3D12]'
            }`}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                <span>コピー完了</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>URLをコピー</span>
              </>
            )}
          </button>
        </div>

        {/* プライバシー保護・倫理配慮 */}
        <div className="space-y-3 rounded-[20px] border-2 border-[#FDE8DC] bg-[#FFF7F2] p-4 text-sm text-[#5E514A]">
          <div className="flex items-center gap-2 font-bold text-[#2D231E]">
            <Shield className="h-5 w-5 text-[#B94716]" />
            <span>プライバシー・個人情報の保護について</span>
          </div>
          <ul className="list-inside list-disc space-y-1.5 leading-relaxed text-[#756A64]">
            <li>お名前や要配慮個人情報はサーバーに保存されません。</li>
            <li>共有リンクの有効期限は発行から30日間です。</li>
            <li>マス目に記入した担当者メモは各ブラウザ内のみで保持されます。</li>
          </ul>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-xl border-2 border-[#2D231E] bg-[#2D231E] px-6 text-sm font-bold text-white transition-colors hover:bg-[#B94716]"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
