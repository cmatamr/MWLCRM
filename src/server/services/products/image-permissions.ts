import { forbidden } from "@/server/api/http";

export type ProductImagePermissionUser = {
  id: string;
  role: string;
};

export type ProductImagePermissionProduct = {
  id: string;
};

export function canManageProductImages(
  user: ProductImagePermissionUser,
  product: ProductImagePermissionProduct,
): true {
  // Reserved extension point for role- and product-scoped permissions.
  if (user.role !== "admin") {
    throw forbidden("Insufficient role for product image management.", {
      user_id: user.id,
      product_id: product.id,
    });
  }

  return true;
}
