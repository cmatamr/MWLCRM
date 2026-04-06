import { ApiRouteError } from "@/server/api/http";

const TURNSTILE_SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type TurnstileSiteverifyResponse = {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
};

export type TurnstileVerificationResult = {
  success: boolean;
  errorCodes: string[];
};

function getTurnstileSecretKey(): string {
  const secretKey = process.env.TURNSTILE_SECRET_KEY?.trim();

  if (!secretKey) {
    throw new ApiRouteError({
      status: 500,
      code: "TURNSTILE_MISCONFIGURED",
      message: "Turnstile secret key is not configured.",
    });
  }

  return secretKey;
}

export async function verifyTurnstileToken(input: {
  token: string;
  remoteIp?: string;
}): Promise<TurnstileVerificationResult> {
  const secretKey = getTurnstileSecretKey();

  const formData = new URLSearchParams();
  formData.set("secret", secretKey);
  formData.set("response", input.token);

  if (input.remoteIp) {
    formData.set("remoteip", input.remoteIp);
  }

  let response: Response;

  try {
    response = await fetch(TURNSTILE_SITEVERIFY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
      cache: "no-store",
    });
  } catch {
    throw new ApiRouteError({
      status: 503,
      code: "TURNSTILE_UNAVAILABLE",
      message: "Temporary error validating captcha. Please try again.",
    });
  }

  if (!response.ok) {
    throw new ApiRouteError({
      status: 503,
      code: "TURNSTILE_UNAVAILABLE",
      message: "Temporary error validating captcha. Please try again.",
      details: {
        status: response.status,
      },
    });
  }

  const parsed = (await response.json()) as TurnstileSiteverifyResponse;
  const errorCodes = parsed["error-codes"] ?? [];

  return {
    success: parsed.success === true,
    errorCodes,
  };
}
