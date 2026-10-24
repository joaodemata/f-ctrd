import { useEffect, useState } from 'react';

// Copia un texto al portapapeles. navigator.clipboard solo existe en contextos seguros (https o localhost)
export function CopyButton({ text, label = 'Copiar' }: { text: string; label?: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  useEffect(() => {
    if (state === 'idle') return;
    const id = setTimeout(() => setState('idle'), 2000);
    return () => clearTimeout(id);
  }, [state]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
    } catch {
      setState('failed');
    }
  };

  return (
    <button type="button" className="button button--small" onClick={copy}>
      {state === 'copied' ? 'Copiado' : state === 'failed' ? 'No se pudo copiar' : label}
    </button>
  );
}
