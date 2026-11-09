import { useEffect, useState } from 'react';
import { t } from '../i18n/language';

// Copia un texto al portapapeles. navigator.clipboard solo existe en contextos seguros (https o localhost)
export function CopyButton({ text, label = t('Copiar', 'Copy') }: { text: string; label?: string }) {
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
      {state === 'copied' ? t('Copiado', 'Copied') : state === 'failed' ? t('No se pudo copiar', 'Could not copy') : label}
    </button>
  );
}
