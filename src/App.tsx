import { useState, type ComponentType } from 'react';
import { apiBaseUrl } from './api/config';
import { AgentReviewPage } from './components/AgentReviewPage';
import { AgentRunsPage } from './components/AgentRunsPage';
import { AgentThesesPage } from './components/AgentThesesPage';
import { ConditionPage } from './components/ConditionPage';
import { Dashboard } from './components/Dashboard';
import { GoogleTrendsPage } from './components/GoogleTrendsPage';
import { HelpPage } from './components/HelpPage';
import { LoginPage } from './components/LoginPage';
import { MarketBackdrop } from './components/MarketBackdrop';
import { NavBar, type NavItem } from './components/NavBar';
import { RestrictedPage } from './components/RestrictedPage';
import { SeedwiseLogo } from './components/SeedwiseLogo';
import { SessionMenu } from './components/SessionMenu';
import { TriggerPage } from './components/TriggerPage';
import { TriggerVersionsPage } from './components/TriggerVersionsPage';
import { TriggersPage } from './components/TriggersPage';
import { useAuth } from './hooks/useAuth';
import { useHashRoute } from './hooks/useHashRoute';

interface Route extends NavItem {
  component: ComponentType;
  // Rutas de detalle: no salen en la barra y marcan como actual la ruta indicada
  navPath?: string;
  // Solo el super usuario la ve en la barra y puede abrirla (C-TRD exige su sesion en las escrituras)
  superUser?: boolean;
  // Rutas que no salen en la barra (login)
  hidden?: boolean;
}

const ROUTES: readonly Route[] = [
  { path: '/', label: 'Oportunidades', component: Dashboard },
  {
    path: '/triggers',
    label: 'Triggers',
    description: 'Triggers activos: detalle, versiones y edicion',
    group: 'admin',
    component: TriggersPage,
    superUser: true,
  },
  {
    path: '/triggers/nuevo',
    label: 'Nuevo trigger',
    description: 'Crear la senal que abre oportunidades',
    group: 'admin',
    component: TriggerPage,
    superUser: true,
  },
  {
    path: '/triggers/versiones',
    label: 'Versiones',
    component: TriggerVersionsPage,
    navPath: '/triggers',
    superUser: true,
  },
  {
    path: '/condiciones',
    label: 'Condiciones',
    description: 'Crear condiciones y ver su ultima evaluacion',
    group: 'admin',
    component: ConditionPage,
    superUser: true,
  },
  {
    path: '/google-trends',
    label: 'Google Trends',
    description: 'Subir el CSV de Google Trends de un asset',
    group: 'admin',
    component: GoogleTrendsPage,
    superUser: true,
  },
  {
    path: '/agentes/tesis',
    label: 'Tesis de agentes',
    description: 'Cola de ideas que los agentes procesan los viernes',
    group: 'admin',
    component: AgentThesesPage,
    superUser: true,
  },
  {
    path: '/agentes/corridas',
    label: 'Corridas de agentes',
    description: 'Pasos, problemas y resultado de cada corrida',
    group: 'admin',
    component: AgentRunsPage,
    superUser: true,
  },
  {
    path: '/agentes/revision',
    label: 'Revision de agentes',
    description: 'Aprobar o rechazar condiciones y triggers de los agentes',
    group: 'admin',
    component: AgentReviewPage,
    superUser: true,
  },
  { path: '/ayuda', label: 'Ayuda', component: HelpPage },
  { path: '/login', label: 'Iniciar sesion', component: LoginPage, hidden: true },
];

export function App() {
  const path = useHashRoute();
  const auth = useAuth();
  // Cambiar la key vuelve a montar el logo y repite la animacion de crecimiento
  const [logoRun, setLogoRun] = useState(0);
  // Una ruta desconocida muestra las oportunidades
  const route = ROUTES.find((item) => item.path === path) ?? ROUTES[0]!;
  const allowed = !route.superUser || auth.isSuperUser;
  const Page = allowed ? route.component : RestrictedPage;
  const navItems = ROUTES.filter(
    (item) => item.navPath === undefined && !item.hidden && (!item.superUser || auth.isSuperUser),
  );

  return (
    <>
      <MarketBackdrop />
      <header className="topbar">
        <a className="topbar__brand" href="#/" onMouseEnter={() => setLogoRun((run) => run + 1)}>
          <SeedwiseLogo key={logoRun} animated className="topbar__logo" />
          <span className="topbar__wordmark">seedwise</span>
        </a>
        <NavBar items={navItems} currentPath={route.navPath ?? route.path} />
        <span className="muted small topbar__api">API {apiBaseUrl}</span>
        <SessionMenu />
      </header>
      <Page key={`${route.path}:${allowed}`} />
    </>
  );
}
