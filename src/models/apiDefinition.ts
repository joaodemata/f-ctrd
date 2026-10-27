import type { ObjectId } from './opportunity';

// Espejo de models/apis_model.go en C-TRD. GET /list/apis no retorna la configuracion de la peticion
// (url, auth, data fija), solo lo necesario para crear una condicion

// Tipos de dato de un parametro (common/constants.go). El valor siempre se envia como texto
export const ApiParameterType = {
  String: 'STRING',
  Integer: 'INTEGER',
  Float: 'FLOAT',
  Boolean: 'BOOLEAN',
  Date: 'DATE', // YYYY-MM-DD
} as const;

// Origen de las opciones de un parametro (options.source)
export const ApiParameterOptionsSource = {
  Static: 'STATIC', // opciones en options.values
  Api: 'API', // salen de otra API; C-TRD todavia no las consulta y acepta cualquier valor
} as const;

export interface ApiParameterOption {
  value: string;
  label: string;
}

export interface ApiParameterOptions {
  source: string;
  values: ApiParameterOption[] | null;
  idApi: ObjectId | null;
  itemsPath: string;
  valuePath: string;
  labelPath: string;
}

export interface ApiParameter {
  name: string;
  label: string;
  description: string;
  dataType: string;
  isRequired: boolean;
  defaultValue: string | null;
  options: ApiParameterOptions | null;
}

export interface ApiDefinition {
  id: ObjectId;
  idProvider: ObjectId;
  tagProvider: string;
  nameProvider: string;
  tag: string;
  name: string;
  description: string;
  isActive: boolean;
  responseFormat: string;
  parameters: ApiParameter[];
}

// providers/callbacks.go -> CallbackParameter. Parametro que la condicion puede personalizar (ej: un umbral);
// se valida igual que un parametro libre de API (sin opciones)
export interface CallbackParameter {
  name: string;
  label: string;
  description: string;
  dataType: string;
  isRequired: boolean;
  defaultValue: string | null;
  // Rango inclusivo del valor, solo para INTEGER y FLOAT. null si no tiene limite (SOPRE053 si se sale)
  minValue: number | null;
  maxValue: number | null;
}

// providers/callbacks.go -> CallbackInfo. `id` es la llave del FunctionRegistry y lo que se guarda en
// callback_function; `tag` y `name` son solo para mostrar
export interface CallbackInfo {
  id: string;
  tag: string;
  name: string;
  description: string;
  responseFormat: string;
  parameters: CallbackParameter[];
}
