import { useEffect, useState } from 'react';

/**
 * Mensagem temporária (toast).
 * Retorna [mensagem, mostrar]; a mensagem some sozinha após `duration` ms.
 */
export default function useToast(duration = 3000) {
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!message) return undefined;
    const id = setTimeout(() => setMessage(''), duration);
    return () => clearTimeout(id);
  }, [message, duration]);

  return [message, setMessage];
}
