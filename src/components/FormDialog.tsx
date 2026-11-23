import { useEffect, useRef, type ReactNode } from 'react';
import { t } from '../i18n/language';

interface FormDialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

// Formulario en un dialog modal (Escape, foco y fondo los maneja el navegador). En telefono es una hoja inferior
// (.sheet) y en pantallas mas anchas una ventana centrada. No se cierra al tocar el fondo para no perder lo escrito
export function FormDialog({ open, title, onClose, children }: FormDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="sheet sheet--form"
      aria-label={title}
      // Escape: se cierra desde el estado del padre para que open quede sincronizado
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="sheet__head">
        <strong>{title}</strong>
        <button type="button" className="sheet__close" aria-label={t('Cerrar', 'Close')} onClick={onClose}>
          ×
        </button>
      </div>
      <div className="sheet__body">{open && children}</div>
    </dialog>
  );
}
