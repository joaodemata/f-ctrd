import type { ObjectId } from './opportunity';

// Espejo de models/assets_model.go en C-TRD (tags json en snake_case). GET /list/assets solo proyecta estos campos
export interface Asset {
  id: ObjectId;
  id_type_asset: ObjectId;
  type_tag: string;
  type_name: string;
  tag: string;
  name: string;
  description: string;
  tag_status: string;
  status: string;
}
