import {
  ChartColumnBig,
  LayoutDashboard,
  Megaphone,
  MessageSquareText,
  PackageSearch,
  UsersRound,
} from "lucide-react";

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
    label: "Customers",
    description: "Clientes y prospectos",
    icon: UsersRound,
  },
  {
    href: "/orders",
    label: "Orders",
    description: "Pedidos y estado comercial",
    icon: PackageSearch,
  },
  {
    href: "/campaigns",
    label: "Campaigns",
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
    label: "Conversations",
    description: "Seguimiento de mensajes",
    icon: MessageSquareText,
  },
];
