import type { Metadata } from "next";

import "@/lib/security/install-log-redaction";
import { AppShell } from "@/components/layout/app-shell";
import { QueryProvider } from "@/providers/query-provider";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "NexaCore by 4 + [ UNO ]",
  description: "CRM comercial modular para clientes, órdenes y campañas.",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/nexacore-icon.png",
  },
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="es">
      <body>
        <QueryProvider>
          <AppShell>{children}</AppShell>
        </QueryProvider>
      </body>
    </html>
  );
}
