import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

interface InfoPopoverProps {
  label: string; // nombre accesible del boton
  children: ReactNode;
}

// Boton "i" que abre una nota corta debajo. Se cierra con Escape, con otro clic en el boton o fuera de la nota
export function InfoPopover({ label, children }: InfoPopoverProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <span className="info" ref={rootRef}>
      <button
        type="button"
        className="info__button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        i
      </button>
      {open && (
        <div className="info__panel" id={panelId} role="note">
          {children}
        </div>
      )}
    </span>
  );
}
