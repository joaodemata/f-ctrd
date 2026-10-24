import { api } from './client';
import type { ApiResult } from './types';
import type { Catalog, CatalogType } from '../models/catalog';

export interface ListCatalogsData {
  catalogs: Catalog[];
}

// GET /list/catalogs?typeCatalog=TYPE_ACTION: todos los catalogos del tipo, ordenados por nombre
export function listCatalogs(typeCatalog: CatalogType, signal?: AbortSignal): Promise<ApiResult<ListCatalogsData>> {
  return api.get<ListCatalogsData>('/list/catalogs', { query: { typeCatalog }, signal });
}
