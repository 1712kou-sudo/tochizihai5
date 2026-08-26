/**
 * 相談パネル（自由に書いて聞く）
 *
 * 右から出てくるドロワー。入力済みの条件とこの結果の範囲でだけ答え、
 * 判断が要ることは推測せず「ケアマネジャーへの相談事項（案）」を組み立てる。
 */

'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { TimelineMetrics, TimelineSlot, UserInputData } from '@/types';
import { ConsultContext, respond } from '@/utils/consult';
import { useDelayedUnmount } from '@/hooks/useDelayedUnmount';

const INK = '#2D231E';
const PRIMARY = '#C4511A';
const SUB = '#6E625B';
const LINE = '#DCCFC4';

export interface ConsultItem {
  id: string;
  title: string;
  text: string;
  related?: string;
}

type Message =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'ai'; kind: 'answer' | 'escalate' | 'saved'; label: string; text: string };

interface ConsultChatProps {
  isOpen: boolean;
  context: ConsultContext | null;
  userInput: UserInputData;
  slots: TimelineSlot[];
  metrics: TimelineMetrics;
  budget: number;
  /** 開いたときにそのまま送る質問（提案ボタンから来る） */
  seedQuestion?: string;
  onClose: () => void;
  onSaveItem: (item: ConsultItem) => void;
}

/** 空欄から始めたときに押せる質問 */
const SUGGESTIONS = ['費用はどのくらい？', '減らせるものはある？', 'なぜこの組み合わせ？', '空いている枠は？'];

const AI_STYLE = {
  answer: { bg: '#fff', bc: LINE, fg: SUB, label: '入力いただいた条件から' },
  escalate: { bg: '#FFF3EA', bc: '#ED6A2C', fg: '#8A3D07', label: 'ケアマネジャーの判断が必要です' },
  saved: { bg: '#F3F7F2', bc: '#9CBF9A', fg: '#2F5C2C', label: '相談したいことに追加しました' },
} as const;

let seq = 0;
const nextId = () => `m${++seq}`;

