import type { ComponentType } from 'react';
import { apiBaseUrl } from './api/config';
import { ConditionPage } from './components/ConditionPage';
import { Dashboard } from './components/Dashboard';
import { GoogleTrendsPage } from './components/GoogleTrendsPage';
import { HelpPage } from './components/HelpPage';
import { NavBar, type NavItem } from './components/NavBar';
import { TriggerPage } from './components/TriggerPage';
import { TriggerVersionsPage } from './components/TriggerVersionsPage';
import { TriggersPage } from './components/TriggersPage';
import { useHashRoute } from './hooks/useHashRoute';

interface Route extends NavItem {
  component: ComponentType;
  // Rutas de detalle: no salen en la barra y marcan como actual la ruta indicada
  navPath?: string;
}

const ROUTES: readonly Route[] = [
  { path: '/', label: 'Oportunidades', component: Dashboard },
  { path: '/triggers', label: 'Triggers', component: TriggersPage },
  { path: '/triggers/nuevo', label: 'Nuevo trigger', component: TriggerPage },
  { path: '/triggers/versiones', label: 'Versiones', component: TriggerVersionsPage, navPath: '/triggers' },
  { path: '/condiciones', label: 'Condiciones', component: ConditionPage },
  { path: '/google-trends', label: 'Google Trends', component: GoogleTrendsPage },
  { path: '/ayuda', label: 'Ayuda', component: HelpPage },
];

const NAV_ITEMS = ROUTES.filter((route) => route.navPath === undefined);

export function App() {
  const path = useHashRoute();
  // Una ruta desconocida muestra las oportunidades
  const route = ROUTES.find((item) => item.path === path) ?? ROUTES[0]!;
  const Page = route.component;

  return (
    <>
      <header className="topbar">
        <span className="topbar__brand">F-CTRD</span>
        <NavBar items={NAV_ITEMS} currentPath={route.navPath ?? route.path} />
        <span className="muted small topbar__api">API {apiBaseUrl}</span>
      </header>
      <Page key={route.path} />
    </>
  );
}
