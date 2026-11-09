import { t, useLanguage, type Language } from '../i18n/language';

const OPTIONS: readonly { value: Language; label: string; name: string }[] = [
  { value: 'es', label: 'ES', name: 'Español' },
  { value: 'en', label: 'EN', name: 'English' },
];

// Idioma de la interfaz en la barra superior. Cambiarlo vuelve a montar la pagina actual (ver main.tsx)
export function LanguageSwitch() {
  const { language, setLanguage } = useLanguage();
  return (
    <span className="segmented language-switch" role="group" aria-label={t('Idioma', 'Language')}>
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          lang={option.value}
          title={option.name}
          aria-label={option.name}
          aria-pressed={language === option.value}
          onClick={() => setLanguage(option.value)}
        >
          {option.label}
        </button>
      ))}
    </span>
  );
}
