import { Fragment, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { axiosInstance } from '../../lib/axios'
import { CargandoPantalla } from '../../components/ui/CargandoPantalla'
import { Spinner } from '../../components/ui/Spinner'
import { SearchInput } from '../../components/ui/SearchInput'
import { ExportarCSVButton } from '../../components/ui/ExportarCSVButton'
import { Pagination } from '../../components/ui/Pagination'
import { exportarCSV } from '../../lib/csv'
import { useBusquedaPaginada } from '../../hooks/useBusquedaPaginada'

function fechaHaceDias(dias: number) {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() - dias)
  return fecha.toISOString().slice(0, 10)
}

const TAKE = 500
const PAGE_SIZE = 20

interface RegistroAuditoria {
  id: string
  accion: string
  entidad: string
  entidadId: string | null
  detalle: Record<string, unknown> | null
  creadoEn: string
  usuario: { nombre: string; email: string } | null
}

const ACCION_LABEL: Record<string, string> = {
  crear: 'Creó',
  actualizar: 'Actualizó',
  eliminar: 'Eliminó',
  activar: 'Activó',
  desactivar: 'Desactivó',
}

const ACCION_COLOR: Record<string, string> = {
  crear: 'bg-emerald-100 text-emerald-700',
  actualizar: 'bg-blue-100 text-blue-700',
  eliminar: 'bg-red-100 text-red-700',
  activar: 'bg-emerald-100 text-emerald-700',
  desactivar: 'bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]',
}

function entidadLegible(entidad: string) {
  if (entidad.startsWith('entidad_dinamica:')) {
    return `entidad "${entidad.split(':')[1]}"`
  }
  return entidad
}

function textoBusqueda(r: RegistroAuditoria) {
  return [
    r.usuario?.nombre ?? '',
    r.usuario?.email ?? '',
    ACCION_LABEL[r.accion] ?? r.accion,
    entidadLegible(r.entidad),
    r.entidadId ?? '',
  ].join(' ')
}

function aFilaCSV(r: RegistroAuditoria) {
  return {
    fecha: new Date(r.creadoEn).toLocaleString(),
    usuario: r.usuario?.nombre ?? '',
    email: r.usuario?.email ?? '',
    accion: ACCION_LABEL[r.accion] ?? r.accion,
    entidad: entidadLegible(r.entidad),
    entidadId: r.entidadId ?? '',
    detalle: r.detalle ? JSON.stringify(r.detalle) : '',
  }
}

