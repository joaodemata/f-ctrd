import { useEffect, useState } from 'react';

// Pantallas donde el dashboard usa la version compacta (mismos cortes que styles.css)
export const PHONE_QUERY = '(max-width: 640px)';
export const NARROW_QUERY = '(max-width: 1000px)';

// true mientras la media query se cumple; se actualiza al rotar o cambiar el tamano de la ventana
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = () => setMatches(media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
