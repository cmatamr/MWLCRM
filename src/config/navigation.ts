import {
  Boxes,
  ChartColumnBig,
  FileSearch,
  LayoutDashboard,
  Megaphone,
  MessageSquareText,
  PackageSearch,
  Shield,
  ShieldUser,
  UsersRound,
  Bot,
} from "lucide-react";

import type { AppRole } from "@/lib/auth/profile";
import type { NavigationItem } from "@/types/navigation";

export const navigationItems: NavigationItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "Vista general del CRM",
    icon: LayoutDashboard,
  },
  {
    href: "/customers",
    label: "Clientes",
    description: "Clientes y prospectos",
    icon: UsersRound,
  },
  {
    href: "/products",
    label: "Productos",
    description: "Catalogo y performance comercial",
    icon: Boxes,
  },
  {
    href: "/orders",
    label: "Órdenes",
    description: "Pedidos y estado comercial",
    icon: PackageSearch,
  },
  {
    href: "/campaigns",
    label: "Campañas",
    description: "Campañas activas y borradores",
    icon: Megaphone,
  },
  {
    href: "/funnel",
    label: "Funnel",
    description: "Pipeline de oportunidades",
    icon: ChartColumnBig,
  },
  {
    href: "/conversations",
    label: "Conversaciones",
    description: "Seguimiento de mensajes",
    icon: MessageSquareText,
  },
  {
    href: "/ai-dashboard",
    label: "Consumo IA",
    description: "Control de NOVA y crédito IA",
    icon: Bot,
  },
  {
    href: "/admin/users",
    label: "Admin Usuarios",
    description: "Control de usuarios internos",
    icon: ShieldUser,
  },
  {
    href: "/admin/security/password-policy",
    label: "Política Seguridad",
    description: "Reglas de contraseñas y bloqueo",
    icon: Shield,
  },
  {
    href: "/admin/logs",
    label: "Admin Logs",
    description: "Observabilidad y trazabilidad",
    icon: FileSearch,
  },
];

const ADMIN_NAV_PREFIX = "/admin/";

export function getVisibleNavigationItems(role?: AppRole | null): NavigationItem[] {
  return navigationItems.filter((item) => {
    if (item.href.startsWith(ADMIN_NAV_PREFIX) && role !== "admin") {
      return false;
    }

    if (item.href === "/dashboard" && role === "service") {
      return false;
    }

    return true;
  });
}
