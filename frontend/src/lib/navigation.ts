import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Contact,
  CalendarDays,
  Component,
  Tag,
  Wallet,
  Building2,
  Store,
  BadgeCheck,
} from 'lucide-react'

export interface NavLeaf {
  to: string
  label: string
  resource: string
  icon: LucideIcon
  // true = visible para cualquier usuario autenticado, sin exigir un permiso
  // granular. Úsalo para acciones de autoservicio (ej. marcar tu propia
  // asistencia), no para listados administrativos.
  sinPermiso?: boolean
}

export interface NavGroup {
  label: string
  icon: LucideIcon
  children: NavLeaf[]
}

export type NavEntry = NavLeaf | NavGroup

export function esGrupoNav(entry: NavEntry): entry is NavGroup {
  return 'children' in entry
}

/** Aplana grupos y hojas en una sola lista — para buscadores/accesos rápidos
 * a los que no les importa la agrupación visual del sidebar. */
export function aplanarNav(items: NavEntry[]): NavLeaf[] {
  return items.flatMap((item) => (esGrupoNav(item) ? item.children : [item]))
}

export const NAV_ITEMS: NavEntry[] = [
  { to: '/', label: 'Dashboard', resource: 'dashboard', icon: LayoutDashboard, sinPermiso: true },
  { to: '/clientes', label: 'Clientes', resource: 'clientes', icon: Contact },
  {
    to: '/sucursales',
    label: 'Sucursales',
    resource: 'sucursales',
    icon: Store,
  },
  { to: '/membresias', label: 'Membresías', resource: 'membresias', icon: BadgeCheck },
  { to: '/cuentas', label: 'Cuentas', resource: 'cuentas', icon: Wallet },
  { to: '/empresa', label: 'Mi empresa', resource: 'empresas', icon: Building2 },
  { to: '/usuarios', label: 'Usuarios', resource: 'usuarios', icon: Users },
  { to: '/roles', label: 'Roles y permisos', resource: 'roles', icon: ShieldCheck },
  {
    label: 'Citas',
    icon: CalendarDays,
    children: [
      { to: '/citas', label: 'Citas', resource: 'citas', icon: CalendarDays },
      { to: '/recursos', label: 'Recursos', resource: 'recursos', icon: Component },
      { to: '/tipos-cita', label: 'Tipos de cita', resource: 'tipos-cita', icon: Tag },
    ],
  },
]
