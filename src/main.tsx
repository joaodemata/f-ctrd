import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { AuthProvider } from './hooks/useAuth';
import { LanguageProvider } from './i18n/language';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('No existe el elemento #root en index.html');

createRoot(root).render(
  <StrictMode>
    <AuthProvider>
      {/* La key vuelve a montar la app al cambiar de idioma: t() y los formateadores leen el idioma del modulo */}
      <LanguageProvider>{(language) => <App key={language} />}</LanguageProvider>
    </AuthProvider>
  </StrictMode>,
);
