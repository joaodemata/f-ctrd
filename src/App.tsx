import { apiBaseUrl } from './api/config';
import { Dashboard } from './components/Dashboard';

export function App() {
  return (
    <>
      <header className="topbar">
        <span className="topbar__brand">F-CTRD</span>
        <span className="muted small">API {apiBaseUrl}</span>
      </header>
      <Dashboard />
    </>
  );
}
