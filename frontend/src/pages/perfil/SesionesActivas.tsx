import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { axiosInstance } from '../../lib/axios'
import { useConfirm } from '../../components/ui/ConfirmDialog'

interface Sesion {
  id: string
  userAgent: string | null
  ip: string | null
  inicioSesionEn: string
  esActual: boolean
}

function describirDispositivo(userAgent: string | null) {
  if (!userAgent) return 'Dispositivo desconocido'
  if (/iphone|ipad/i.test(userAgent)) return 'iPhone/iPad'
  if (/android/i.test(userAgent)) return 'Android'
  if (/windows/i.test(userAgent)) return 'Windows'
  if (/mac os/i.test(userAgent)) return 'Mac'
  if (/curl|postman/i.test(userAgent)) return 'Cliente API'
  return 'Navegador de escritorio'
}

export function SesionesActivas() {
  const [sesiones, setSesiones] = useState<Sesion[]>([])
  const [cargando, setCargando] = useState(true)
  const { confirmar, dialog } = useConfirm()

  const cargar = () => {
    setCargando(true)
    axiosInstance
      .get<Sesion[]>('/auth/sesiones')
      .then(({ data }) => setSesiones(data))
      .finally(() => setCargando(false))
  }

  useEffect(() => {
    cargar()
  }, [])

  const cerrarSesion = async (sesion: Sesion) => {
    const confirmado = await confirmar(
      'Cerrar sesión',
      sesion.esActual
        ? 'Esta es tu sesión actual. Se cerrará y tendrás que iniciar sesión de nuevo.'
        : '¿Cerrar esta sesión en el otro dispositivo?',
    )
    if (!confirmado) return

    try {
      await axiosInstance.delete(`/auth/sesiones/${sesion.id}`)
      toast.success('Sesión cerrada')
      if (sesion.esActual) {
        window.location.href = '/login'
        return
      }
      cargar()
    } catch {
      toast.error('No se pudo cerrar la sesión')
    }
  }

  const cerrarOtras = async () => {
    const confirmado = await confirmar(
      'Cerrar otras sesiones',
      'Se cerrará tu sesión en todos los demás dispositivos, menos este.',
    )
    if (!confirmado) return

    try {
      await axiosInstance.post('/auth/sesiones/cerrar-otras')
      toast.success('Se cerraron las demás sesiones')
      cargar()
    } catch {
      toast.error('No se pudo completar la acción')
    }
  }

  return (
    <div className="mt-8 border-t border-[var(--color-border)] pt-6">
      {dialog}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Sesiones activas</h2>
        {sesiones.length > 1 && (
          <button
            type="button"
            onClick={cerrarOtras}
            className="text-xs text-red-600 hover:underline"
          >
            Cerrar todas las demás
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {cargando && <p className="text-sm text-[var(--color-text-faint)]">Cargando…</p>}

        {!cargando &&
          sesiones.map((sesion) => (
            <div
              key={sesion.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-[var(--color-text)]">
                  {describirDispositivo(sesion.userAgent)}
                  {sesion.esActual && (
                    <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-700">
                      Este dispositivo
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-[var(--color-text-faint)]">
                  {sesion.ip ?? 'IP desconocida'} · desde{' '}
                  {new Date(sesion.inicioSesionEn).toLocaleDateString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => cerrarSesion(sesion)}
                className="shrink-0 text-xs text-red-600 hover:underline"
              >
                Cerrar
              </button>
            </div>
          ))}
      </div>
    </div>
  )
}
