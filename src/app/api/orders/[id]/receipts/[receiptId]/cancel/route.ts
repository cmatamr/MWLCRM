import { badRequest, conflict, handleRouteError, notFound, ok, RouteContext } from "@/server/api/http";
import { paymentReceiptReviewActionSchema, paymentReceiptRouteParamsSchema } from "@/domain/crm/schemas";
import { requireRole } from "@/server/api/auth";
import { cancelPaymentReceipt, PaymentReceiptError } from "@/server/services/orders";

export async function POST(
  request: Request,
  context: RouteContext<{ id: string; receiptId: string }>,
) {
  try {
    await requireRole("admin");
    const params = paymentReceiptRouteParamsSchema.parse(await context.params);
    const body = paymentReceiptReviewActionSchema.parse(await request.json());

    const order = await cancelPaymentReceipt({
      orderId: params.id,
      receiptId: params.receiptId,
      performedBy: body.performedBy,
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
