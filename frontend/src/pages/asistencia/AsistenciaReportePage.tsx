import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { axiosInstance } from '../../lib/axios'
import { inicioDiaLocalISO, finDiaLocalISO } from '../../lib/fechas'
import { ExportarCSVButton } from '../../components/ui/ExportarCSVButton'
import { CargandoPantalla } from '../../components/ui/CargandoPantalla'
import { MapaMarcaciones } from '../../components/ui/MapaMarcaciones'

const ETIQUETAS_TIPO: Record<string, string> = {
  entrada: 'Entrada',
  salida: 'Salida',
  inicio_comida: 'Inicio de comida',
  fin_comida: 'Fin de comida',
}

interface UsuarioBasico {
  id: string
  nombre: string
}

interface Marcacion {
  id: string
  tipo: string
  latitud: number | null
  longitud: number | null
  creadoEn: string
  usuario: UsuarioBasico
}

export function AsistenciaReportePage() {
  const [marcaciones, setMarcaciones] = useState<Marcacion[]>([])
  const [usuarios, setUsuarios] = useState<UsuarioBasico[]>([])
  const [usuarioId, setUsuarioId] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [cargando, setCargando] = useState(true)
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null)
  const mapaContenedorRef = useRef<HTMLDivElement>(null)

  const seleccionar = (id: string) => {
    setSeleccionadoId(id)
    mapaContenedorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const { data } = await axiosInstance.get<Marcacion[]>('/asistencia', {
        params: {
          usuarioId: usuarioId || undefined,
          desde: desde ? inicioDiaLocalISO(desde) : undefined,
          hasta: hasta ? finDiaLocalISO(hasta) : undefined,
        },
      })
      setMarcaciones(data)
      setSeleccionadoId(null)
    } catch {
      toast.error('No se pudo cargar el reporte de asistencia')
    } finally {
      setCargando(false)
    }
  }, [usuarioId, desde, hasta])

  useEffect(() => {
    axiosInstance
      .get<UsuarioBasico[]>('/usuarios')
      .then(({ data }) => setUsuarios(data))
      .catch(() => toast.error('No se pudieron cargar los colaboradores'))
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const filasCSV = marcaciones.map((m) => ({
    colaborador: m.usuario.nombre,
    marcacion: ETIQUETAS_TIPO[m.tipo] ?? m.tipo,
    fechaHora: new Date(m.creadoEn).toLocaleString(),
    latitud: m.latitud ?? '',
    longitud: m.longitud ?? '',
  }))

  const puntosMapa = useMemo(
    () =>
      marcaciones
        .filter((m) => m.latitud != null && m.longitud != null)
        .map((m) => ({
          id: m.id,
          lat: m.latitud as number,
          lng: m.longitud as number,
          titulo: `${m.usuario.nombre} · ${ETIQUETAS_TIPO[m.tipo] ?? m.tipo}`,
          subtitulo: new Date(m.creadoEn).toLocaleString(),
        })),
    [marcaciones],
  )

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-[var(--color-text)]">Reporte de asistencia</h1>
        <ExportarCSVButton nombreArchivo="asistencia.csv" filas={filasCSV} />
      </div>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Entrada, salida y hora de comida de todos los colaboradores, con la ubicación desde donde
        marcaron.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)] p-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
            Colaborador
          </label>
          <select
            value={usuarioId}
            onChange={(e) => setUsuarioId(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
          >
            <option value="">Todos</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">Desde</label>
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">Hasta</label>
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
          />
        </div>
      </div>

      <div ref={mapaContenedorRef} className="mt-4">
        <MapaMarcaciones puntos={puntosMapa} seleccionadoId={seleccionadoId} onSeleccionar={seleccionar} />
        {marcaciones.length > 0 && puntosMapa.length === 0 && (
          <p className="mt-1 text-xs text-[var(--color-text-faint)]">
            Ninguna de las marcaciones de este filtro tiene ubicación registrada.
          </p>
        )}
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-2">Colaborador</th>
              <th className="px-4 py-2">Marcación</th>
              <th className="px-4 py-2">Fecha y hora</th>
              <th className="px-4 py-2">Ubicación</th>
            </tr>
          </thead>
          <tbody>
            {marcaciones.map((m) => {
              const tieneUbicacion = m.latitud != null && m.longitud != null
              return (
                <tr
                  key={m.id}
                  onClick={() => tieneUbicacion && seleccionar(m.id)}
                  className={`border-t border-[var(--color-border)] ${tieneUbicacion ? 'cursor-pointer' : ''} ${
                    seleccionadoId === m.id ? 'bg-[var(--color-bg-subtle)]' : ''
                  }`}
                >
                  <td className="px-4 py-2">{m.usuario.nombre}</td>
                  <td className="px-4 py-2">{ETIQUETAS_TIPO[m.tipo] ?? m.tipo}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-[var(--color-text-muted)]">
                    {new Date(m.creadoEn).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    {tieneUbicacion ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            seleccionar(m.id)
                          }}
                          className="text-[var(--color-primario-legible)] hover:underline"
                        >
                          Ver en el mapa
                        </button>
                        <a
                          href={`https://www.google.com/maps?q=${m.latitud},${m.longitud}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[var(--color-text-faint)] hover:underline"
                        >
                          (Google Maps)
                        </a>
                      </div>
                    ) : (
                      <span className="text-[var(--color-text-faint)]">Sin ubicación</span>
                    )}
                  </td>
                </tr>
              )
            })}
            {marcaciones.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-[var(--color-text-faint)]">
                  {cargando ? (
                    <CargandoPantalla minHeight={80} />
                  ) : (
                    'Sin marcaciones en este rango'
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
