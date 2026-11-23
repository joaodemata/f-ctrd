import type { Localized } from '../i18n/language';
import type { ObjectId } from './opportunity';
import type { RecordOwner } from './user';

// Espejo de models/portfolio_model.go (PortfolioAsset). La posicion la reconstruye C-TRD desde las transacciones del
// asset; el valor de mercado no se guarda, llega en el ROI
export interface PortfolioAsset {
  idAsset: ObjectId;
  idTypeAsset: ObjectId;
  typeTagAsset: string;
  typeNameAsset: string;
  typeDescriptionAsset: string;
  tagAsset: string;
  nameAsset: string;
  descriptionAsset: string;
  quantity: number;
  averageCost: number; // dolares por unidad, incluye comisiones de compra
  costBasis: number; // dolares invertidos en la cantidad que sigue en el portfolio
  realizedPnl: number;
}

// Espejo de PortfolioModelType. Cada usuario solo ve los suyos
export interface Portfolio extends RecordOwner {
  id: ObjectId;
  tag: string;
  name: string;
  description: string;
  assets: PortfolioAsset[] | null;
  lastUpdatedAt: string;
  createdDate: string;
}

// Espejo de models/portfolio_transactions_model.go (PortfolioTransactionsModelType). Montos siempre positivos: la
// direccion la da el tipo. Deposito y retiro no tienen asset (idAsset null, textos vacios)
export interface PortfolioTransaction extends RecordOwner {
  id: ObjectId;
  comment: string;
  idPortfolio: ObjectId;
  idTypeTransaction: ObjectId;
  tagTypeTransaction: string;
  nameTypeTransaction: string;
  descriptionTypeTransaction: string;
  idAsset: ObjectId | null;
  idTypeAsset: ObjectId | null;
  typeTagAsset: string;
  typeNameAsset: string;
  typeDescriptionAsset: string;
  tagAsset: string;
  nameAsset: string;
  descriptionAsset: string;
  quantity: number;
  unitPrice: number;
  value: number; // quantity * unitPrice en compras y ventas, sin comisiones
  fee: number;
  executedAt: string;
  idOpportunity: ObjectId | null;
  lastUpdatedAt: string;
  createdDate: string;
}

// services/list_service.go -> PortfolioAssetRoi. Los campos de mercado son null si no se obtuvo el precio
export interface PortfolioAssetRoi extends PortfolioAsset {
  marketPrice: number | null;
  marketValue: number | null;
  unrealizedPnl: number | null;
}

// PortfolioRoiTotals. Los assets sin precio se valoran a su costo
export interface PortfolioRoiTotals {
  investedCost: number; // total pagado en compras (value + fee)
  costBasis: number;
  marketValue: number;
  realizedPnl: number;
  unrealizedPnl: number;
  roiOnInvested: number | null; // fraccion (0.12 = 12 %)
  netDeposits: number;
  cash: number;
  equity: number; // cash + valor de mercado
  roiOnEquity: number | null; // null sin depositos o con cash negativo
}

// OpportunityRoi: resultado de las transacciones ligadas a una oportunidad con su propio costo promedio. Los datos de
// la oportunidad quedan vacios si ya no es visible para el usuario
export interface OpportunityRoi {
  idOpportunity: ObjectId;
  tagTrigger: string;
  tagAction: string;
  tagStatus: string;
  idAsset: ObjectId;
  tagAsset: string;
  transactions: number;
  quantityBought: number;
  quantitySold: number;
  openQuantity: number;
  investedCost: number;
  proceeds: number;
  averageCost: number;
  realizedPnl: number;
  marketPrice: number | null;
  unrealizedPnl: number | null;
  roi: number | null;
  // Cambio de precio planeado entre la activacion y el cierre de la oportunidad, para comparar con roi
  plannedPriceChange: number | null;
  warning?: string;
}

// PortfolioRoi. partial: algun precio no se obtuvo y esos assets se valoraron a su costo. warnings llegan en espanol
export interface PortfolioRoi {
  idPortfolio: ObjectId;
  partial: boolean;
  assets: PortfolioAssetRoi[];
  totals: PortfolioRoiTotals;
  opportunities: OpportunityRoi[];
  warnings: string[];
  calculatedAt: string;
}

// TYPE_TRANSACTION (common/constants.go -> TransactionType*). Se usan los ids fijos en lugar de pedir el catalogo
export interface TransactionTypeInfo {
  id: ObjectId;
  tag: string;
  name: string; // nombre en C-TRD
  label: Localized;
  // Compra y venta mueven la posicion (quantity + unitPrice); dividendo, deposito y retiro llevan value
  movesPosition: boolean;
  needsAsset: boolean;
  // Signo del efectivo: entra (+1) o sale (-1) del portfolio
  cashSign: 1 | -1;
}

export const TransactionTypeTag = {
  Buy: 'TRANSACTION-BUY',
  Sell: 'TRANSACTION-SELL',
  Dividend: 'TRANSACTION-DIVIDEND',
  Deposit: 'TRANSACTION-DEPOSIT',
  Withdrawal: 'TRANSACTION-WITHDRAWAL',
} as const;

export const TRANSACTION_TYPES: readonly TransactionTypeInfo[] = [
  {
    id: '6af9aad4c3e8131cda0c5183',
    tag: TransactionTypeTag.Buy,
    name: 'Compra',
    label: { es: 'Compra', en: 'Buy' },
    movesPosition: true,
    needsAsset: true,
    cashSign: -1,
  },
  {
    id: '6af9aad462469d39d6a86d80',
    tag: TransactionTypeTag.Sell,
    name: 'Venta',
    label: { es: 'Venta', en: 'Sell' },
    movesPosition: true,
    needsAsset: true,
    cashSign: 1,
  },
  {
    id: '6af9aad421702109f93bd590',
    tag: TransactionTypeTag.Dividend,
    name: 'Dividendo',
    label: { es: 'Dividendo', en: 'Dividend' },
    movesPosition: false,
    needsAsset: true,
    cashSign: 1,
  },
  {
    id: '6af9aad46a7bb747aecc1ee0',
    tag: TransactionTypeTag.Deposit,
    name: 'Deposito',
    label: { es: 'Deposito', en: 'Deposit' },
    movesPosition: false,
    needsAsset: false,
    cashSign: 1,
  },
  {
    id: '6af9aad41ab057268aa0dc23',
    tag: TransactionTypeTag.Withdrawal,
    name: 'Retiro',
    label: { es: 'Retiro', en: 'Withdrawal' },
    movesPosition: false,
    needsAsset: false,
    cashSign: -1,
  },
];

export function transactionType(tag: string): TransactionTypeInfo | undefined {
  return TRANSACTION_TYPES.find((item) => item.tag === tag);
}

// Limites de CreatePortfolioFormat / CreatePortfolioTransactionFormat
export const PORTFOLIO_TAG_MAX = 64;
export const PORTFOLIO_NAME_MAX = 100;
export const PORTFOLIO_DESCRIPTION_MAX = 1000;
export const TRANSACTION_COMMENT_MAX = 1000;
