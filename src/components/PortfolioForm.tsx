import { useState, type FormEvent } from 'react';
import { createPortfolio, updatePortfolio, type CreatePortfolioBody } from '../api/portfolios';
import { useApiMutation } from '../hooks/useApiMutation';
import { t } from '../i18n/language';
import {
  PORTFOLIO_DESCRIPTION_MAX,
  PORTFOLIO_NAME_MAX,
  PORTFOLIO_TAG_MAX,
  type Portfolio,
} from '../models/portfolio';
import { ErrorBanner } from './ErrorBanner';
import { FormField } from './FormField';

interface PortfolioFormProps {
  // Portfolio a editar; sin el se crea uno vacio
  portfolio?: Portfolio;
  onSaved: (idPortfolio: string) => void;
  onCancel: () => void;
}

type FieldErrors = Partial<Record<keyof CreatePortfolioBody, string>>;

function validate(values: CreatePortfolioBody): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.tag) errors.tag = t('Indica un tag.', 'Enter a tag.');
  if (!values.name) errors.name = t('Indica un nombre.', 'Enter a name.');
  return errors;
}

// Alta y edicion de tag, nombre y descripcion. La cartera se arma con las transacciones
export function PortfolioForm({ portfolio, onSaved, onCancel }: PortfolioFormProps) {
  const [values, setValues] = useState<CreatePortfolioBody>({
    tag: portfolio?.tag ?? '',
    name: portfolio?.name ?? '',
    description: portfolio?.description ?? '',
  });
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});
  const save = useApiMutation((body: CreatePortfolioBody, signal: AbortSignal) =>
    portfolio ? updatePortfolio({ ...body, idPortfolio: portfolio.id }, signal) : createPortfolio(body, signal),
  );

  const set = (key: keyof CreatePortfolioBody, value: string) => setValues((current) => ({ ...current, [key]: value }));
  const fieldError = (field: keyof CreatePortfolioBody) => clientErrors[field] ?? save.error?.fieldErrors[field];

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const body = { tag: values.tag.trim(), name: values.name.trim(), description: values.description.trim() };
    const errors = validate(body);
    setClientErrors(errors);
    if (Object.keys(errors).length > 0) return;
    const result = await save.run(body);
    if (result.ok) onSaved(result.data.idPortfolio);
  };

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <div className="form-grid">
        <FormField
          label="Tag"
          required
          error={fieldError('tag')}
          hint={t('Identificador corto, unico entre tus portafolios.', 'Short id, unique among your portfolios.')}
        >
          <input
            value={values.tag}
            maxLength={PORTFOLIO_TAG_MAX}
            placeholder={t('Ej: LARGO-PLAZO', 'E.g.: LONG-TERM')}
            onChange={(event) => set('tag', event.target.value)}
            aria-invalid={!!fieldError('tag')}
          />
        </FormField>
        <FormField label={t('Nombre', 'Name')} required error={fieldError('name')}>
          <input
            value={values.name}
            maxLength={PORTFOLIO_NAME_MAX}
            onChange={(event) => set('name', event.target.value)}
            aria-invalid={!!fieldError('name')}
          />
        </FormField>
      </div>
      <FormField label={t('Descripcion', 'Description')} error={fieldError('description')}>
        <textarea
          rows={3}
          maxLength={PORTFOLIO_DESCRIPTION_MAX}
          value={values.description}
          onChange={(event) => set('description', event.target.value)}
        />
      </FormField>

      {save.error && <ErrorBanner error={save.error} />}

      <div className="form-actions">
        <button type="submit" className="button button--primary" disabled={save.isPending}>
          {save.isPending
            ? t('Guardando…', 'Saving…')
            : portfolio
              ? t('Guardar cambios', 'Save changes')
              : t('Crear portafolio', 'Create portfolio')}
        </button>
        <button type="button" className="button button--ghost" onClick={onCancel} disabled={save.isPending}>
          {t('Cancelar', 'Cancel')}
        </button>
      </div>
    </form>
  );
}
