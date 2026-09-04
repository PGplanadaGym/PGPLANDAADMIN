import { useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, CalendarDays, ShoppingBag, Calculator, Wallet, Boxes } from 'lucide-react'
import { axiosInstance } from '../../lib/axios'
import { CargandoPantalla } from '../../components/ui/CargandoPantalla'

interface Cliente {
  id: string
  nombre: string
  email: string | null
  telefono: string | null
}

interface Cita {
  id: string
  fechaInicio: string
  estado: string
  tipoCita: { nombre: string }
  recurso: { nombre: string }
}

interface OrdenItem {
  cantidad: number
  producto: { nombre: string }
}

interface Orden {
  id: string
  total: string
  creadoEn: string
  items: OrdenItem[]
}

interface Costeo {
  id: string
  nombre: string
  estado: string
  precioVenta: string | null
  creadoEn: string
}

interface MovimientoCuenta {
  id: string
  tipo: string
  monto: string
  fecha: string
  descripcion: string | null
  categoria: { nombre: string }
}

interface ActivoAsignado {
  id: string
  fechaAsignacion: string
  activo: { id: string; nombre: string }
}

interface Perfil {
  cliente: Cliente
  citas: Cita[]
  ordenes: Orden[]
  costeos: Costeo[]
  movimientosCuenta: MovimientoCuenta[]
  activosAsignados: ActivoAsignado[]
  resumen: { totalCitas: number; totalGastado: number; activosEnPosesion: number }
}

function Seccion({
  icono: Icono,
  titulo,
  children,
}: {
  icono: typeof CalendarDays
  titulo: string
  children: ReactNode
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[var(--sombra-sm)]">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
        <Icono size={16} />
        {titulo}
      </h2>
      <div className="mt-3 flex flex-col gap-2">{children}</div>
    </div>
  )
}

export function ClientePerfilPage() {
  const { id } = useParams<{ id: string }>()
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (!id) return
    axiosInstance
      .get<Perfil>(`/clientes/${id}/perfil`)
      .then(({ data }) => setPerfil(data))
      .catch(() => toast.error('No se pudo cargar el perfil del cliente'))
      .finally(() => setCargando(false))
  }, [id])

  if (cargando) {
    return <CargandoPantalla minHeight={300} />
  }

  if (!perfil) {
    return <p className="text-sm text-[var(--color-text-muted)]">Cliente no encontrado</p>
  }

  const { cliente, citas, ordenes, costeos, movimientosCuenta, activosAsignados, resumen } = perfil

  return (
    <div>
      <Link
        to="/clientes"
        className="inline-flex items-center gap-1 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      >
        <ArrowLeft size={14} />
        Volver a clientes
      </Link>

      <h1 className="mt-2 text-xl font-bold text-[var(--color-text)]">{cliente.nombre}</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        {cliente.email ?? 'Sin email'} · {cliente.telefono ?? 'Sin teléfono'}
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[var(--sombra-sm)]">
          <p className="text-xs text-[var(--color-text-muted)]">Total gastado</p>
          <p className="text-lg font-bold text-[var(--color-text)]">
            ${resumen.totalGastado.toFixed(2)}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[var(--sombra-sm)]">
          <p className="text-xs text-[var(--color-text-muted)]">Citas totales</p>
          <p className="text-lg font-bold text-[var(--color-text)]">{resumen.totalCitas}</p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[var(--sombra-sm)]">
          <p className="text-xs text-[var(--color-text-muted)]">Activos en su poder</p>
          <p className="text-lg font-bold text-[var(--color-text)]">{resumen.activosEnPosesion}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {citas.length > 0 && (
          <Seccion icono={CalendarDays} titulo="Citas recientes">
            {citas.map((cita) => (
              <div key={cita.id} className="text-sm">
                <span className="text-[var(--color-text)]">{cita.tipoCita.nombre}</span>{' '}
                <span className="text-[var(--color-text-muted)]">
                  · {new Date(cita.fechaInicio).toLocaleString()} · {cita.estado}
                </span>
              </div>
            ))}
          </Seccion>
        )}

        {ordenes.length > 0 && (
          <Seccion icono={ShoppingBag} titulo="Ventas recientes">
            {ordenes.map((orden) => (
              <div key={orden.id} className="text-sm">
                <span className="font-medium text-[var(--color-text)]">
                  ${Number(orden.total).toFixed(2)}
                </span>{' '}
                <span className="text-[var(--color-text-muted)]">
                  · {new Date(orden.creadoEn).toLocaleDateString()} ·{' '}
                  {orden.items.map((i) => `${i.cantidad}× ${i.producto.nombre}`).join(', ')}
                </span>
              </div>
            ))}
          </Seccion>
        )}

        {costeos.length > 0 && (
          <Seccion icono={Calculator} titulo="Costeos">
            {costeos.map((costeo) => (
              <div key={costeo.id} className="text-sm">
                <span className="text-[var(--color-text)]">{costeo.nombre}</span>{' '}
                <span className="text-[var(--color-text-muted)]">
                  · {costeo.estado}
                  {costeo.precioVenta ? ` · $${Number(costeo.precioVenta).toFixed(2)}` : ''}
                </span>
              </div>
            ))}
          </Seccion>
        )}

        {movimientosCuenta.length > 0 && (
          <Seccion icono={Wallet} titulo="Movimientos en Cuentas">
            {movimientosCuenta.map((mov) => (
              <div key={mov.id} className="text-sm">
                <span
                  className={mov.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}
                >
                  {mov.tipo === 'ingreso' ? '+' : '-'}${Number(mov.monto).toFixed(2)}
                </span>{' '}
                <span className="text-[var(--color-text-muted)]">
                  · {mov.categoria.nombre} · {new Date(mov.fecha).toLocaleDateString()}
                </span>
              </div>
            ))}
          </Seccion>
        )}

        {activosAsignados.length > 0 && (
          <Seccion icono={Boxes} titulo="Activos en su poder">
            {activosAsignados.map((asignacion) => (
              <div key={asignacion.id} className="text-sm">
                <span className="text-[var(--color-text)]">{asignacion.activo.nombre}</span>{' '}
                <span className="text-[var(--color-text-muted)]">
                  · desde {new Date(asignacion.fechaAsignacion).toLocaleDateString()}
                </span>
              </div>
            ))}
          </Seccion>
        )}
      </div>

      {citas.length === 0 &&
        ordenes.length === 0 &&
        costeos.length === 0 &&
        movimientosCuenta.length === 0 &&
        activosAsignados.length === 0 && (
          <p className="mt-6 text-sm text-[var(--color-text-faint)]">
            Este cliente todavía no tiene actividad registrada.
          </p>
        )}
    </div>
  )
}
