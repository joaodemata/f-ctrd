import { api } from './client';
import type { ApiResult } from './types';
import type { Portfolio, PortfolioRoi, PortfolioTransaction } from '../models/portfolio';

// Portfolio y transacciones del usuario de la sesion (super usuario o generico; el agente no tiene portfolio). Cada
// usuario solo ve y edita los suyos. Rutas en routers/list_route.go y routers/operation_route.go de C-TRD

// Query params de GET /list/portfolios (PaginationFormat)
export interface ListPortfoliosParams {
  limit?: number; // 1 a 100
  page?: number;
  search?: string; // literal (tag, nombre y descripcion)
}

// Los mas antiguos primero. `page` es el total de documentos que cumplen el filtro
export interface ListPortfoliosData {
  portfolios: Portfolio[];
  page: number;
}

export function listPortfolios(params: ListPortfoliosParams, signal?: AbortSignal): Promise<ApiResult<ListPortfoliosData>> {
  return api.get<ListPortfoliosData>('/list/portfolios', { query: { ...params }, signal });
}

// Query params de GET /list/portfolio_transactions (PaginationFormat + ListPortfolioTransactionsFormat)
export interface ListPortfolioTransactionsParams {
  idPortfolio: string;
  limit?: number;
  page?: number;
  search?: string; // literal (comentario, tag y nombre del asset)
  startDate?: string; // filtra executedAt, YYYY-MM-DD o RFC3339
  endDate?: string;
  idAsset?: string;
  idOpportunity?: string;
  tagTypeTransaction?: string; // TransactionTypeTag
}

// Las ejecutadas mas recientemente primero. `page` es el total de documentos que cumplen el filtro
export interface ListPortfolioTransactionsData {
  transactions: PortfolioTransaction[];
  page: number;
}

export function listPortfolioTransactions(
  params: ListPortfolioTransactionsParams,
  signal?: AbortSignal,
): Promise<ApiResult<ListPortfolioTransactionsData>> {
  return api.get<ListPortfolioTransactionsData>('/list/portfolio_transactions', { query: { ...params }, signal });
}

// GET /list/portfolio_roi: calculado al momento con los precios de mercado (una consulta por asset en C-TRD)
export interface PortfolioRoiData {
  roi: PortfolioRoi;
}

export function getPortfolioRoi(idPortfolio: string, signal?: AbortSignal): Promise<ApiResult<PortfolioRoiData>> {
  return api.get<PortfolioRoiData>('/list/portfolio_roi', { query: { idPortfolio }, signal });
}

// Body de POST /operation/create/portfolio. El tag no se repite entre los portfolios del usuario (DVOPR051)
export interface CreatePortfolioBody {
  tag: string;
  name: string;
  description: string;
}

export interface PortfolioIdData {
  idPortfolio: string;
}

export function createPortfolio(body: CreatePortfolioBody, signal?: AbortSignal): Promise<ApiResult<PortfolioIdData>> {
  return api.post<PortfolioIdData>('/operation/create/portfolio', body, { signal });
}

// PUT /operation/update/portfolio: cambia tag, nombre y descripcion; la cartera no cambia
export interface UpdatePortfolioBody extends CreatePortfolioBody {
  idPortfolio: string;
}

export function updatePortfolio(body: UpdatePortfolioBody, signal?: AbortSignal): Promise<ApiResult<PortfolioIdData>> {
  return api.put<PortfolioIdData>('/operation/update/portfolio', body, { signal });
}

// PUT /operation/delete/portfolio: borrado logico del portfolio y sus transacciones
export function deletePortfolio(body: PortfolioIdData, signal?: AbortSignal): Promise<ApiResult<PortfolioIdData>> {
  return api.put<PortfolioIdData>('/operation/delete/portfolio', body, { signal });
}

// Campos de la transaccion (CreatePortfolioTransactionFormat). Lo que lleva cada tipo lo valida C-TRD
// (models.NewPortfolioTransactionModel): compra/venta quantity + unitPrice (value no se envia), dividendo idAsset +
// value, deposito/retiro value sin asset. Solo compras y ventas se ligan a una oportunidad activa o finalizada
export interface PortfolioTransactionFields {
  idTypeTransaction: string;
  idAsset?: string;
  idOpportunity?: string;
  quantity: number;
  unitPrice: number;
  value: number;
  fee: number;
  executedAt: string; // RFC3339, no puede estar en el futuro
  comment: string;
}

export interface CreatePortfolioTransactionBody extends PortfolioTransactionFields {
  idPortfolio: string;
}

export interface TransactionIdData {
  idTransaction: string;
}

export function createPortfolioTransaction(
  body: CreatePortfolioTransactionBody,
  signal?: AbortSignal,
): Promise<ApiResult<TransactionIdData>> {
  return api.post<TransactionIdData>('/operation/create/portfolio_transaction', body, { signal });
}

// PUT /operation/update/portfolio_transaction: reemplaza todos los datos (mismo id y portfolio). C-TRD rechaza el
// cambio si deja ventas mayores a lo disponible
export interface UpdatePortfolioTransactionBody extends PortfolioTransactionFields {
  idTransaction: string;
}

export function updatePortfolioTransaction(
  body: UpdatePortfolioTransactionBody,
  signal?: AbortSignal,
): Promise<ApiResult<TransactionIdData>> {
  return api.put<TransactionIdData>('/operation/update/portfolio_transaction', body, { signal });
}

// PUT /operation/delete/portfolio_transaction: borrado logico, reconstruye la posicion del asset
export function deletePortfolioTransaction(
  body: TransactionIdData,
  signal?: AbortSignal,
): Promise<ApiResult<TransactionIdData>> {
  return api.put<TransactionIdData>('/operation/delete/portfolio_transaction', body, { signal });
}
