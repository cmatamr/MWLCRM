const SENSITIVE_AUTH_QUERY_KEYS = new Set([
  "password",
  "currentpassword",
  "current_password",
  "newpassword",
  "new_password",
  "confirmpassword",
  "confirm_password",
  "token",
  "access_token",
  "refresh_token",
  "authorization",
  "apikey",
  "api_key",
  "service_role",
]);

const STRICT_PASSWORD_QUERY_KEYS = new Set([
  "password",
  "currentpassword",
  "current_password",
  "newpassword",
  "new_password",
  "confirmpassword",
  "confirm_password",
]);

export function findSensitiveAuthQueryKeys(searchParams: URLSearchParams): string[] {
  const found = new Set<string>();

  for (const key of searchParams.keys()) {
    const normalized = key.trim().toLowerCase();
    if (SENSITIVE_AUTH_QUERY_KEYS.has(normalized)) {
      found.add(normalized);
    }
  }

  return Array.from(found).sort();
}

export function hasSensitiveAuthQuery(searchParams: URLSearchParams): boolean {
  return findSensitiveAuthQueryKeys(searchParams).length > 0;
}

export function hasPasswordInQuery(searchParams: URLSearchParams): boolean {
  return findSensitiveAuthQueryKeys(searchParams).some((key) => STRICT_PASSWORD_QUERY_KEYS.has(key));
}
