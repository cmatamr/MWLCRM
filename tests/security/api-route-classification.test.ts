import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";

import { classifyApiErrorEvent } from "../../src/server/observability/error-taxonomy.ts";

test("classifies Prisma P2024 as prisma_connection_pool_timeout", () => {
  const result = classifyApiErrorEvent({
    route: "/api/orders",
    defaultEventType: "orders_api_error",
    error: {
      code: "P2024",
      clientVersion: "6.5.0",
      message: "Timed out fetching a new connection from the pool",
    },
    httpStatus: 500,
  });

  assert.equal(result.eventType, "prisma_connection_pool_timeout");
  assert.equal(result.prismaCode, "P2024");
  assert.equal(result.prismaClientVersion, "6.5.0");
});

test("classifies Prisma transaction failures", () => {
  const result = classifyApiErrorEvent({
    route: "/api/orders",
    defaultEventType: "orders_api_error",
    error: {
      code: "P2034",
      message: "Transaction failed due to deadlock",
    },
    httpStatus: 500,
  });

  assert.equal(result.eventType, "prisma_transaction_error");
});

test("classifies Supabase storage failures", () => {
  const result = classifyApiErrorEvent({
    route: "/api/products/[id]/images",
    defaultEventType: "products_api_error",
    error: new Error("Supabase storage bucket not found"),
    httpStatus: 503,
  });

  assert.equal(result.eventType, "supabase_storage_error");
});

test("classifies Supabase auth failures", () => {
  const result = classifyApiErrorEvent({
    route: "/api/auth/login",
    defaultEventType: "auth_login_error",
    error: new Error("Supabase auth invalid api key"),
    httpStatus: 500,
  });

  assert.equal(result.eventType, "supabase_auth_error");
});

test("classifies validation failures", () => {
  let validationError: unknown;
  try {
    z.object({ email: z.string().email() }).parse({ email: "bad-email" });
  } catch (error) {
    validationError = error;
  }

  const result = classifyApiErrorEvent({
    route: "/api/customers",
    defaultEventType: "customers_api_error",
    error: validationError,
    httpStatus: 400,
  });

  assert.equal(result.eventType, "validation_error");
});

test("classifies external provider failures by provider", () => {
  const result = classifyApiErrorEvent({
    route: "/api/internal/cron/meta-campaign-sync",
    defaultEventType: "internal_api_error",
    error: new Error("YCloud upstream request failed"),
    httpStatus: 502,
  });

  assert.equal(result.eventType, "ycloud_api_error");
});

test("maps legacy commercial_api_error into leads_api_error", () => {
  const result = classifyApiErrorEvent({
    route: "/api/promotions",
    defaultEventType: "commercial_api_error",
    error: new Error("Unexpected error"),
    httpStatus: 500,
  });

  assert.equal(result.eventType, "leads_api_error");
});

test("classifies turnstile verification failures", () => {
  const result = classifyApiErrorEvent({
    route: "/api/auth/login",
    defaultEventType: "auth_login_error",
    error: {
      status: 400,
      code: "TURNSTILE_INVALID",
      message: "Captcha failed",
    },
    httpStatus: 400,
  });

  assert.equal(result.eventType, "turnstile_verification_failed");
  assert.equal(result.errorStage, "turnstile_verification");
});

test("keeps authorization failures out of prisma classification", () => {
  const result = classifyApiErrorEvent({
    route: "/api/admin/users",
    defaultEventType: "admin_api_error",
    error: {
      status: 401,
      code: "UNAUTHORIZED",
      message: "Authentication required.",
    },
    httpStatus: 401,
  });

  assert.equal(result.eventType, "admin_api_error");
  assert.equal(result.errorStage, "authorization");
});
