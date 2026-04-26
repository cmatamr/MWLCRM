import test from "node:test";
import assert from "node:assert/strict";

import {
  findSensitiveAuthQueryKeys,
  hasSensitiveAuthQuery,
  hasPasswordInQuery,
} from "../../src/server/security/auth-request-guards.ts";

test("hasPasswordInQuery detects password query params", () => {
  const params = new URLSearchParams("email=user@example.com&password=supersecret");

  assert.equal(hasPasswordInQuery(params), true);
});

test("findSensitiveAuthQueryKeys returns normalized sensitive keys", () => {
  const params = new URLSearchParams("apiKey=123&access_token=abc&foo=bar");

  assert.deepEqual(findSensitiveAuthQueryKeys(params), ["access_token", "apikey"]);
  assert.equal(hasSensitiveAuthQuery(params), true);
});

test("hasPasswordInQuery ignores safe query params", () => {
  const params = new URLSearchParams("email=user@example.com&next=%2Fdashboard");

  assert.equal(hasPasswordInQuery(params), false);
  assert.equal(hasSensitiveAuthQuery(params), false);
});
