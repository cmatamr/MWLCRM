import test from "node:test";
import assert from "node:assert/strict";

import {
  sanitizeLogMetadata,
  scrubSensitiveString,
} from "../../src/server/observability/sanitize-log.ts";

test("sanitizeLogMetadata removes sensitive keys recursively and case-insensitive", () => {
  const sanitized = sanitizeLogMetadata({
    Password: "secret",
    nested: {
      authorization: "Bearer abc",
      ok: "value",
      deep: {
        Api_Key: "abc",
        keep: true,
      },
    },
  });

  assert.equal("Password" in sanitized, false);
  assert.equal("authorization" in (sanitized.nested as Record<string, unknown>), false);
  assert.equal(
    "Api_Key" in ((sanitized.nested as Record<string, unknown>).deep as Record<string, unknown>),
    false,
  );
  assert.equal((sanitized.nested as Record<string, unknown>).ok, "value");
});

test("sanitizeLogMetadata enforces max 5KB payload", () => {
  const large = "x".repeat(8000);
  const sanitized = sanitizeLogMetadata({ payload: large });

  assert.deepEqual(sanitized, { truncated: true });
});

test("sanitizeLogMetadata normalizes undefined and non-serializable values", () => {
  const sanitized = sanitizeLogMetadata({
    keep: "ok",
    skip: undefined,
    arr: [1, undefined, () => "bad"],
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
  });

  assert.equal(sanitized.keep, "ok");
  assert.equal("skip" in sanitized, false);
  assert.deepEqual(sanitized.arr, [1, null, null]);
  assert.equal(sanitized.createdAt, "2025-01-01T00:00:00.000Z");
});

test("scrubSensitiveString redacts auth headers, cookies and tokens", () => {
  const scrubbed = scrubSensitiveString(
    "Authorization: Bearer abc123 cookie=session=aaa access_token=bbb password=hunter2",
  );

  assert.equal(scrubbed.includes("abc123"), false);
  assert.equal(scrubbed.includes("session=aaa"), false);
  assert.equal(scrubbed.includes("access_token=bbb"), false);
  assert.equal(scrubbed.includes("password=hunter2"), false);
});
