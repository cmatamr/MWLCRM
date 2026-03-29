import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Made With Love CRM",
  description: "CRM comercial modular para clientes, órdenes y campañas.",
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="es">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
