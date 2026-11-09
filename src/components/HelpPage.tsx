import { useEffect } from 'react';
import { apiBaseUrl } from '../api/config';
import { currentLanguage, t } from '../i18n/language';
import { HelpContentEn } from './HelpContentEn';
import { HelpContentEs } from './HelpContentEs';
import { SECTIONS, scrollToSection } from './HelpShared';
import { SeedwiseLogo } from './SeedwiseLogo';

// Ayuda funcional de C-TRD. Lo que se explica aqui sale del codigo de C-TRD (controllers/hook.controller.go,
// data_validates/hook_data_validate.go, data_validates/operation_data_validate.go, cronjobs/check_conditions.go,
// cronjobs/check_opportunities.go, providers/callbacks.go, models/catalogs_model.go -> VisibleToUserFilter,
// data_validates/list_data_validate.go -> status de condiciones); si cambia alli, revisar. La guia extendida
// (TradingView, n8n, ejemplos, enlaces) esta en HelpGuide.tsx.
// El cuerpo existe en dos idiomas: HelpContentEs.tsx + HelpGuide.tsx (espanol) y HelpContentEn.tsx + HelpGuideEn.tsx
// (ingles). Al cambiar algo hay que actualizar los dos. Las piezas comunes (indice, catalogos, diagrama) estan en
// HelpShared.tsx

// PDF sin dependencias: la ventana de impresion del navegador ("Guardar como PDF") con los estilos de @media print.
// Al imprimir (boton o Ctrl+P) se abren todos los <details> para que el PDF tenga la guia completa y despues quedan
// como estaban. El titulo del documento es el nombre de archivo que sugiere el navegador
function usePrintableGuide() {
  useEffect(() => {
    let opened: HTMLDetailsElement[] = [];
    let previousTitle = document.title;
    const before = () => {
      opened = [...document.querySelectorAll<HTMLDetailsElement>('.help details:not([open])')];
      opened.forEach((details) => (details.open = true));
      previousTitle = document.title;
      document.title = `seedwise-${t('ayuda', 'help')}-${new Date().toISOString().slice(0, 10)}`;
    };
    const after = () => {
      opened.forEach((details) => (details.open = false));
      opened = [];
      document.title = previousTitle;
    };
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
    };
  }, []);
}

// Portada e indice: solo se ven en el PDF (el indice de botones no sirve en papel)
function PrintCover() {
  const today = new Date().toLocaleDateString(currentLanguage(), { day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <header className="help-cover">
      <div className="help-cover__brand">
        <SeedwiseLogo className="help-cover__logo" />
        <span>seedwise.io</span>
      </div>
      <h1>{t('Guia de uso', 'User guide')}</h1>
      <p className="tagline">{t('Invierte como jardinero, no como apostador.', 'Invest like a gardener, not like a gambler.')}</p>
      <p className="muted">
        {t(
          `Triggers, condiciones, oportunidades, TradingView, n8n y agentes de IA. Generada el ${today} desde `,
          `Triggers, conditions, opportunities, TradingView, n8n and AI agents. Generated on ${today} from `,
        )}
        <code>{apiBaseUrl}</code>
        {t('; los catalogos son los vigentes en ese momento.', '; the catalogs are the ones in force at that time.')}
      </p>
      <h2>{t('Contenido', 'Contents')}</h2>
      <ol className="help-cover__toc">
        {SECTIONS.map((section) => (
          // En el PDF el ancla es un enlace interno a la seccion (en pantalla la portada no se muestra)
          <li key={section.id}>
            <a href={`#${section.id}`}>{t(section.label)}</a>
          </li>
        ))}
      </ol>
    </header>
  );
}

export function HelpPage() {
  usePrintableGuide();
  return (
    <main className="page page--narrow help">
      <PrintCover />
      <div className="page__head help-head">
        <div>
          <h1>{t('Ayuda', 'Help')}</h1>
          <p className="tagline">{t('Invierte como jardinero, no como apostador.', 'Invest like a gardener, not like a gambler.')}</p>
          <p className="muted small">
            {t(
              'Como nace una oportunidad, como la mueven las condiciones y como combinarlas para armar senales.',
              'How an opportunity is born, how conditions move it and how to combine them to build signals.',
            )}
          </p>
        </div>
        <button type="button" className="button help-pdf" onClick={() => window.print()}>
          {t('Descargar PDF', 'Download PDF')}
        </button>
      </div>
      <p className="muted small help-pdf-hint">
        {t(
          'El PDF incluye la guia completa (los bloques plegados se abren). En la ventana de impresion elige ',
          'The PDF includes the full guide (collapsed blocks are expanded). In the print dialog choose ',
        )}
        <em>{t('Guardar como PDF', 'Save as PDF')}</em>.
      </p>

      <nav className="help-index" aria-label={t('En esta pagina', 'On this page')}>
        {SECTIONS.map((section) => (
          <button key={section.id} type="button" className="button button--small" onClick={() => scrollToSection(section.id)}>
            {t(section.label)}
          </button>
        ))}
      </nav>

      {currentLanguage() === 'en' ? <HelpContentEn /> : <HelpContentEs />}
    </main>
  );
}
