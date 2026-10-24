// Espejo de models/opportunities_model.go en C-TRD (tags json). Los ObjectID llegan como
// string y los time.Time como string RFC3339 en UTC.

export type ObjectId = string;

export const OpportunityStatusTag = {
  Ongoing: 'OPPORTUNITY-ONGOING',
  Active: 'OPPORTUNITY-ACTIVE',
  Finished: 'OPPORTUNITY-FINISHED',
  Expired: 'OPPORTUNITY-EXPIRED',
  Canceled: 'OPPORTUNITY-CANCELED',
} as const;

export type OpportunityStatusTag = (typeof OpportunityStatusTag)[keyof typeof OpportunityStatusTag];

// Catalogo de estados (common/constants.go). `name` es lo que se guarda en el campo status
// y lo que matchea el search del backend
export interface OpportunityStatusInfo {
  tag: OpportunityStatusTag;
  name: string;
}

export const OPPORTUNITY_STATUSES: readonly OpportunityStatusInfo[] = [
  { tag: OpportunityStatusTag.Ongoing, name: 'En Curso' },
  { tag: OpportunityStatusTag.Active, name: 'Activa' },
  { tag: OpportunityStatusTag.Finished, name: 'Finalizada' },
  { tag: OpportunityStatusTag.Expired, name: 'Expirada' },
  { tag: OpportunityStatusTag.Canceled, name: 'Cancelada' },
];

// Estado de cada condicion dentro de la oportunidad (GENERIC_STATUS en common/constants.go)
export const ConditionStatusTag = {
  Active: 'STATUS-ACTIVE',
  Inactive: 'STATUS-INACTIVE',
} as const;

export interface RiskManagement {
  targetPrice: number;
  probability?: number;
}

export interface OpportunityCondition {
  idCondition: ObjectId;
  idProvider: ObjectId;
  nameProvider: string;
  nameCondition: string;
  descriptionCondition: string;
  idStatus: ObjectId;
  tagStatus: string;
  status: string;
}

export interface Opportunity {
  id: ObjectId;
  idTrigger: ObjectId;
  tagTrigger: string;
  trigger: string;
  // El backend lo serializa en snake_case
  description_trigger: string;
  idAsset: ObjectId;
  tagAsset: string;
  asset: string;
  idAction: ObjectId;
  tagAction: string;
  action: string;
  idStatus: ObjectId;
  tagStatus: string;
  status: string;
  conditions: OpportunityCondition[] | null;
  maxCandlestickQty: number;
  idCandlestickTimeframe: ObjectId;
  tagCandlestickTimeframe: string;
  candlestickTimeframe: string;
  expirationDate: string;
  priceTriggered: number | null;
  priceActiveOpportunity: number | null;
  priceAchieved: number | null;
  idCancel: ObjectId | null;
  tagCancelReason: string | null;
  cancelReason: string | null;
  stopLoss: RiskManagement[] | null;
  takeProfit: RiskManagement[] | null;
  metadata: unknown;
  lastUpdatedAt: string;
  createdDate: string;
}
