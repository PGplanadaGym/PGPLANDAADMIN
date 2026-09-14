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
  Database,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  resource: string
  icon: LucideIcon
  // true = visible para cualquier usuario autenticado, sin exigir un permiso
  // granular. Úsalo para acciones de autoservicio (ej. marcar tu propia
  // asistencia), no para listados administrativos.
  sinPermiso?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', resource: 'dashboard', icon: LayoutDashboard, sinPermiso: true },
  { to: '/usuarios', label: 'Usuarios', resource: 'usuarios', icon: Users },
  { to: '/roles', label: 'Roles y permisos', resource: 'roles', icon: ShieldCheck },
  { to: '/clientes', label: 'Clientes', resource: 'clientes', icon: Contact },
  { to: '/citas', label: 'Citas', resource: 'citas', icon: CalendarDays },
  { to: '/recursos', label: 'Recursos', resource: 'recursos', icon: Component },
  { to: '/tipos-cita', label: 'Tipos de cita', resource: 'tipos-cita', icon: Tag },
  { to: '/activos', label: 'Activos', resource: 'activos', icon: Boxes },
  { to: '/productos', label: 'Productos', resource: 'productos', icon: Package },
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
  {
    to: '/reportes',
    label: 'Reportes',
    resource: 'cuentas',
    icon: BarChart3,
  },
  { to: '/cuentas', label: 'Cuentas', resource: 'cuentas', icon: Wallet },
  { to: '/costeos', label: 'Costeo', resource: 'costeo', icon: Calculator },
  { to: '/materiales', label: 'Materiales', resource: 'costeo', icon: Layers },
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
  { to: '/entidades', label: 'Entidades dinámicas', resource: 'entidades', icon: Database },
  { to: '/auditoria', label: 'Actividad', resource: 'auditoria', icon: Activity },
  { to: '/empresa', label: 'Mi empresa', resource: 'empresas', icon: Building2 },
]
