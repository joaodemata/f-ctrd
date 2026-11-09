import { t } from '../i18n/language';
import type { ObjectId } from './opportunity';
import { VISIBILITY } from './visibility';

// Espejo de models/catalogs_model.go en C-TRD (GET /list/catalogs solo proyecta estos campos)
export interface Catalog {
  id: ObjectId;
  typeCatalog: string;
  tag: string;
  name: string;
  description: string;
}

// Valores de typeCatalog (common/constants.go)
export const CatalogType = {
  GenericStatus: 'GENERIC_STATUS',
  OpportunityStatus: 'OPPORTUNITY_STATUS',
  Action: 'TYPE_ACTION',
  Asset: 'TYPE_ASSET',
  CandleStick: 'TYPE_CANDLE_STICK',
  CancelReason: 'CANCEL_REASON',
  Condition: 'TYPE_CONDITION',
  UserPrivileges: 'USER_PRIVILEGES',
  Visibility: 'TYPE_VISIBILITY',
  AgentThesisStatus: 'AGENT_THESIS_STATUS',
  AgentRunStatus: 'AGENT_RUN_STATUS',
} as const;

export type CatalogType = (typeof CatalogType)[keyof typeof CatalogType];

// Duracion en minutos de cada temporalidad (timeframeDurations en common/parsers.go). C-TRD rechaza crear un
// trigger con una temporalidad que no este aqui (DVOPR009); si cambia en el backend debe actualizarse aqui
export const TIMEFRAME_MINUTES: Readonly<Record<string, number>> = {
  '1-MINUTE': 1,
  '5-MINUTES': 5,
  '15-MINUTES': 15,
  '30-MINUTES': 30,
  '1-HOUR': 60,
  '2-HOURS': 120,
  '4-HOURS': 240,
  '1-DAY': 1440,
  '1-WEEK': 10080,
  // Un mes se aproxima a 30 dias
  '1-MONTH': 43200,
};

// Nombre para mostrar de un catalogo de C-TRD (los nombres llegan en espanol). En ingles se traducen los tags conocidos:
// visibilidad y temporalidades ('5-MINUTES' -> '5 minutes'); el resto queda con el nombre de C-TRD
export function catalogLabel(catalog: Pick<Catalog, 'tag' | 'name'>): string {
  const visibility = Object.values(VISIBILITY).find((item) => item.tag === catalog.tag);
  if (visibility) return t(visibility.label);
  const timeframe = /^(\d+)-(MINUTE|HOUR|DAY|WEEK|MONTH)S?$/.exec(catalog.tag);
  if (timeframe && catalog.tag in TIMEFRAME_MINUTES) {
    const [, amount, unit] = timeframe;
    return t(catalog.name, `${amount} ${unit!.toLowerCase()}${amount === '1' ? '' : 's'}`);
  }
  return catalog.name;
}
