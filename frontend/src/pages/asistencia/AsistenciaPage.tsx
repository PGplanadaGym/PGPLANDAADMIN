import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { axiosInstance } from '../../lib/axios'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { Spinner } from '../../components/ui/Spinner'
import { CargandoPantalla } from '../../components/ui/CargandoPantalla'

const ETIQUETAS_TIPO: Record<string, string> = {
  entrada: 'Marcar entrada',
  salida: 'Marcar salida',
  inicio_comida: 'Marcar inicio de comida',
  fin_comida: 'Marcar fin de comida',
}

const ESTADO_TEXTO: Record<string, string> = {
  ninguno: 'Aún no marcas tu entrada hoy',
  entrada: 'Estás trabajando',
  inicio_comida: 'Estás en tu hora de comida',
  fin_comida: 'Estás trabajando (de vuelta de comida)',
  salida: 'Ya terminaste tu jornada de hoy',
}

interface Marcacion {
  id: string
  tipo: string
  latitud: number | null
  longitud: number | null
  creadoEn: string
}

interface EstadoAsistencia {
  marcacionesHoy: Marcacion[]
  ultimoTipo: string
  siguientesPermitidos: string[]
}

interface Ubicacion {
  latitud: number
  longitud: number
  precision: number
}

function obtenerUbicacion(): Promise<Ubicacion | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitud: pos.coords.latitude,
          longitud: pos.coords.longitude,
          precision: pos.coords.accuracy,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  })
}

function mensajeError(error: unknown, fallback: string) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  )
}

export function AsistenciaPage() {
  const [estado, setEstado] = useState<EstadoAsistencia | null>(null)
  const [cargando, setCargando] = useState(true)
  const [marcando, setMarcando] = useState<string | null>(null)

  const cargarEstado = useCallback(async () => {
    setCargando(true)
    try {
      const { data } = await axiosInstance.get<EstadoAsistencia>('/asistencia/estado')
      setEstado(data)
    } catch {
      toast.error('No se pudo cargar tu estado de asistencia')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargarEstado()
  }, [cargarEstado])

  const marcar = async (tipo: string) => {
    setMarcando(tipo)
    try {
      const ubicacion = await obtenerUbicacion()
      if (!ubicacion) {
        toast.warning('No se pudo obtener tu ubicación; se registrará sin GPS')
      }
      await axiosInstance.post('/asistencia/marcar', { tipo, ...ubicacion })
      toast.success('Marcación registrada')
      await cargarEstado()
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo registrar la marcación'))
    } finally {
      setMarcando(null)
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--color-text)]">Mi asistencia</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Marca tu entrada, salida y hora de comida. Se registra tu ubicación mediante el GPS del
        navegador (pedirá permiso de ubicación).
      </p>

      <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)] p-6">
        {cargando && <CargandoPantalla minHeight={100} />}

        {!cargando && estado && (
          <>
            <p className="text-lg font-semibold text-[var(--color-text)]">
              {ESTADO_TEXTO[estado.ultimoTipo] ?? '—'}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {estado.siguientesPermitidos.map((tipo) => (
                <PrimaryButton
                  key={tipo}
                  type="button"
                  onClick={() => marcar(tipo)}
                  disabled={marcando !== null}
                  className="flex items-center gap-2"
                >
                  {marcando === tipo && <Spinner size={14} />}
                  {ETIQUETAS_TIPO[tipo] ?? tipo}
                </PrimaryButton>
              ))}
              {estado.siguientesPermitidos.length === 0 && (
                <p className="text-sm text-[var(--color-text-faint)]">
                  Ya completaste todas tus marcaciones de hoy.
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {!cargando && estado && estado.marcacionesHoy.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]">
              <tr>
                <th className="px-4 py-2">Marcación</th>
                <th className="px-4 py-2">Hora</th>
                <th className="px-4 py-2">Ubicación</th>
              </tr>
            </thead>
            <tbody>
              {estado.marcacionesHoy.map((m) => (
                <tr key={m.id} className="border-t border-[var(--color-border)]">
                  <td className="px-4 py-2">{ETIQUETAS_TIPO[m.tipo] ?? m.tipo}</td>
                  <td className="px-4 py-2">{new Date(m.creadoEn).toLocaleTimeString()}</td>
                  <td className="px-4 py-2">
                    {m.latitud != null && m.longitud != null ? (
                      <a
                        href={`https://www.google.com/maps?q=${m.latitud},${m.longitud}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--color-primario-legible)] hover:underline"
                      >
                        Ver en el mapa
                      </a>
                    ) : (
                      <span className="text-[var(--color-text-faint)]">Sin ubicación</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
