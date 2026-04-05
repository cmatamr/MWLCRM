import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseOrigin: string | null = null;
let supabaseHostname: string | null = null;
let supabaseProtocol: "http" | "https" | null = null;

if (supabaseUrl) {
  try {
    const parsedUrl = new URL(supabaseUrl);
    supabaseOrigin = parsedUrl.origin;
    supabaseHostname = parsedUrl.hostname;
    supabaseProtocol = parsedUrl.protocol === "http:" ? "http" : "https";
  } catch {
    supabaseOrigin = null;
    supabaseHostname = null;
    supabaseProtocol = null;
  }
}

function buildContentSecurityPolicy(): string {
  const isDevelopment = process.env.NODE_ENV === "development";

  const imageSources = ["'self'", "data:", "blob:"];

  if (supabaseOrigin) {
    imageSources.push(supabaseOrigin);
  }

  const connectSources = ["'self'"];

  if (supabaseOrigin) {
    connectSources.push(supabaseOrigin);
  }

  if (isDevelopment) {
    connectSources.push("ws:", "wss:");
  }

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "manifest-src 'self'",
    "frame-src 'none'",
    "worker-src 'self' blob:",
    `img-src ${imageSources.join(" ")}`,
    "font-src 'self' data:",
    // Next.js injecta estilos inline en runtime y la UI usa style={} en varios componentes.
    "style-src 'self' 'unsafe-inline'",
    // Sin nonce por request, Next.js requiere unsafe-inline para scripts inline de runtime/hidratacion.
    `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    `connect-src ${connectSources.join(" ")}`,
  ];

  return directives.join("; ");
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: supabaseHostname
    ? {
        remotePatterns: [
          {
            protocol: supabaseProtocol ?? "https",
            hostname: supabaseHostname,
            pathname: "/storage/v1/object/public/**",
          },
        ],
      }
    : undefined,
  async headers() {
    const csp = buildContentSecurityPolicy();
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: csp,
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value:
              "accelerometer=(), autoplay=(), camera=(), display-capture=(), encrypted-media=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), usb=(), browsing-topics=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
