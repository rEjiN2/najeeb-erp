import "server-only";

import { apiGet, type ApiResult } from "@/lib/api";
import { flattenTreeNodes } from "@/lib/tree";

import type { ProductGroup, ProductGroupTreeNode } from "./types";

/** Whole product-group forest from GET /product-groups/tree, flattened to
 * the id/parentId list the master table and "Under" picker work from. */
export async function getProductGroups(): Promise<ApiResult<ProductGroup[]>> {
  const result = await apiGet<ProductGroupTreeNode[]>("/product-groups/tree");
  if (!result.ok) return result;

  return {
    ok: true,
    data: flattenTreeNodes(result.data, ({ id, code, name, parentId }) => ({
      id,
      code,
      name,
      parentId,
    })),
  };
}
