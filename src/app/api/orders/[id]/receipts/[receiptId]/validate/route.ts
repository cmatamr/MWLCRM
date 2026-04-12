import { badRequest, conflict, handleRouteError, notFound, ok, RouteContext } from "@/server/api/http";
import { paymentReceiptReviewActionSchema, paymentReceiptRouteParamsSchema } from "@/domain/crm/schemas";
import { requireRole } from "@/server/api/auth";
import { PaymentReceiptError, validatePaymentReceipt } from "@/server/services/orders";

export async function POST(
  request: Request,
  context: RouteContext<{ id: string; receiptId: string }>,
) {
  try {
    const session = await requireRole("admin");
    const params = paymentReceiptRouteParamsSchema.parse(await context.params);
    const body = paymentReceiptReviewActionSchema.parse(await request.json());
    const performedBy =
      session.profile.full_name?.trim() ||
      session.user.email?.trim() ||
      body.performedBy.trim();

    const order = await validatePaymentReceipt({
      orderId: params.id,
      receiptId: params.receiptId,
      performedBy,
      internalNotes: body.internalNotes,
    });

    return ok(order);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return handleRouteError(badRequest("Invalid JSON body."));
    }

    if (error instanceof PaymentReceiptError) {
      if (
        error.code === "ORDER_NOT_FOUND" ||
        error.code === "RECEIPT_NOT_FOUND" ||
        error.code === "RECEIPT_NOT_IN_ORDER"
      ) {
        return handleRouteError(notFound(error.message, error.details));
      }

      return handleRouteError(conflict(error.message, error.details));
    }

    return handleRouteError(error);
  }
}
