import type { ObjectId } from './opportunity';
import type { RecordOwner } from './user';

// Espejo de models/agent_theses_model.go en C-TRD. Idea de inversion que el super usuario deja en la cola de los
// agentes; cada viernes la corrida toma las AGENT_THESES_PER_RUN mas antiguas pendientes (FIFO)
export interface AgentThesis extends RecordOwner {
  id: ObjectId;
  thesis: string;
  idAsset: ObjectId;
  tagAsset: string;
  asset: string;
  idAction: ObjectId;
  tagAction: string;
  action: string;
  // Catalogo AGENT_THESIS_STATUS
  idStatus: ObjectId;
  tagStatus: string;
  status: string;
  // Momento en que una corrida la tomo, null si nunca se tomo
  claimedAt: string | null;
  lastUpdatedAt: string;
  createdDate: string;
}

// Un intento de un agente: su salida JSON y los problemas que encontraron las validaciones o el backend
export interface AgentRunStep {
  agent: string; // AgentName
  attempt: number; // desde 1
  output: Record<string, unknown> | null; // {} si no fue un JSON valido
  problems: string[] | null; // [] si fue aceptada
  createdAt: string;
}

// Espejo de models/agent_runs_model.go en C-TRD. Corrida de los agentes sobre una tesis, a nombre del usuario agente
export interface AgentRun extends RecordOwner {
  id: ObjectId;
  idThesis: ObjectId;
  // Copia de la tesis al momento de la corrida
  thesis: string;
  idAsset: ObjectId;
  tagAsset: string;
  asset: string;
  idAction: ObjectId;
  tagAction: string;
  action: string;
  // Catalogo AGENT_RUN_STATUS
  idStatus: ObjectId;
  tagStatus: string;
  status: string;
  steps: AgentRunStep[] | null;
  // Condiciones y trigger que creo la corrida (quedan pendientes de aprobacion)
  idConditions: ObjectId[] | null;
  idTrigger: ObjectId | null;
  error: string | null;
  startedAt: string;
  finishedAt: string | null; // null mientras esta en ejecucion
  lastUpdatedAt: string;
  createdDate: string;
}

// Tesis que toma cada corrida (AgentThesesPerRun en common/constants.go)
export const AGENT_THESES_PER_RUN = 5;

// Placeholder del codigo de un trigger que C-TRD reemplaza por el id del webhook (TriggerCodeWebhookPlaceholder)
export const TRIGGER_CODE_WEBHOOK_PLACEHOLDER = '{{ID_WEBHOOK}}';

export interface StatusOption {
  tag: string;
  name: string;
}

// AGENT_THESIS_STATUS (common/constants.go)
export const AgentThesisStatusTag = {
  Pending: 'THESIS-PENDING',
  Processing: 'THESIS-PROCESSING',
  Processed: 'THESIS-PROCESSED',
} as const;

export const AGENT_THESIS_STATUSES: readonly StatusOption[] = [
  { tag: AgentThesisStatusTag.Pending, name: 'Pendiente' },
  { tag: AgentThesisStatusTag.Processing, name: 'Procesando' },
  { tag: AgentThesisStatusTag.Processed, name: 'Procesada' },
];

// AGENT_RUN_STATUS (common/constants.go)
export const AgentRunStatusTag = {
  Running: 'RUN-RUNNING',
  Success: 'RUN-SUCCESS',
  NeedsInput: 'RUN-NEEDS-INPUT',
  Failed: 'RUN-FAILED',
} as const;

export const AGENT_RUN_STATUSES: readonly StatusOption[] = [
  { tag: AgentRunStatusTag.Running, name: 'En ejecucion' },
  { tag: AgentRunStatusTag.Success, name: 'Exitosa' },
  { tag: AgentRunStatusTag.NeedsInput, name: 'Requiere informacion' },
  { tag: AgentRunStatusTag.Failed, name: 'Fallida' },
];

// Agentes que registran pasos en una corrida (AgentRunStepFormat.agent)
export const AGENT_NAMES: Readonly<Record<string, string>> = {
  CONDITION_DESIGNER: 'Condition Designer',
  TRIGGER_COMPOSER: 'Trigger Composer',
  PINE_AUTHOR: 'Pine Author',
  FINANCIAL_JUDGE: 'Financial Judge',
};

export function agentLabel(agent: string): string {
  return AGENT_NAMES[agent] ?? agent;
}

// Decision del super usuario sobre lo que crea un agente (ReviewDecision* en format_validates)
export const ReviewDecision = {
  Approve: 'APPROVE',
  Reject: 'REJECT',
} as const;

export type ReviewDecision = (typeof ReviewDecision)[keyof typeof ReviewDecision];
