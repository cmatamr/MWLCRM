import { logApiRouteError } from "@/server/observability/api-route";
export const dynamic = "force-dynamic";

import { badRequest, handleRouteError, ok, type RouteContext } from "@/server/api/http";
import { requireRole } from "@/server/api/auth";
import { addProductImage, getProductImages } from "@/server/services/products";
import { canManageProductImages } from "@/server/services/products/image-permissions";

export async function GET(
  _request: Request,
  context: RouteContext<{ id: string }>,
) {
  try {
    const session = await requireRole("admin");
    const { id } = await context.params;

    if (!id?.trim()) {
      throw badRequest('Route param "id" is required.');
    }

    canManageProductImages(
      { id: session.user.id, role: session.profile.role },
      { id: id.trim() },
    );

    const images = await getProductImages(id.trim());
    return ok(images);
  } catch (error) {
    const response = handleRouteError(error);
    await logApiRouteError({
      request: _request,
      route: "/api/products/[id]/images",
      source: "api.products",
      defaultEventType: "products_api_error",
      error,
      httpStatus: response.status,
    });
    return response;
  }
}

export async function POST(
  request: Request,
  context: RouteContext<{ id: string }>,
) {
  try {
    const session = await requireRole("admin");
    const { id } = await context.params;

    if (!id?.trim()) {
      throw badRequest('Route param "id" is required.');
    }

    canManageProductImages(
      { id: session.user.id, role: session.profile.role },
      { id: id.trim() },
    );

    const formData = await request.formData();
    const fileField = formData.get("file");

    if (!(fileField instanceof File)) {
      throw badRequest("Debes enviar un archivo valido en el campo file.", {
        field: "file",
      });
    }

    const altRaw = formData.get("alt_text");
    const markPrimaryRaw = formData.get("mark_as_primary");
    const markAsPrimary =
      typeof markPrimaryRaw === "string" && ["1", "true", "on", "yes"].includes(markPrimaryRaw.toLowerCase());

    const fileBuffer = Buffer.from(await fileField.arrayBuffer());

    const product = await addProductImage(id.trim(), {
      mime_type: fileField.type,
      size_bytes: fileField.size,
      file_buffer: fileBuffer,
      alt_text: typeof altRaw === "string" ? altRaw : null,
      mark_as_primary: markAsPrimary,
    });

    return ok(product);
  } catch (error) {
    const response = handleRouteError(error);
    await logApiRouteError({
      request: request,
      route: "/api/products/[id]/images",
      source: "api.products",
      defaultEventType: "products_api_error",
      error,
      httpStatus: response.status,
    });
    return response;
  }
}
