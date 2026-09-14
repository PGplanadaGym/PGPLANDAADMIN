import { useEffect, useMemo, useState } from 'react'
import { useGetIdentity } from '@refinedev/core'
import { Link } from 'react-router-dom'
import {
  CalendarClock,
  ShoppingCart,
  PackageX,
  Fingerprint,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import type { Identity } from '../../lib/identity'
import { buildAbility } from '../../ability/ability'
import { useModulos } from '../../providers/modulosContext'
import { NAV_ITEMS, aplanarNav } from '../../lib/navigation'
import { axiosInstance } from '../../lib/axios'
import { CargandoPantalla } from '../../components/ui/CargandoPantalla'

function saludo() {
  const hora = new Date().getHours()
  if (hora < 12) return 'Buenos días'
  if (hora < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

interface ProximaCita {
  id: string
  fechaInicio: string
  cliente: { id: string; nombre: string } | null
  tipoCita: { nombre: string }
}

interface Metricas {
  modulosActivos: string[]
  metricas: Record<string, number>
  proximasCitas: ProximaCita[]
}

function TarjetaMetrica({
  icono: Icono,
  etiqueta,
  valor,
  to,
}: {
  icono: typeof CalendarClock
  etiqueta: string
  valor: string
  to: string
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[var(--sombra-sm)] transition hover:-translate-y-0.5 hover:shadow-[var(--sombra-md)]"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primario-suave)] text-[var(--color-primario-legible)]">
        <Icono className="h-5 w-5" strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs text-[var(--color-text-muted)]">{etiqueta}</p>
        <p className="text-lg font-bold text-[var(--color-text)]">{valor}</p>
      </div>
    </Link>
  )
}

export function DashboardPage() {
  const { data: identity } = useGetIdentity<Identity>()
  const { modulos, loading: cargandoModulos } = useModulos()
  const [datos, setDatos] = useState<Metricas | null>(null)
  const [cargandoDatos, setCargandoDatos] = useState(true)

  useEffect(() => {
    axiosInstance
      .get<Metricas>('/dashboard/metricas')
      .then(({ data }) => setDatos(data))
      .catch(() => {
        /* si falla, simplemente no se muestran métricas */
      })
      .finally(() => setCargandoDatos(false))
  }, [])

  const ability = useMemo(() => buildAbility(identity?.permisos ?? []), [identity?.permisos])
  const puedeVer = (resource: string) => ability.can(`${resource}.leer`, 'all')

  const clavesActivas = new Set(modulos.filter((m) => m.activo).map((m) => m.clave))
  const accesos = aplanarNav(NAV_ITEMS).filter(
    (item) =>
      item.modulo &&
      clavesActivas.has(item.modulo) &&
      item.to !== '/' &&
      (item.sinPermiso || puedeVer(item.resource)),
  )

  const m = datos?.metricas ?? {}

  if (!identity || cargandoModulos) {
    return <CargandoPantalla minHeight={400} />
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
        {saludo()}{identity.nombre ? `, ${identity.nombre.split(' ')[0]}` : ''}
      </h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Esto es lo que tienes activo en {identity.empresa.nombre ?? 'tu empresa'}.
      </p>

      {cargandoDatos && <CargandoPantalla minHeight={160} />}

      {!cargandoDatos && datos && (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {datos.modulosActivos.includes('citas') && puedeVer('citas') && (
            <TarjetaMetrica
              icono={CalendarClock}
              etiqueta="Citas de hoy"
              valor={String(m.citasHoy ?? 0)}
              to="/citas"
            />
          )}
          {datos.modulosActivos.includes('ventas') && puedeVer('ventas') && (
            <TarjetaMetrica
              icono={ShoppingCart}
              etiqueta="Ventas este mes"
              valor={`$${(m.ventasMesTotal ?? 0).toFixed(2)} (${m.ventasMesCantidad ?? 0})`}
              to="/ventas"
            />
          )}
          {datos.modulosActivos.includes('inventario') && puedeVer('productos') && (
            <TarjetaMetrica
              icono={PackageX}
              etiqueta="Productos con stock bajo"
              valor={String(m.productosStockBajo ?? 0)}
              to="/productos"
            />
          )}
          {datos.modulosActivos.includes('asistencia') && puedeVer('asistencia') && (
            <TarjetaMetrica
              icono={Fingerprint}
              etiqueta="Asistencia de hoy"
              valor={String(m.asistenciaHoy ?? 0)}
              to="/asistencia/reporte"
            />
          )}
          {datos.modulosActivos.includes('cuentas') && puedeVer('cuentas') && (
            <TarjetaMetrica
              icono={TrendingUp}
              etiqueta="Ingresos este mes"
              valor={`$${(m.ingresosMes ?? 0).toFixed(2)}`}
              to="/cuentas"
            />
          )}
          {datos.modulosActivos.includes('cuentas') && puedeVer('cuentas') && (
            <TarjetaMetrica
              icono={TrendingDown}
              etiqueta="Egresos este mes"
              valor={`$${(m.egresosMes ?? 0).toFixed(2)}`}
              to="/cuentas"
            />
          )}
        </div>
      )}

      {!cargandoDatos && datos && datos.proximasCitas.length > 0 && puedeVer('citas') && (
        <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[var(--sombra-sm)]">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">Próximas citas</h2>
          <div className="mt-2 flex flex-col gap-2">
            {datos.proximasCitas.map((cita) => (
              <Link
                key={cita.id}
                to="/citas"
                className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-[var(--color-bg-hover)]"
              >
                <span className="text-[var(--color-text)]">
                  {cita.tipoCita.nombre}
                  {cita.cliente ? ` · ${cita.cliente.nombre}` : ''}
                </span>
                <span className="text-[var(--color-text-muted)]">
                  {new Date(cita.fechaInicio).toLocaleString()}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <h2 className="mt-8 text-sm font-semibold text-[var(--color-text)]">Accesos rápidos</h2>
      {accesos.length > 0 ? (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {accesos.map((item) => {
            const Icono = item.icon
            return (
              <Link
                key={item.to}
                to={item.to}
                className="group flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[var(--sombra-sm)] transition hover:-translate-y-0.5 hover:shadow-[var(--sombra-md)]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primario-suave)] text-[var(--color-primario-legible)]">
                  <Icono className="h-5 w-5" strokeWidth={2} />
                </div>
                <span className="font-medium text-[var(--color-text)]">{item.label}</span>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-bg-card)] p-8 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">
            Todavía no tienes módulos activados. Pídele a un administrador que los active en{' '}
            <Link to="/modulos" className="text-[var(--color-primario-legible)] hover:underline">
              Módulos
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  )
}
