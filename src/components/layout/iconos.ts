import {
  BadgePercent, BarChart3, Building2, CalendarCheck, ClipboardList, FileText, Footprints, House, Menu, Settings,
  ShieldCheck, Target, Trophy, UserRound, Users, type LucideIcon,
} from "lucide-react";
import type { IconoNav } from "@/lib/navegacion";

// Módulo sin "use client" para poder usarlo en componentes de servidor y de cliente.
export const ICONOS: Record<IconoNav, LucideIcon> = {
  inicio: House,
  agenda: CalendarCheck,
  clientes: Building2,
  pipeline: Target,
  cotizaciones: FileText,
  pedidos: ClipboardList,
  catalogo: Footprints,
  metas: Trophy,
  comisiones: BadgePercent,
  reportes: BarChart3,
  equipo: Users,
  configuracion: Settings,
  auditoria: ShieldCheck,
  perfil: UserRound,
  mas: Menu,
};
