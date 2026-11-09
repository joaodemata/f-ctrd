import { useRef, useState, type FormEvent } from 'react';
import { GOOGLE_TRENDS_EXTENSION, GOOGLE_TRENDS_MAX_BYTES, uploadGoogleTrends } from '../api/googleTrends';
import { useApiMutation } from '../hooks/useApiMutation';
import type { Asset } from '../models/asset';
import { formatDate, formatDuration } from '../utils/format';
import { AssetPicker } from './AssetPicker';
import { ErrorBanner } from './ErrorBanner';
import { FormField } from './FormField';
import { t } from '../i18n/language';

interface UploadInput {
  idAsset: string;
  file: File;
}

interface FieldErrors {
  idAsset?: string;
  file?: string;
}

// Mismas reglas que GoogleTrendsUploadFormatValidate en C-TRD (extension y tamano)
function validateFile(file: File | null): string | undefined {
  if (!file) return t('Elige el CSV exportado de Google Trends.', 'Choose the CSV exported from Google Trends.');
  if (!file.name.toLowerCase().endsWith(GOOGLE_TRENDS_EXTENSION)) return t('El archivo debe ser .csv.', 'The file must be .csv.');
  if (file.size === 0) return t('El archivo esta vacio.', 'The file is empty.');
  if (file.size > GOOGLE_TRENDS_MAX_BYTES) {
    return t(`El archivo supera ${GOOGLE_TRENDS_MAX_BYTES >> 10} KB.`, `The file exceeds ${GOOGLE_TRENDS_MAX_BYTES >> 10} KB.`);
  }
  return undefined;
}

function formatPeriod(seconds: number): string {
  if (seconds === 86_400) return t('diario', 'daily');
  if (seconds === 604_800) return t('semanal', 'weekly');
  return t(`cada ${formatDuration(Math.round(seconds / 60))}`, `every ${formatDuration(Math.round(seconds / 60))}`);
}

export function GoogleTrendsPage() {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});
  // Asset de la ultima subida exitosa; el selector puede cambiar despues
  const [uploadedAsset, setUploadedAsset] = useState<Asset | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mutation = useApiMutation(({ idAsset, file }: UploadInput, signal: AbortSignal) =>
    uploadGoogleTrends(idAsset, file, signal),
  );

  // El campo del archivo en C-TRD se llama "file"
  const fieldError = (field: keyof FieldErrors) => clientErrors[field] ?? mutation.error?.fieldErrors[field];

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const errors: FieldErrors = {};
    if (!asset) errors.idAsset = t('Elige un asset.', 'Choose an asset.');
    const fileError = validateFile(file);
    if (fileError) errors.file = fileError;
    setClientErrors(errors);
    if (!asset || !file || Object.keys(errors).length > 0) return;

    const result = await mutation.run({ idAsset: asset.id, file });
    if (result.ok) {
      setUploadedAsset(asset);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const uploaded = mutation.data;

  return (
    <main className="page page--narrow">
      <div className="page__head">
        <div>
          <h1>Google Trends</h1>
          <p className="muted small">
            {t('Sube el CSV exportado de Google Trends de un asset. Las condiciones de la API ', 'Upload the CSV exported from Google Trends for an asset. Conditions using the ')}
            <em>Google Trends Series</em>
            {t(
              ' leen ese archivo; cada subida reemplaza la anterior del mismo asset.',
              ' API read that file; each upload replaces the previous one for the same asset.',
            )}
          </p>
        </div>
      </div>

      {uploaded && (
        <section className="panel panel--padded success" role="status">
          <h2>
            {t('CSV guardado', 'CSV saved')}
            {uploadedAsset ? t(` para ${uploadedAsset.tag}`, ` for ${uploadedAsset.tag}`) : ''}
          </h2>
          <dl className="kv kv--wide">
            <dt>{t('Termino', 'Term')}</dt>
            <dd>{uploaded.keyword || '—'}</dd>
            <dt>{t('Periodos completos', 'Complete periods')}</dt>
            <dd>{uploaded.points}</dd>
            <dt>{t('Frecuencia', 'Frequency')}</dt>
            <dd>{formatPeriod(uploaded.periodSeconds)}</dd>
            <dt>{t('Ultimo periodo', 'Last period')}</dt>
            <dd>
              {formatDate(uploaded.lastDate)} · {t('valor', 'value')} <strong>{uploaded.lastValue}</strong>
            </dd>
          </dl>
        </section>
      )}

      <form className="panel panel--padded form" onSubmit={handleSubmit} noValidate>
        <FormField label="Asset" required as="fieldset" error={fieldError('idAsset')}>
          <AssetPicker value={asset} onChange={setAsset} invalid={!!fieldError('idAsset')} disabled={mutation.isPending} />
        </FormField>

        <FormField
          label={t('Archivo CSV', 'CSV file')}
          required
          error={fieldError('file')}
          hint={t(
            `En Google Trends: Explorar → Interes a lo largo del tiempo → Descargar. Maximo ${GOOGLE_TRENDS_MAX_BYTES >> 10} KB.`,
            `In Google Trends: Explore → Interest over time → Download. Maximum ${GOOGLE_TRENDS_MAX_BYTES >> 10} KB.`,
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={`${GOOGLE_TRENDS_EXTENSION},text/csv`}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            disabled={mutation.isPending}
            aria-invalid={!!fieldError('file')}
          />
        </FormField>

        {mutation.error && <ErrorBanner error={mutation.error} />}

        <div className="form-actions">
          <button type="submit" className="button button--primary" disabled={mutation.isPending}>
            {mutation.isPending ? t('Subiendo…', 'Uploading…') : t('Subir CSV', 'Upload CSV')}
          </button>
        </div>
      </form>
    </main>
  );
}
