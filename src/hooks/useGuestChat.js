import { useCallback, useEffect, useRef, useState } from 'react';
import { enviarMensagem, listMensagens, marcarMensagensLidas, subscribeMensagens } from '../services/convidadoService';

/**
 * Estado do chat com o morador, mantido no nível da página para que o contador
 * de não lidas e os avisos funcionem mesmo com outra aba aberta.
 *
 *  - messages: lista em ordem cronológica
 *  - unread:   mensagens do morador ainda não lidas
 *  - send(text), markRead()
 *  - onIncoming(novas): chamado quando chegam mensagens novas do morador
 */
export default function useGuestChat({ onIncoming } = {}) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const known = useRef(null);
  const incomingRef = useRef(onIncoming);
  incomingRef.current = onIncoming;

  useEffect(() => {
    let alive = true;

    const apply = (list) => {
      if (!alive) return;
      if (known.current) {
        const fresh = list.filter((m) => m.from === 'host' && !known.current.has(m.id));
        if (fresh.length) incomingRef.current?.(fresh);
      }
      known.current = new Set(list.map((m) => m.id));
      setMessages(list);
      setLoading(false);
    };

    listMensagens().then(apply, () => alive && setLoading(false));
    const unsubscribe = subscribeMensagens(apply);
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  const send = useCallback((text) => enviarMensagem(text), []);
  const markRead = useCallback(() => marcarMensagensLidas(), []);
  const unread = messages.filter((m) => m.from === 'host' && !m.lida).length;

  return { messages, loading, unread, send, markRead };
}
