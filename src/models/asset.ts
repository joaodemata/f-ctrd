import type { ObjectId } from './opportunity';

// Espejo de models/assets_model.go en C-TRD (tags json en camelCase). GET /list/assets solo proyecta estos campos
export interface Asset {
  id: ObjectId;
  idTypeAsset: ObjectId;
  typeTag: string;
  typeName: string;
  tag: string;
  name: string;
  description: string;
  tagStatus: string;
  status: string;
}
