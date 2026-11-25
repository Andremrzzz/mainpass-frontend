import React, { useEffect, useRef, useState } from 'react';
import { FOCUS_RING } from '../../constants/dashboard';
import { MESSAGE_MAX_LENGTH, QUICK_MESSAGES } from '../../constants/convidado';
import { dayLabel, fmtTime } from '../../utils/convidado';
import { getInitials } from '../../utils/format';

const STATUS_ICON = {
  sent: { icon: 'fa-check', label: 'Enviada', cls: 'text-slate-500' },
  delivered: { icon: 'fa-check-double', label: 'Entregue', cls: 'text-slate-500' },
  read: { icon: 'fa-check-double', label: 'Lida', cls: 'text-accent-muted' },
};

/**
 * Aba "Chat com o Morador". O estado vem de useGuestChat (nível da página).
 * Enter envia; Shift+Enter quebra a linha.
 */
export default function ChatTab({ chat, host, now }) {
  const { messages, loading, unread, send, markRead } = chat;
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  // Mensagens recebidas enquanto a aba está aberta contam como lidas
  useEffect(() => {
    if (unread > 0) markRead();
  }, [unread, markRead]);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' });
  }, [messages.length]);

  const submit = async (value) => {
    const clean = value.trim();
    if (!clean || sending) return;
    setSending(true);
    try {
      await send(clean);
      setText('');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit(text);
    }
  };

  let lastDay = null;

  return (
    <section className="flex h-[min(70vh,640px)] flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-brand-800 shadow-card" aria-label="Chat com o morador">
      <div className="flex items-center gap-3 border-b border-white/[0.08] px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-slate-200">{getInitials(host?.nome || 'M')}</div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-100">{host?.nome || 'Morador'}</p>
          <p className="truncate text-xs text-slate-500">Anfitrião · Bloco {host?.bloco}, unidade {host?.unidade}</p>
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-5 py-4" role="log" aria-live="polite" data-testid="chat-log">
        {loading ? (
          <p className="py-10 text-center text-sm text-slate-500">Carregando conversa...</p>
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">Nenhuma mensagem ainda. Diga olá ao morador!</p>
        ) : (
          messages.map((m) => {
            const day = dayLabel(m.ts, now);
            const showDay = day !== lastDay;
            lastDay = day;
            const mine = m.from === 'guest';
            const st = STATUS_ICON[m.status] ?? STATUS_ICON.sent;
            return (
              <React.Fragment key={m.id}>
                {showDay && <p className="py-2 text-center text-[11px] font-medium uppercase tracking-wider text-slate-600">{day}</p>}
                <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm sm:max-w-[70%] ${
                      mine ? 'rounded-br-md bg-accent text-white' : 'rounded-bl-md border border-white/[0.08] bg-brand-700 text-slate-200'
                    }`}
                    data-from={m.from}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.text}</p>
                    <p className={`mt-1 flex items-center justify-end gap-1.5 text-[11px] ${mine ? 'text-indigo-200' : 'text-slate-500'}`}>
                      {fmtTime(m.ts)}
                      {mine && <i className={`fas ${st.icon} text-[10px] ${m.status === 'read' ? 'text-sky-200' : 'text-indigo-200/70'}`} title={st.label} aria-label={st.label}></i>}
                    </p>
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
        <div ref={endRef}></div>
      </div>

      <div className="border-t border-white/[0.08] px-5 py-3">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {QUICK_MESSAGES.map((q) => (
            <button
              key={q}
              type="button"
              disabled={sending}
              onClick={() => submit(q)}
              className={`rounded-full border border-white/[0.1] px-3 py-1.5 text-xs text-slate-300 transition-colors duration-200 hover:border-white/25 hover:bg-white/[0.04] disabled:opacity-50 ${FOCUS_RING}`}
            >
              {q}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(text);
          }}
          className="flex items-end gap-2"
        >
          <label htmlFor="chat-input" className="sr-only">Mensagem</label>
          <textarea
            id="chat-input"
            rows={1}
            value={text}
            maxLength={MESSAGE_MAX_LENGTH}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escreva uma mensagem..."
            className="max-h-28 min-h-[2.75rem] flex-1 resize-none rounded-lg border border-white/15 bg-brand-900 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-colors duration-200 hover:border-white/25 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            aria-label="Enviar mensagem"
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent text-white shadow-card transition-colors duration-200 hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
          >
            <i className="fas fa-paper-plane text-sm"></i>
          </button>
        </form>
        <p className="mt-1.5 text-[11px] text-slate-600">Enter envia · Shift+Enter quebra a linha</p>
      </div>
    </section>
  );
}
