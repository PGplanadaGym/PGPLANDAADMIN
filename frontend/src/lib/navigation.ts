import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Contact,
  CalendarDays,
  Component,
  Tag,
  Boxes,
  Package,
  Wallet,
  Calculator,
  Layers,
  Fingerprint,
  ClipboardList,
  Activity,
  Building2,
  ShoppingCart,
  Truck,
  Store,
  Wallet2,
  BarChart3,
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
  { to: '/usuarios', label: 'Usuarios', resource: 'usuarios', icon: Users },
  { to: '/roles', label: 'Roles y permisos', resource: 'roles', icon: ShieldCheck },
  { to: '/clientes', label: 'Clientes', resource: 'clientes', icon: Contact },
  {
    label: 'Citas',
    icon: CalendarDays,
    children: [
      { to: '/citas', label: 'Citas', resource: 'citas', icon: CalendarDays },
      { to: '/recursos', label: 'Recursos', resource: 'recursos', icon: Component },
      { to: '/tipos-cita', label: 'Tipos de cita', resource: 'tipos-cita', icon: Tag },
    ],
  },
  {
    label: 'Inventario',
    icon: Boxes,
    children: [
      { to: '/activos', label: 'Activos', resource: 'activos', icon: Boxes },
      { to: '/productos', label: 'Productos', resource: 'productos', icon: Package },
    ],
  },
  { to: '/ventas', label: 'Ventas', resource: 'ventas', icon: ShoppingCart },
  {
    to: '/proveedores',
    label: 'Proveedores y compras',
    resource: 'proveedores',
    icon: Truck,
  },
  {
    to: '/sucursales',
    label: 'Sucursales',
    resource: 'sucursales',
    icon: Store,
  },
  {
    to: '/nomina',
    label: 'Nómina',
    resource: 'nomina',
    icon: Wallet2,
  },
  { to: '/membresias', label: 'Membresías', resource: 'membresias', icon: BadgeCheck },
  {
    label: 'Cuentas',
    icon: Wallet,
    children: [
      { to: '/cuentas', label: 'Movimientos', resource: 'cuentas', icon: Wallet },
      { to: '/reportes', label: 'Reportes', resource: 'cuentas', icon: BarChart3 },
    ],
  },
  {
    label: 'Costeo',
    icon: Calculator,
    children: [
      { to: '/costeos', label: 'Proyectos', resource: 'costeo', icon: Calculator },
      { to: '/materiales', label: 'Materiales', resource: 'costeo', icon: Layers },
    ],
  },
  {
    label: 'Asistencia',
    icon: Fingerprint,
    children: [
      {
        to: '/asistencia',
        label: 'Mi asistencia',
        resource: 'asistencia-propia',
        icon: Fingerprint,
        sinPermiso: true,
      },
      {
        to: '/asistencia/reporte',
        label: 'Reporte de asistencia',
        resource: 'asistencia',
        icon: ClipboardList,
      },
    ],
  },
  { to: '/auditoria', label: 'Actividad', resource: 'auditoria', icon: Activity },
  { to: '/empresa', label: 'Mi empresa', resource: 'empresas', icon: Building2 },
]
