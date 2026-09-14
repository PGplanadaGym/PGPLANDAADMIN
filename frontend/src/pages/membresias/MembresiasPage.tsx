import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ChevronDown, ChevronUp, Plus } from 'lucide-react'
import { useGetIdentity } from '@refinedev/core'
import { axiosInstance } from '../../lib/axios'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { Spinner } from '../../components/ui/Spinner'
import { CargandoPantalla } from '../../components/ui/CargandoPantalla'
import { SearchInput } from '../../components/ui/SearchInput'
import { Pagination } from '../../components/ui/Pagination'
import { ExportarCSVButton } from '../../components/ui/ExportarCSVButton'
import { useBusquedaPaginada } from '../../hooks/useBusquedaPaginada'
import { buildAbility } from '../../ability/ability'
import { mensajeError } from '../../lib/errores'
import type { Identity } from '../../lib/identity'
import { Avatar } from '../../components/ui/Avatar'

interface EstadoMembresia {
  cliente: { id: string; nombre: string; email: string | null; fotoUrl: string | null }
  membresia: {
    id: string
    plan: string
    fechaInicio: string
    fechaVencimiento: string
    duracionDias: number
  } | null
  diasRestantes: number | null
  estado: 'activo' | 'por_vencer' | 'vencido' | 'sin_membresia'
}

interface PlanMembresia {
  id: string
  nombre: string
  duracionDias: number
  precio: string
  activo: boolean
}

const ESTADO_LABEL: Record<string, string> = {
  activo: 'Activo',
  por_vencer: 'Por vencer',
  vencido: 'Vencido',
  sin_membresia: 'Sin membresía',
}

const ESTADO_COLOR: Record<string, string> = {
  activo: 'bg-emerald-100 text-emerald-700',
  por_vencer: 'bg-amber-100 text-amber-700',
  vencido: 'bg-red-100 text-red-700',
  sin_membresia: 'bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]',
}

function porcentajeRestante(fila: EstadoMembresia) {
  if (!fila.membresia || fila.diasRestantes == null) return 0
  if (fila.diasRestantes < 0) return 0
  return Math.min(100, Math.max(0, (fila.diasRestantes / fila.membresia.duracionDias) * 100))
}

function colorBarra(fila: EstadoMembresia) {
  const porcentaje = porcentajeRestante(fila)
  if (!fila.membresia) return 'bg-[var(--color-bg-muted)]'
  if (fila.estado === 'vencido' || porcentaje < 20) return 'bg-red-500'
  if (porcentaje < 50) return 'bg-amber-500'
  return 'bg-emerald-500'
}

function textoDiasRestantes(fila: EstadoMembresia) {
  if (!fila.membresia || fila.diasRestantes == null) return 'Sin membresía'
  if (fila.diasRestantes < 0) return `Vencido hace ${Math.abs(fila.diasRestantes)} días`
  if (fila.diasRestantes === 0) return 'Vence hoy'
  return `${fila.diasRestantes} días restantes`
}

function mensajeAviso(fila: EstadoMembresia) {
  if (fila.estado === 'por_vencer') return `Solo le quedan ${fila.diasRestantes} días`
  return null
}

