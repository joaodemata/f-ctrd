export interface NavItem {
  path: string;
  label: string;
}

interface NavBarProps {
  items: readonly NavItem[];
  currentPath: string;
}

// Navegacion principal por hash (#/ruta), ver hooks/useHashRoute.ts
export function NavBar({ items, currentPath }: NavBarProps) {
  return (
    <nav className="navbar" aria-label="Principal">
      {items.map((item) => (
        <a
          key={item.path}
          href={`#${item.path}`}
          className="navbar__link"
          aria-current={item.path === currentPath ? 'page' : undefined}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
