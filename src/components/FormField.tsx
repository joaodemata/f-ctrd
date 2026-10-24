import type { ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  children: ReactNode;
  hint?: ReactNode;
  // Mensaje de validacion local o de C-TRD (ApiError.fieldErrors) para este campo
  error?: string;
  required?: boolean;
  // Los grupos de controles (checkboxes, picker) usan fieldset en lugar de label
  as?: 'label' | 'fieldset';
}

export function FormField({ label, children, hint, error, required = false, as = 'label' }: FormFieldProps) {
  const title = (
    <span className="form-field__label">
      {label}
      {required && <span aria-hidden="true"> *</span>}
    </span>
  );
  const footer = (
    <>
      {hint && <span className="form-field__hint">{hint}</span>}
      {error && <span className="form-field__error">{error}</span>}
    </>
  );

  if (as === 'fieldset') {
    return (
      <fieldset className="form-field" data-invalid={!!error}>
        <legend>{title}</legend>
        {children}
        {footer}
      </fieldset>
    );
  }

  return (
    <label className="form-field" data-invalid={!!error}>
      {title}
      {children}
      {footer}
    </label>
  );
}
