import type { ComponentType } from 'react';
import { apiBaseUrl } from './api/config';
import { ConditionPage } from './components/ConditionPage';
import { Dashboard } from './components/Dashboard';
import { GoogleTrendsPage } from './components/GoogleTrendsPage';
import { NavBar, type NavItem } from './components/NavBar';
import { TriggerPage } from './components/TriggerPage';
import { useHashRoute } from './hooks/useHashRoute';

interface Route extends NavItem {
  component: ComponentType;
}

const ROUTES: readonly Route[] = [
  { path: '/', label: 'Oportunidades', component: Dashboard },
  { path: '/triggers', label: 'Nuevo trigger', component: TriggerPage },
  { path: '/condiciones', label: 'Condiciones', component: ConditionPage },
  { path: '/google-trends', label: 'Google Trends', component: GoogleTrendsPage },
];

export function App() {
  const path = useHashRoute();
  // Una ruta desconocida muestra las oportunidades
  const route = ROUTES.find((item) => item.path === path) ?? ROUTES[0]!;
  const Page = route.component;

  return (
    <>
      <header className="topbar">
        <span className="topbar__brand">F-CTRD</span>
        <NavBar items={ROUTES} currentPath={route.path} />
        <span className="muted small topbar__api">API {apiBaseUrl}</span>
      </header>
      <Page key={route.path} />
    </>
  );
}