export function AuditoriaPage() {
  const [registros, setRegistros] = useState<RegistroAuditoria[]>([])
  const [cargando, setCargando] = useState(true)
  const [cargandoFiltro, setCargandoFiltro] = useState(false)

  const [filtroDesde, setFiltroDesde] = useState(fechaHaceDias(30))
  const [filtroHasta, setFiltroHasta] = useState('')
  const [expandidoId, setExpandidoId] = useState<string | null>(null)

  const {
    query: busqueda,
    setQuery: setBusqueda,
    pageItems,
    filtrados,
    pagina,
    setPagina,
    totalPaginas,
    totalFiltrados,
  } = useBusquedaPaginada(registros, textoBusqueda, PAGE_SIZE)

  const cargarRegistros = (desde?: string, hasta?: string) =>
    axiosInstance
      .get<RegistroAuditoria[]>('/auditoria', {
        params: { desde: desde || undefined, hasta: hasta || undefined, take: TAKE },
      })
      .then(({ data }) => setRegistros(data))

  useEffect(() => {
    setCargando(true)
    cargarRegistros(filtroDesde, filtroHasta)
      .catch(() => toast.error('No se pudo cargar la actividad'))
      .finally(() => setCargando(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (cargando) return
    setCargandoFiltro(true)
    cargarRegistros(filtroDesde, filtroHasta)
      .then(() => setPagina(1))
      .catch(() => toast.error('No se pudo cargar la actividad'))
      .finally(() => setCargandoFiltro(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroDesde, filtroHasta])

  const alcanzoElTope = registros.length === TAKE

  const filasCSV = useMemo(() => filtrados.map(aFilaCSV), [filtrados])

  const [exportandoTodo, setExportandoTodo] = useState(false)

  const exportarReporteCompleto = async () => {
    setExportandoTodo(true)
    try {
      const { data } = await axiosInstance.get<RegistroAuditoria[]>('/auditoria/exportar', {
        params: { desde: filtroDesde || undefined, hasta: filtroHasta || undefined },
      })
      const texto = busqueda.trim().toLowerCase()
      const filtradosExport = texto
        ? data.filter((r) => textoBusqueda(r).toLowerCase().includes(texto))
        : data
      if (filtradosExport.length === 0) {
        toast.info('No hay registros para exportar en este rango')
        return
      }
      exportarCSV('actividad-reporte-completo.csv', filtradosExport.map(aFilaCSV))
    } catch {
      toast.error('No se pudo generar el reporte completo')
    } finally {
      setExportandoTodo(false)
    }
  }

  if (cargando) {
    return <CargandoPantalla minHeight={300} />
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--color-text)]">Actividad</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Registro de las acciones importantes realizadas en tu empresa.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <SearchInput value={busqueda} onChange={setBusqueda} placeholder="Buscar por usuario, acción o entidad…" />
        <div className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
          <span>Desde</span>
          <input
            type="date"
            value={filtroDesde}
            onChange={(e) => setFiltroDesde(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] px-2 py-1.5 text-sm focus:border-[var(--color-primario)] focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
          <span>Hasta</span>
          <input
            type="date"
            value={filtroHasta}
            onChange={(e) => setFiltroHasta(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] px-2 py-1.5 text-sm focus:border-[var(--color-primario)] focus:outline-none"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={exportarReporteCompleto}
            disabled={exportandoTodo}
            className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-40"
          >
            {exportandoTodo && <Spinner size={14} />}
            Exportar reporte completo
          </button>
          <ExportarCSVButton nombreArchivo="actividad.csv" filas={filasCSV} />
        </div>
      </div>

      {alcanzoElTope && !busqueda.trim() && (
        <p className="mt-2 text-xs text-[var(--color-text-faint)]">
          Mostrando los primeros {TAKE} registros de este rango. Si necesitas ver más, achica el
          rango de fechas o usa "Exportar reporte completo".
        </p>
      )}

      <div className="relative mt-3 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)]">
        {cargandoFiltro && (
          <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-[var(--color-bg-card)]/70 text-sm text-[var(--color-text-muted)]">
            <Spinner size={18} />
            Actualizando…
          </div>
        )}
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]">
            <tr>
              <th className="w-8 px-2 py-2" />
              <th className="px-4 py-2">Fecha</th>
              <th className="px-4 py-2">Usuario</th>
              <th className="px-4 py-2">Acción</th>
              <th className="px-4 py-2">Sobre</th>
              <th className="px-4 py-2">Referencia</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((registro) => {
              const expandido = expandidoId === registro.id
              const tieneDetalle = registro.detalle && Object.keys(registro.detalle).length > 0
              return (
                <Fragment key={registro.id}>
                  <tr
                    className={`border-t border-[var(--color-border)] ${
                      tieneDetalle ? 'cursor-pointer hover:bg-[var(--color-bg-subtle)]' : ''
                    }`}
                    onClick={() => tieneDetalle && setExpandidoId(expandido ? null : registro.id)}
                  >
                    <td className="px-2 py-2 text-[var(--color-text-faint)]">
                      {tieneDetalle &&
                        (expandido ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-[var(--color-text-muted)]">
                      {new Date(registro.creadoEn).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">{registro.usuario?.nombre ?? '—'}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          ACCION_COLOR[registro.accion] ?? 'bg-[var(--color-bg)] text-[var(--color-text-muted)]'
                        }`}
                      >
                        {ACCION_LABEL[registro.accion] ?? registro.accion}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-[var(--color-text-muted)]">
                      {entidadLegible(registro.entidad)}
                    </td>
                    <td
                      className="px-4 py-2 font-mono text-xs text-[var(--color-text-faint)]"
                      title={registro.entidadId ?? undefined}
                    >
                      {registro.entidadId ? `${registro.entidadId.slice(0, 8)}…` : '—'}
                    </td>
                  </tr>
                  {expandido && tieneDetalle && (
                    <tr className="border-t border-[var(--color-border)] bg-[var(--color-bg-subtle)]">
                      <td />
                      <td colSpan={5} className="px-4 py-3">
                        <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-[var(--color-bg)] p-3 text-xs text-[var(--color-text-muted)]">
                          {JSON.stringify(registro.detalle, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
            {pageItems.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-[var(--color-text-faint)]">
                  Sin actividad registrada en este rango
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination pagina={pagina} totalPaginas={totalPaginas} onChange={setPagina} total={totalFiltrados} />
      </div>
    </div>
  )
}
