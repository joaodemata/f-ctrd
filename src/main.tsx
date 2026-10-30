import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { AuthProvider } from './hooks/useAuth';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('No existe el elemento #root en index.html');

createRoot(root).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
