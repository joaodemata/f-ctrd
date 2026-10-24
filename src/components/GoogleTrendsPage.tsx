import { useRef, useState, type FormEvent } from 'react';
import { GOOGLE_TRENDS_EXTENSION, GOOGLE_TRENDS_MAX_BYTES, uploadGoogleTrends } from '../api/googleTrends';
import { useApiMutation } from '../hooks/useApiMutation';
import type { Asset } from '../models/asset';
import { formatDate, formatDuration } from '../utils/format';
import { AssetPicker } from './AssetPicker';
import { ErrorBanner } from './ErrorBanner';
import { FormField } from './FormField';

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
  if (!file) return 'Elige el CSV exportado de Google Trends.';
  if (!file.name.toLowerCase().endsWith(GOOGLE_TRENDS_EXTENSION)) return 'El archivo debe ser .csv.';
  if (file.size === 0) return 'El archivo esta vacio.';
  if (file.size > GOOGLE_TRENDS_MAX_BYTES) return `El archivo supera ${GOOGLE_TRENDS_MAX_BYTES >> 10} KB.`;
  return undefined;
}

function formatPeriod(seconds: number): string {
  if (seconds === 86_400) return 'diario';
  if (seconds === 604_800) return 'semanal';
  return `cada ${formatDuration(Math.round(seconds / 60))}`;
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
    if (!asset) errors.idAsset = 'Elige un asset.';
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
            Sube el CSV exportado de Google Trends de un asset. Las condiciones de la API <em>Google Trends Series</em> leen
            ese archivo; cada subida reemplaza la anterior del mismo asset.
          </p>
        </div>
      </div>

      {uploaded && (
        <section className="panel panel--padded success" role="status">
          <h2>CSV guardado{uploadedAsset ? ` para ${uploadedAsset.tag}` : ''}</h2>
          <dl className="kv kv--wide">
            <dt>Termino</dt>
            <dd>{uploaded.keyword || '—'}</dd>
            <dt>Periodos completos</dt>
            <dd>{uploaded.points}</dd>
            <dt>Frecuencia</dt>
            <dd>{formatPeriod(uploaded.periodSeconds)}</dd>
            <dt>Ultimo periodo</dt>
            <dd>
              {formatDate(uploaded.lastDate)} · valor <strong>{uploaded.lastValue}</strong>
            </dd>
          </dl>
        </section>
      )}

      <form className="panel panel--padded form" onSubmit={handleSubmit} noValidate>
        <FormField label="Asset" required as="fieldset" error={fieldError('idAsset')}>
          <AssetPicker value={asset} onChange={setAsset} invalid={!!fieldError('idAsset')} disabled={mutation.isPending} />
        </FormField>

        <FormField
          label="Archivo CSV"
          required
          error={fieldError('file')}
          hint={`En Google Trends: Explorar → Interes a lo largo del tiempo → Descargar. Maximo ${GOOGLE_TRENDS_MAX_BYTES >> 10} KB.`}
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
            {mutation.isPending ? 'Subiendo…' : 'Subir CSV'}
          </button>
        </div>
      </form>
    </main>
  );
}
