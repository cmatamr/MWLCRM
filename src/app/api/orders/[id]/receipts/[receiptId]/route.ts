import { logApiRouteError } from "@/server/observability/api-route";
import {
  badRequest,
  conflict,
  handleRouteError,
  notFound,
  ok,
  RouteContext,
} from "@/server/api/http";
import { paymentReceiptRouteParamsSchema, updatePaymentReceiptSchema } from "@/domain/crm/schemas";
import { requireAnyRole, requireRole } from "@/server/api/auth";
import { PaymentReceiptError, softDeletePaymentReceipt, updatePaymentReceipt } from "@/server/services/orders";

export async function PATCH(
  request: Request,
  context: RouteContext<{ id: string; receiptId: string }>,
) {
  try {
    await requireAnyRole(["admin", "agent"]);
    const params = paymentReceiptRouteParamsSchema.parse(await context.params);
    const body = updatePaymentReceiptSchema.parse(await request.json());

    const order = await updatePaymentReceipt({
      orderId: params.id,
      receiptId: params.receiptId,
      amountCrc: body.amountCrc,
      amountText: body.amountText,
      currency: body.currency,
      bankId: body.bankId,
      bank: body.bank,
      transferType: body.transferType,
      reference: body.reference,
      senderName: body.senderName,
      recipientName: body.recipientName,
      destinationPhone: body.destinationPhone,
      receiptDate: body.receiptDate,
      receiptTime: body.receiptTime,
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
        error.code === "BANK_NOT_FOUND" ||
        error.code === "RECEIPT_NOT_FOUND" ||
        error.code === "RECEIPT_NOT_IN_ORDER"
      ) {
        return handleRouteError(notFound(error.message, error.details));
      }

      return handleRouteError(conflict(error.message, error.details));
    }

    const response = handleRouteError(error);
    await logApiRouteError({
      request: request,
      route: "/api/orders/[id]/receipts/[receiptId]",
      source: "api.orders",
      defaultEventType: "orders_api_error",
      error,
      httpStatus: response.status,
    });
    return response;
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext<{ id: string; receiptId: string }>,
) {
  try {
    await requireRole("admin");
    const params = paymentReceiptRouteParamsSchema.parse(await context.params);
    const bodyText = await request.text();
    const body = bodyText
      ? JSON.parse(bodyText)
      : { performedBy: "system", internalNotes: undefined };

    const order = await softDeletePaymentReceipt({
      orderId: params.id,
      receiptId: params.receiptId,
      performedBy:
        typeof body.performedBy === "string" && body.performedBy.trim().length > 0
          ? body.performedBy.trim()
          : "system",
      internalNotes:
        typeof body.internalNotes === "string" && body.internalNotes.trim().length > 0
          ? body.internalNotes.trim()
          : undefined,
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

    const response = handleRouteError(error);
    await logApiRouteError({
      request: request,
      route: "/api/orders/[id]/receipts/[receiptId]",
      source: "api.orders",
      defaultEventType: "orders_api_error",
      error,
      httpStatus: response.status,
    });
    return response;
  }
}
