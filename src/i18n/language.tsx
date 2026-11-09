import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

// Idioma de la interfaz. Los textos que vienen de C-TRD (mensajes de error, nombres de catalogos) llegan en espanol
export type Language = 'es' | 'en';

// Texto en los dos idiomas, para constantes de modulo (rutas, catalogos locales) que se resuelven al renderizar
export interface Localized {
  es: string;
  en: string;
}

const STORAGE_KEY = 'fctrd.language';

// Sin preferencia guardada: ingles si el navegador esta en ingles, si no espanol
function initialLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'es' || stored === 'en') return stored;
  } catch {
    // Sin almacenamiento (modo privado): se usa el idioma del navegador
  }
  return typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('en') ? 'en' : 'es';
}

// Idioma actual a nivel de modulo: lo leen t(), los formateadores y los errores que arma el frontend. Al cambiar de
// idioma LanguageProvider vuelve a montar la app (key), asi que todo lo renderizado se recalcula con el nuevo valor
let current: Language = initialLanguage();

export function currentLanguage(): Language {
  return current;
}

// t('Hola', 'Hello') o t({ es, en }): el texto en el idioma actual
export function t(es: string, en: string): string;
export function t(text: Localized): string;
export function t(text: string | Localized, en?: string): string {
  if (typeof text === 'string') return current === 'en' ? (en ?? text) : text;
  return text[current];
}

// Valor que depende del idioma (formateadores Intl) creado una vez por idioma: memoByLanguage(() => new Intl...)
export function memoByLanguage<T>(factory: (language: Language) => T): () => T {
  const cache = new Map<Language, T>();
  return () => {
    let value = cache.get(current);
    if (value === undefined) {
      value = factory(current);
      cache.set(current, value);
    }
    return value;
  };
}

interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
}

const LanguageContext = createContext<LanguageState | null>(null);

export function LanguageProvider({ children }: { children: (language: Language) => ReactNode }) {
  const [language, setLanguageState] = useState<Language>(current);

  const setLanguage = useCallback((next: Language) => {
    current = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Sin almacenamiento: el idioma vuelve al del navegador al recargar
    }
    setLanguageState(next);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(() => ({ language, setLanguage }), [language, setLanguage]);
  return <LanguageContext.Provider value={value}>{children(language)}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageState {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('useLanguage requiere LanguageProvider');
  return value;
}
