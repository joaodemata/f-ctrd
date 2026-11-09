import { useEffect, useId, useRef, useState } from 'react';
import { t, type Localized } from '../i18n/language';

export interface NavItem {
  path: string;
  label: Localized;
  // Texto bajo el nombre en el menu desplegable
  description?: Localized;
  // Los items de un grupo van al menu desplegable en lugar de la barra
  group?: 'admin';
}

interface NavBarProps {
  items: readonly NavItem[];
  currentPath: string;
}

// Navegacion principal por hash (#/ruta), ver hooks/useHashRoute.ts. Las paginas de administracion (las del grupo
// 'admin', solo super usuario) van en un menu desplegable para que la barra no crezca con cada flujo nuevo
export function NavBar({ items, currentPath }: NavBarProps) {
  const navRef = useRef<HTMLElement>(null);
  const mainItems = items.filter((item) => item.group === undefined);
  const adminItems = items.filter((item) => item.group === 'admin');

  // En un celular angosto la barra puede tener scroll horizontal: deja visible la entrada de la pagina actual. Se
  // mueve el scroll de la barra y no se usa scrollIntoView para no desplazar la pagina
  useEffect(() => {
    const nav = navRef.current;
    const current = nav?.querySelector<HTMLElement>('[data-current="true"]');
    if (!nav || !current || nav.scrollWidth <= nav.clientWidth) return;
    const left = current.offsetLeft - nav.offsetLeft;
    if (left < nav.scrollLeft || left + current.offsetWidth > nav.scrollLeft + nav.clientWidth) {
      nav.scrollLeft = left - (nav.clientWidth - current.offsetWidth) / 2;
    }
  }, [currentPath, items]);

  return (
    <nav className="navbar" aria-label={t('Principal', 'Main')} ref={navRef}>
      {mainItems.map((item) => {
        const current = item.path === currentPath;
        return (
          <a
            key={item.path}
            href={`#${item.path}`}
            className="navbar__link"
            aria-current={current ? 'page' : undefined}
            data-current={current}
          >
            {t(item.label)}
          </a>
        );
      })}
      {adminItems.length > 0 && <NavMenu label={t('Administracion', 'Administration')} items={adminItems} currentPath={currentPath} />}
    </nav>
  );
}

interface NavMenuProps {
  label: string;
  items: readonly NavItem[];
  currentPath: string;
}

// Menu desplegable: se cierra al navegar, al tocar fuera o con Escape
function NavMenu({ label, items, currentPath }: NavMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const active = items.some((item) => item.path === currentPath);

  useEffect(() => setOpen(false), [currentPath]);

  useEffect(() => {
    if (!open) return;
    const handlePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    document.addEventListener('pointerdown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div className="nav-menu" ref={rootRef}>
      <button
        ref={toggleRef}
        type="button"
        className="navbar__link nav-menu__toggle"
        aria-expanded={open}
        aria-controls={panelId}
        data-current={active}
        onClick={() => setOpen((value) => !value)}
      >
        {label}
        <svg className="nav-menu__caret" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M3 4.5 L6 7.5 L9 4.5" />
        </svg>
      </button>
      <div id={panelId} className="nav-menu__panel" hidden={!open}>
        <p className="nav-menu__title">{t('Solo super usuario', 'Super user only')}</p>
        <ul className="nav-menu__list">
          {items.map((item) => (
            <li key={item.path}>
              <a
                href={`#${item.path}`}
                className="nav-menu__item"
                aria-current={item.path === currentPath ? 'page' : undefined}
                onClick={() => setOpen(false)}
              >
                <span className="nav-menu__label">{t(item.label)}</span>
                {item.description && <span className="nav-menu__description">{t(item.description)}</span>}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
