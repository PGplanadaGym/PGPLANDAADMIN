import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Users,
  Contact,
  Wallet,
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
  { to: '/', label: 'Inicio', resource: 'dashboard', icon: LayoutDashboard, sinPermiso: true },
  { to: '/clientes', label: 'Clientes', resource: 'clientes', icon: Contact },
  {
    to: '/sucursales',
    label: 'Sucursales',
    resource: 'sucursales',
    icon: Store,
  },
  { to: '/membresias', label: 'Membresías', resource: 'membresias', icon: BadgeCheck },
  { to: '/cuentas', label: 'Cuentas', resource: 'cuentas', icon: Wallet },
  { to: '/usuarios', label: 'Usuarios', resource: 'usuarios', icon: Users },
]
