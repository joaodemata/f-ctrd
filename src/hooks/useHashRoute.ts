import { useEffect, useState } from 'react';

// Navegacion por hash (#/triggers) sin libreria de rutas: funciona con cualquier servidor estatico
// porque el hash nunca llega al servidor. Los parametros van despues de la ruta (#/triggers/versiones?id=...)
function currentHash(): string {
  return window.location.hash.replace(/^#/, '');
}

function useHash(): string {
  const [hash, setHash] = useState(currentHash);

  useEffect(() => {
    const onChange = () => setHash(currentHash());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return hash;
}

// Ruta sin los parametros
export function useHashRoute(): string {
  const path = useHash().split('?')[0] ?? '';
  return path === '' ? '/' : path;
}

// Parametros de la ruta actual
export function useHashParams(): URLSearchParams {
  const query = useHash().split('?')[1] ?? '';
  return new URLSearchParams(query);
}