export function MembresiasPage() {
  const { data: identity } = useGetIdentity<Identity>()
  const ability = useMemo(() => buildAbility(identity?.permisos ?? []), [identity?.permisos])
  const puedeRenovar = ability.can('membresias.crear', 'all')
  const puedeAdministrarPlanes = ability.can('membresias.actualizar', 'all')

  const [estados, setEstados] = useState<EstadoMembresia[]>([])
  const [cargando, setCargando] = useState(true)
  const [planes, setPlanes] = useState<PlanMembresia[]>([])

  const [mostrarPlanes, setMostrarPlanes] = useState(false)
  const [nombrePlan, setNombrePlan] = useState('')
  const [duracionPlan, setDuracionPlan] = useState('30')
  const [precioPlan, setPrecioPlan] = useState('')
  const [creandoPlan, setCreandoPlan] = useState(false)

  const [modalRenovar, setModalRenovar] = useState<EstadoMembresia | null>(null)
  const [planIdRenovar, setPlanIdRenovar] = useState('')
  const [renovando, setRenovando] = useState(false)

  const [modalEditar, setModalEditar] = useState<EstadoMembresia | null>(null)
  const [fechaVencimientoEditar, setFechaVencimientoEditar] = useState('')
  const [guardandoEdicion, setGuardandoEdicion] = useState(false)

  const cargarEstados = () =>
    axiosInstance.get<EstadoMembresia[]>('/membresias').then(({ data }) => setEstados(data))

  const cargarPlanes = () =>
    axiosInstance
      .get<PlanMembresia[]>('/planes-membresia')
      .then(({ data }) => setPlanes(data))

  useEffect(() => {
    setCargando(true)
    Promise.all([cargarEstados(), cargarPlanes()])
      .catch(() => toast.error('No se pudo cargar la información de membresías'))
      .finally(() => setCargando(false))
  }, [])

  const estadosOrdenados = useMemo(
    () =>
      [...estados].sort((a, b) => {
        if (a.diasRestantes == null) return 1
        if (b.diasRestantes == null) return -1
        return a.diasRestantes - b.diasRestantes
      }),
    [estados],
  )

  const {
    query,
    setQuery,
    pageItems,
    filtrados,
    pagina,
    setPagina,
    totalPaginas,
    totalFiltrados,
  } = useBusquedaPaginada(
    estadosOrdenados,
    (e) => `${e.cliente.nombre} ${e.cliente.email ?? ''} ${e.membresia?.plan ?? ''}`,
  )

  const filasCSV = useMemo(
    () =>
      filtrados.map((e) => ({
        socio: e.cliente.nombre,
        email: e.cliente.email ?? '',
        plan: e.membresia?.plan ?? '',
        vence: e.membresia ? new Date(e.membresia.fechaVencimiento).toLocaleDateString() : '',
        diasRestantes: e.diasRestantes ?? '',
        estado: ESTADO_LABEL[e.estado],
      })),
    [filtrados],
  )

  const crearPlan = async () => {
    if (!nombrePlan.trim() || !duracionPlan || !precioPlan) return
    setCreandoPlan(true)
    try {
      await axiosInstance.post('/planes-membresia', {
        nombre: nombrePlan,
        duracionDias: Number(duracionPlan),
        precio: Number(precioPlan),
      })
      setNombrePlan('')
      setDuracionPlan('30')
      setPrecioPlan('')
      toast.success('Plan creado')
      await cargarPlanes()
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo crear el plan'))
    } finally {
      setCreandoPlan(false)
    }
  }

  const abrirRenovar = (fila: EstadoMembresia) => {
    setModalRenovar(fila)
    setPlanIdRenovar(planes[0]?.id ?? '')
  }

  const confirmarRenovar = async () => {
    if (!modalRenovar || !planIdRenovar) return
    setRenovando(true)
    try {
      await axiosInstance.post(`/membresias/${modalRenovar.cliente.id}/renovar`, {
        planId: planIdRenovar,
      })
      toast.success(`Membresía de ${modalRenovar.cliente.nombre} renovada`)
      setModalRenovar(null)
      await cargarEstados()
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo renovar la membresía'))
    } finally {
      setRenovando(false)
    }
  }

  const abrirEditar = (fila: EstadoMembresia) => {
    if (!fila.membresia) return
    setModalEditar(fila)
    setFechaVencimientoEditar(fila.membresia.fechaVencimiento.slice(0, 10))
  }

  const confirmarEditar = async () => {
    if (!modalEditar?.membresia || !fechaVencimientoEditar) return
    setGuardandoEdicion(true)
    try {
      await axiosInstance.patch(`/membresias/${modalEditar.membresia.id}/vencimiento`, {
        fechaVencimiento: fechaVencimientoEditar,
      })
      toast.success(`Vencimiento de ${modalEditar.cliente.nombre} actualizado`)
      setModalEditar(null)
      await cargarEstados()
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo actualizar el vencimiento'))
    } finally {
      setGuardandoEdicion(false)
    }
  }

  if (cargando) {
    return <CargandoPantalla minHeight={300} />
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--color-text)]">Membresías</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Socios con su plan, fecha de vencimiento y días restantes.
      </p>

      {puedeAdministrarPlanes && (
        <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)]">
          <button
            type="button"
            onClick={() => setMostrarPlanes((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-[var(--color-text)]"
          >
            Planes de membresía ({planes.length})
            {mostrarPlanes ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {mostrarPlanes && (
            <div className="border-t border-[var(--color-border)] p-4">
              <div className="flex flex-col gap-1">
                {planes.map((plan) => (
                  <div key={plan.id} className="flex items-center justify-between text-sm">
                    <span className="text-[var(--color-text)]">{plan.nombre}</span>
                    <span className="text-[var(--color-text-muted)]">
                      {plan.duracionDias} días · ${Number(plan.precio).toFixed(2)}
                    </span>
                  </div>
                ))}
                {planes.length === 0 && (
                  <p className="text-sm text-[var(--color-text-faint)]">Sin planes todavía</p>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-end gap-2">
                <div>
                  <label className="mb-1 block text-xs text-[var(--color-text-muted)]">Nombre</label>
                  <input
                    value={nombrePlan}
                    onChange={(e) => setNombrePlan(e.target.value)}
                    placeholder="Mensual"
                    className="w-32 rounded-lg border border-[var(--color-border)] px-2 py-1.5 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[var(--color-text-muted)]">Días</label>
                  <input
                    type="number"
                    value={duracionPlan}
                    onChange={(e) => setDuracionPlan(e.target.value)}
                    className="w-24 rounded-lg border border-[var(--color-border)] px-2 py-1.5 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[var(--color-text-muted)]">Precio</label>
                  <input
                    type="number"
                    value={precioPlan}
                    onChange={(e) => setPrecioPlan(e.target.value)}
                    placeholder="30"
                    className="w-24 rounded-lg border border-[var(--color-border)] px-2 py-1.5 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={crearPlan}
                  disabled={creandoPlan || !nombrePlan.trim() || !precioPlan}
                  className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-50"
                >
                  {creandoPlan ? <Spinner size={14} /> : <Plus size={14} />}
                  Agregar plan
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <SearchInput value={query} onChange={setQuery} placeholder="Buscar socio o plan…" />
        <div className="ml-auto">
          <ExportarCSVButton nombreArchivo="membresias.csv" filas={filasCSV} />
        </div>
      </div>

      <div className="mt-3">
        {pageItems.length === 0 ? (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-6 text-center text-sm text-[var(--color-text-faint)] shadow-[var(--sombra-sm)]">
            {query ? 'Sin resultados para tu búsqueda' : 'Sin socios todavía'}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {pageItems.map((fila) => {
              const aviso = mensajeAviso(fila)
              return (
                <div
                  key={fila.cliente.id}
                  className="flex flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[var(--sombra-sm)]"
                >
                  <div className="flex items-center gap-3">
                    <Avatar nombre={fila.cliente.nombre} fotoUrl={fila.cliente.fotoUrl} size={48} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--color-text)]">
                        {fila.cliente.nombre}
                      </p>
                      {fila.cliente.email && (
                        <p className="truncate text-xs text-[var(--color-text-faint)]">
                          {fila.cliente.email}
                        </p>
                      )}
                    </div>
                    <span
                      className={`ml-auto shrink-0 rounded px-2 py-0.5 text-xs font-medium ${ESTADO_COLOR[fila.estado]}`}
                    >
                      {ESTADO_LABEL[fila.estado]}
                    </span>
                  </div>

                  <div className="mt-3 text-sm text-[var(--color-text-muted)]">
                    {fila.membresia?.plan ?? 'Sin plan'}
                    {fila.membresia && (
                      <span className="text-[var(--color-text-faint)]">
                        {' '}
                        · vence el {new Date(fila.membresia.fechaVencimiento).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs font-medium text-[var(--color-text)]">
                    <span>{textoDiasRestantes(fila)}</span>
                    {fila.membresia && <span className="text-[var(--color-text-faint)]">{Math.round(porcentajeRestante(fila))}%</span>}
                  </div>

                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[var(--color-bg-muted)]">
                    <div
                      className={`h-full rounded-full transition-all ${colorBarra(fila)}`}
                      style={{ width: `${porcentajeRestante(fila)}%` }}
                    />
                  </div>

                  {aviso && (
                    <p className="mt-1.5 text-xs font-medium text-amber-600">
                      {aviso}
                    </p>
                  )}

                  <div className="mt-3 flex gap-2">
                    {puedeRenovar && (
                      <button
                        type="button"
                        onClick={() => abrirRenovar(fila)}
                        disabled={planes.length === 0}
                        className="rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-40"
                      >
                        Renovar
                      </button>
                    )}
                    {puedeAdministrarPlanes && fila.membresia && (
                      <button
                        type="button"
                        onClick={() => abrirEditar(fila)}
                        className="rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)]"
                      >
                        Editar fecha
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {totalPaginas > 1 && (
          <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)]">
            <Pagination pagina={pagina} totalPaginas={totalPaginas} onChange={setPagina} total={totalFiltrados} />
          </div>
        )}
      </div>

      {modalRenovar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-[var(--color-bg-card)] p-5 shadow-lg">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">
              Renovar membresía — {modalRenovar.cliente.nombre}
            </h2>
            <p className="mt-1 text-xs text-[var(--color-text-faint)]">
              El pago se registra automáticamente en Cuentas y Reportes por el valor del plan.
            </p>

            <div className="mt-3 flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-xs text-[var(--color-text-muted)]">Plan</label>
                <select
                  value={planIdRenovar}
                  onChange={(e) => setPlanIdRenovar(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                >
                  {planes.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.nombre} ({plan.duracionDias} días · ${Number(plan.precio).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <PrimaryButton
                type="button"
                onClick={confirmarRenovar}
                disabled={renovando || !planIdRenovar}
                className="flex items-center gap-2"
              >
                {renovando && <Spinner size={14} />}
                {renovando ? 'Renovando…' : 'Renovar'}
              </PrimaryButton>
              <button
                type="button"
                onClick={() => setModalRenovar(null)}
                className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalEditar?.membresia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-[var(--color-bg-card)] p-5 shadow-lg">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">
              Editar fecha de vencimiento — {modalEditar.cliente.nombre}
            </h2>
            <p className="mt-1 text-xs text-[var(--color-text-faint)]">
              Corrige el vencimiento de esta membresía si hubo un error al renovar. No afecta cómo
              se calculan las próximas renovaciones.
            </p>

            <div className="mt-3">
              <label className="mb-1 block text-xs text-[var(--color-text-muted)]">
                Nueva fecha de vencimiento
              </label>
              <input
                type="date"
                value={fechaVencimientoEditar}
                onChange={(e) => setFechaVencimientoEditar(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
              />
            </div>

            <div className="mt-4 flex items-center gap-2">
              <PrimaryButton
                type="button"
                onClick={confirmarEditar}
                disabled={guardandoEdicion || !fechaVencimientoEditar}
                className="flex items-center gap-2"
              >
                {guardandoEdicion && <Spinner size={14} />}
                {guardandoEdicion ? 'Guardando…' : 'Guardar'}
              </PrimaryButton>
              <button
                type="button"
                onClick={() => setModalEditar(null)}
                className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
