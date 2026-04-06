import { Prisma } from "@prisma/client";
import { badRequest, conflict, handleRouteError, notFound, ok, RouteContext } from "@/server/api/http";
import { createPaymentReceiptSchema, crmEntityIdParamsSchema } from "@/domain/crm/schemas";
import { requireAnyRole } from "@/server/api/auth";
import { createPaymentReceipt, PaymentReceiptError } from "@/server/services/orders";

export async function POST(
  request: Request,
  context: RouteContext<{ id: string }>,
) {
  try {
    await requireAnyRole(["admin", "agent"]);
    const orderId = crmEntityIdParamsSchema.parse(await context.params).id;
    const body = createPaymentReceiptSchema.parse(await request.json());

    const order = await createPaymentReceipt({
      orderId,
      messageId: body.messageId,
      receiptKey: body.receiptKey,
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
      receiptDate: body.receiptDate ?? undefined,
      receiptTime: body.receiptTime,
      internalNotes: body.internalNotes,
      rawPayload: body.rawPayload as Prisma.InputJsonValue | undefined,
    });

    return ok(order, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return handleRouteError(badRequest("Invalid JSON body."));
    }

    if (error instanceof PaymentReceiptError) {
      if (error.code === "ORDER_NOT_FOUND" || error.code === "BANK_NOT_FOUND") {
        return handleRouteError(notFound(error.message, error.details));
      }

      if (error.code === "DUPLICATE_RECEIPT_KEY") {
        return handleRouteError(conflict(error.message, error.details));
      }
    }

    return handleRouteError(error);
  }
}
