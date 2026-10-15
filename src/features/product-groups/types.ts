// Mirrors ProductGroupTreeItem in the backend's product-group.service.ts. The
// tree endpoint calls the parent `parentId`; the create/update DTO calls the
// same field `under` — the Server Actions translate.

export interface ProductGroup {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
}

/** GET /product-groups/tree node. */
export type ProductGroupTreeNode = ProductGroup & {
  children: ProductGroupTreeNode[];
};

/** No `code`: the backend generates it (PG-0001, …) and rejects a payload
 * that includes one. */
export type ProductGroupInput = Omit<ProductGroup, "id" | "code">;

/** The saved Mongoose document POST/PATCH /product-groups respond with —
 * only the fields the UI reads. */
export interface SavedProductGroup {
  _id: string;
  code: string;
  name: string;
}
