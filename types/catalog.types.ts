/** Product returned by GET /api/products/. */
export interface CatalogProduct {
  readonly id: number;
  name: string;
  category: string;
  readonly category_slug: string;
  price: number;
  material?: string;
  description?: string;
  image_url: string;
  is_active?: boolean;
  readonly created_at: string;
  readonly updated_at: string;
}