export const ConsultChat: React.FC<ConsultChatProps> = ({
  isOpen, context, userInput, slots, metrics, budget, seedQuestion, onClose, onSaveItem,
}) => {
  const { isMounted, state } = useDelayedUnmount(isOpen, 320);

  const [thread, setThread] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [draft, setDraft] = useState<{ title: string; text: string; related?: string } | null>(null);
  const [thinking, setThinking] = useState(false);
  /** 直前の質問（「ケアマネジャーにも確認する」で相談事項に変えるため） */
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);

  const bodyRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);

  // 何について聞いているかが変わったら、その見出しを出しておく
  const label = context?.label ?? 'この結果ぜんたい';

  const scrollToEnd = useCallback(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    if (isOpen) scrollToEnd();
  }, [isOpen, thread, draft, thinking, scrollToEnd]);

  // Esc で閉じる／開いている間は背面をスクロールさせない
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, onClose]);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  const ask = useCallback(
    (question: string, force = false) => {
      const q = question.trim();
      if (!q) return;
      setThread((t) => [...t, { id: nextId(), role: 'user', text: q }]);
      setInput('');
      setDraft(null);
      setLastQuestion(q);
      setThinking(true);

      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        const reply = respond(q, context, userInput, slots, metrics, budget, force);
        setThinking(false);
        setThread((t) => [
          ...t,
          { id: nextId(), role: 'ai', kind: reply.kind, label: AI_STYLE[reply.kind].label, text: reply.text },
        ]);
        if (reply.kind === 'escalate' && reply.draft) {
          setDraft({ title: reply.title ?? '確認したいこと', text: reply.draft, related: reply.related });
        }
      }, 520);
    },
    [context, userInput, slots, metrics, budget]
  );

  // 提案ボタンから開いたときは、そのまま1問目を送る
  const wasOpen = useRef(false);
  useEffect(() => {
    if (isOpen && !wasOpen.current && seedQuestion) ask(seedQuestion);
    wasOpen.current = isOpen;
  }, [isOpen, seedQuestion, ask]);

  const saveItem = () => {
    if (!draft) return;
    onSaveItem({ id: nextId(), title: draft.title, text: draft.text.trim(), related: draft.related });
    setThread((t) => [
      ...t,
      {
        id: nextId(), role: 'ai', kind: 'saved', label: AI_STYLE.saved.label,
        text: `「${draft.title}」を相談したいことに追加しました。ケアマネジャーに送る画面にそのまま載ります。`,
      },
    ]);
    setDraft(null);
  };

  if (!isMounted) return null;

  const canEscalate =
    !draft && !thinking && lastQuestion !== null &&
    thread[thread.length - 1]?.role === 'ai' &&
    (thread[thread.length - 1] as Extract<Message, { role: 'ai' }>).kind === 'answer';

  return (
    <div
      className="scrim"
      data-state={state}
      role="dialog"
      aria-modal="true"
      aria-label="この結果について相談する"
      style={{ position: 'fixed', inset: 0, zIndex: 95, display: 'flex', justifyContent: 'flex-end' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="drawer"
        data-state={state}
        style={{
          width: 'min(520px, 100%)', background: '#FFF8F3', borderLeft: `2px solid ${INK}`,
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* 見出し */}
        <div
          style={{
            padding: '22px 26px', borderBottom: `2px solid ${INK}`, background: '#fff',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h2 className="font-display" style={{ fontSize: 20, fontWeight: 700, color: INK }}>
              この結果について相談する
            </h2>
            <div
              style={{
                marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 7, maxWidth: '100%',
                padding: '5px 12px', borderRadius: 999, background: '#FFF3EA', color: '#8A3D07',
                fontSize: 13, fontWeight: 700,
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: 999, background: PRIMARY, flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="press"
            style={{
              flexShrink: 0, width: 44, height: 44, borderRadius: 999, border: `2px solid ${LINE}`,
              background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4A413A" strokeWidth="2.6" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* やりとり */}
        <div
          ref={bodyRef}
          style={{ flex: 1, overflowY: 'auto', padding: '24px 26px', display: 'flex', flexDirection: 'column', gap: 18 }}
        >
          {thread.length === 0 && !thinking && (
            <div style={{ border: `2px dashed ${LINE}`, borderRadius: 14, background: '#fff', padding: '20px 22px' }}>
              <p style={{ fontSize: 15, lineHeight: 1.95, color: INK }}>
                気になることを、そのまま書いてください。
              </p>
              <p style={{ marginTop: 8, fontSize: 13, lineHeight: 1.9, color: SUB }}>
                「母が嫌がりそう」「金曜は仕事で家にいない」のような書き方でかまいません。
                判断が必要なことは、面談でそのまま使える文章に整理します。
              </p>
            </div>
          )}

          {thread.map((m) =>
            m.role === 'user' ? (
              <div
                key={m.id}
                className="bubble-in"
                style={{
                  padding: '14px 18px', borderRadius: '14px 14px 4px 14px', background: '#F0E7E0',
                  fontSize: 16, lineHeight: 1.85, color: INK, marginLeft: 44, whiteSpace: 'pre-wrap',
                }}
              >
                {m.text}
              </div>
            ) : (
              <div
                key={m.id}
                className="bubble-in"
                style={{
                  border: `2px solid ${AI_STYLE[m.kind].bc}`, borderRadius: '4px 14px 14px 14px',
                  background: AI_STYLE[m.kind].bg, padding: '16px 18px', marginRight: 32,
                }}
              >
                <span
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700,
                    letterSpacing: '0.04em', color: AI_STYLE[m.kind].fg,
                  }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: 999, background: AI_STYLE[m.kind].fg }} />
                  {m.label}
                </span>
                <p style={{ marginTop: 10, fontSize: 15, lineHeight: 1.95, color: INK }}>{m.text}</p>
              </div>
            )
          )}

          {thinking && (
            <div
              className="bubble-in"
              style={{
                alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6,
                border: `2px solid ${LINE}`, borderRadius: '4px 14px 14px 14px', background: '#fff',
                padding: '14px 18px',
              }}
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="thinking-dot"
                  style={{
                    width: 7, height: 7, borderRadius: 999, background: SUB,
                    animationDelay: `${i * 140}ms`,
                  }}
                />
              ))}
            </div>
          )}

          {/* 相談事項（案） */}
          {draft && (
            <div className="bubble-in" style={{ border: `2px solid ${INK}`, borderRadius: 14, background: '#fff', padding: '18px 20px' }}>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', color: '#8A3D07' }}>
                ケアマネジャーへの相談事項（案）
              </span>
              <p style={{ marginTop: 6, fontSize: 13, lineHeight: 1.8, color: SUB }}>内容を直してから追加できます。</p>
              <textarea
                value={draft.text}
                onChange={(e) => setDraft((d) => (d ? { ...d, text: e.target.value } : d))}
                style={{
                  marginTop: 12, width: '100%', boxSizing: 'border-box', minHeight: 124, padding: '14px 16px',
                  border: `2px solid ${LINE}`, borderRadius: 10, background: '#FFFCFA', fontFamily: 'inherit',
                  fontSize: 15, lineHeight: 1.9, color: INK, resize: 'vertical',
                }}
              />
              <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={saveItem}
                  className="press"
                  style={{
                    minHeight: 48, padding: '0 22px', borderRadius: 999, border: `2px solid ${INK}`,
                    background: PRIMARY, color: '#fff', fontSize: 15, fontWeight: 700, boxShadow: `0 3px 0 ${INK}`,
                  }}
                >
                  相談したいことに追加
                </button>
                <button
                  type="button"
                  onClick={() => setDraft(null)}
                  style={{
                    minHeight: 48, padding: '0 16px', fontSize: 14, fontWeight: 700, color: SUB,
                    textDecoration: 'underline', textUnderlineOffset: 4,
                  }}
                >
                  やめる
                </button>
              </div>
            </div>
          )}

          {/* 答えられた内容でも、念のため面談で確認したいとき */}
          {canEscalate && (
            <button
              type="button"
              onClick={() => lastQuestion && ask(lastQuestion, true)}
              className="press"
              style={{
                alignSelf: 'flex-start', minHeight: 44, padding: '0 18px', borderRadius: 999,
                border: `2px solid ${LINE}`, background: '#fff', fontSize: 14, fontWeight: 700, color: '#4A413A',
              }}
            >
              ケアマネジャーにも確認する
            </button>
          )}
        </div>

        {/* 入力 */}
        <div style={{ borderTop: `2px solid ${INK}`, background: '#fff', padding: '16px 26px 20px' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => ask(s)}
                className="press"
                style={{
                  minHeight: 40, padding: '0 14px', borderRadius: 999, border: '2px solid #E8DCD3',
                  background: '#FFF8F3', fontSize: 13, fontWeight: 700, color: '#4A413A',
                }}
              >
                {s}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  ask(input);
                }
              }}
              placeholder="気になることを書いてください"
              style={{
                flex: 1, boxSizing: 'border-box', minHeight: 52, maxHeight: 140, padding: '14px 16px',
                border: `2px solid ${LINE}`, borderRadius: 12, background: '#FFFCFA', fontFamily: 'inherit',
                fontSize: 15, lineHeight: 1.7, color: INK, resize: 'vertical',
              }}
            />
            <button
              type="button"
              onClick={() => ask(input)}
              aria-label="送る"
              className="press"
              style={{
                flexShrink: 0, width: 52, height: 52, borderRadius: 999, border: `2px solid ${INK}`,
                background: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 3px 0 ${INK}`, opacity: input.trim() ? 1 : 0.55,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round">
                <path d="M5 12h13M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
          <p style={{ marginTop: 12, fontSize: 12, lineHeight: 1.8, color: '#8A7F76' }}>
            入力いただいた条件とこの結果の範囲で答えます。判断が必要なことは推測せず、ケアマネジャーへの相談事項として整理します。
          </p>
        </div>
      </div>
    </div>
  );
};
