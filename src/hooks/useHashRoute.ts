import { useEffect, useState } from 'react';

// Navegacion por hash (#/triggers) sin libreria de rutas: funciona con cualquier servidor estatico
// porque el hash nunca llega al servidor
function currentPath(): string {
  const path = window.location.hash.replace(/^#/, '');
  return path === '' ? '/' : path;
}

export function useHashRoute(): string {
  const [path, setPath] = useState(currentPath);

  useEffect(() => {
    const onChange = () => setPath(currentPath());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return path;
}
