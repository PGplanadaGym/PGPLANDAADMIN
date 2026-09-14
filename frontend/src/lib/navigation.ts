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
  Blocks,
  Activity,
  Building2,
  ShoppingCart,
  Truck,
  Store,
  Wallet2,
  BarChart3,
  Database,
  Network,
  BadgeCheck,
} from 'lucide-react'

export interface NavLeaf {
  to: string
  label: string
  resource: string
  icon: LucideIcon
  modulo?: string
  // true = visible para cualquier usuario autenticado (con el módulo activo),
  // sin exigir un permiso granular. Úsalo para acciones de autoservicio
  // (ej. marcar tu propia asistencia), no para listados administrativos.
  sinPermiso?: boolean
  // true = visible solo para el super-admin (dueño de la plataforma),
  // sin importar los permisos del usuario dentro de su propia empresa.
  superAdminOnly?: boolean
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
  { to: '/clientes', label: 'Clientes', resource: 'clientes', icon: Contact, modulo: 'clientes' },
  {
    label: 'Citas',
    icon: CalendarDays,
    children: [
      { to: '/citas', label: 'Citas', resource: 'citas', icon: CalendarDays, modulo: 'citas' },
      { to: '/recursos', label: 'Recursos', resource: 'recursos', icon: Component, modulo: 'citas' },
      {
        to: '/tipos-cita',
        label: 'Tipos de cita',
        resource: 'tipos-cita',
        icon: Tag,
        modulo: 'citas',
      },
    ],
  },
  {
    label: 'Inventario',
    icon: Boxes,
    children: [
      { to: '/activos', label: 'Activos', resource: 'activos', icon: Boxes, modulo: 'inventario' },
      {
        to: '/productos',
        label: 'Productos',
        resource: 'productos',
        icon: Package,
        modulo: 'inventario',
      },
    ],
  },
  { to: '/ventas', label: 'Ventas', resource: 'ventas', icon: ShoppingCart, modulo: 'ventas' },
  {
    to: '/proveedores',
    label: 'Proveedores y compras',
    resource: 'proveedores',
    icon: Truck,
    modulo: 'compras',
  },
  {
    to: '/sucursales',
    label: 'Sucursales',
    resource: 'sucursales',
    icon: Store,
    modulo: 'sucursales',
  },
  {
    to: '/nomina',
    label: 'Nómina',
    resource: 'nomina',
    icon: Wallet2,
    modulo: 'nomina',
  },
  {
    to: '/membresias',
    label: 'Membresías',
    resource: 'membresias',
    icon: BadgeCheck,
    modulo: 'membresias',
  },
  {
    label: 'Cuentas',
    icon: Wallet,
    children: [
      { to: '/cuentas', label: 'Movimientos', resource: 'cuentas', icon: Wallet, modulo: 'cuentas' },
      {
        to: '/reportes',
        label: 'Reportes',
        resource: 'cuentas',
        icon: BarChart3,
        modulo: 'cuentas',
      },
    ],
  },
  {
    label: 'Costeo',
    icon: Calculator,
    children: [
      {
        to: '/costeos',
        label: 'Proyectos',
        resource: 'costeo',
        icon: Calculator,
        modulo: 'costeo',
      },
      { to: '/materiales', label: 'Materiales', resource: 'costeo', icon: Layers, modulo: 'costeo' },
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
        modulo: 'asistencia',
        sinPermiso: true,
      },
      {
        to: '/asistencia/reporte',
        label: 'Reporte de asistencia',
        resource: 'asistencia',
        icon: ClipboardList,
        modulo: 'asistencia',
      },
    ],
  },
  { to: '/modulos', label: 'Módulos', resource: 'modulos', icon: Blocks },
  {
    to: '/entidades',
    label: 'Entidades dinámicas',
    resource: 'entidades',
    icon: Database,
    superAdminOnly: true,
  },
  { to: '/auditoria', label: 'Actividad', resource: 'auditoria', icon: Activity },
  { to: '/empresa', label: 'Mi empresa', resource: 'empresas', icon: Building2 },
  {
    to: '/plataforma/empresas',
    label: 'Empresas (plataforma)',
    resource: 'empresas-todas',
    icon: Network,
    sinPermiso: true,
    superAdminOnly: true,
  },
]
