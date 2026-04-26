import test from "node:test";
import assert from "node:assert/strict";

import { redactSensitiveData, sanitizeUrlForLogging } from "../../src/lib/security/redaction.ts";

test("redactSensitiveData masks sensitive auth keys", () => {
  const input = {
    password: "PlainSecret123!",
    nested: {
      access_token: "abc123",
      authorization: "Bearer token",
      safe: "value",
    },
    query: "https://example.com/auth/login?email=user@example.com&password=PlainSecret123!",
  };

  const redacted = redactSensitiveData(input);

  assert.equal(redacted.password, "[REDACTED]");
  assert.equal(redacted.nested.access_token, "[REDACTED]");
  assert.equal(redacted.nested.authorization, "[REDACTED]");
  assert.equal(redacted.nested.safe, "value");
  assert.equal(redacted.query, "https://example.com/auth/login?[REDACTED_QUERY]");
});

test("sanitizeUrlForLogging strips query strings from absolute URLs", () => {
  const sanitized = sanitizeUrlForLogging(
    "https://crm.example.com/auth/login?email=user@example.com&password=topsecret#hash",
  );

  assert.equal(sanitized, "https://crm.example.com/auth/login?[REDACTED_QUERY]#hash");
});

test("sanitizeUrlForLogging redacts query-like pairs in plain strings", () => {
  const sanitized = sanitizeUrlForLogging("GET /auth/login?email=user@example.com&password=topsecret");

  assert.equal(sanitized, "GET /auth/login?email=user@example.com&password=[REDACTED]");
});
