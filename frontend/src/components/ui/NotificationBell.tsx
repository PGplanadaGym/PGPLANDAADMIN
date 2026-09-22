import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CalendarClock, PackageX, AlertTriangle } from 'lucide-react'
import { axiosInstance } from '../../lib/axios'
import { tiempoRelativo } from '../../lib/fechas'
import { CargandoPantalla } from './CargandoPantalla'

interface Notificacion {
  id: string
  tipo: string
  titulo: string
  mensaje: string
  enlace: string | null
  leida: boolean
  creadoEn: string
}

const INTERVALO_MS = 30000

const ESTILO_POR_TIPO: Record<string, { icon: typeof Bell; className: string }> = {
  stock_bajo: { icon: PackageX, className: 'bg-red-100 text-red-600' },
  cita_asignada: {
    icon: CalendarClock,
    className: 'bg-[var(--color-primario-suave)] text-[var(--color-primario-legible)]',
  },
  membresia_por_vencer: { icon: AlertTriangle, className: 'bg-amber-100 text-amber-600' },
}
const ESTILO_DEFECTO = {
  icon: Bell,
  className: 'bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]',
}

function IconoNotificacion({ tipo }: { tipo: string }) {
  const { icon: Icono, className } = ESTILO_POR_TIPO[tipo] ?? ESTILO_DEFECTO
  return (
    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${className}`}>
      <Icono className="h-4 w-4" strokeWidth={2} />
    </div>
  )
}

export function NotificationBell() {
  const navigate = useNavigate()
  const [abierto, setAbierto] = useState(false)
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [cargandoLista, setCargandoLista] = useState(true)
  const [contador, setContador] = useState(0)
  const contenedorRef = useRef<HTMLDivElement>(null)

  const cargarContador = () => {
    axiosInstance
      .get<number>('/notificaciones/no-leidas/contador')
      .then(({ data }) => setContador(data))
      .catch(() => {
        /* silencioso: no es crítico si falla el conteo */
      })
  }

  const cargarNotificaciones = () => {
    setCargandoLista(true)
    axiosInstance
      .get<Notificacion[]>('/notificaciones')
      .then(({ data }) => setNotificaciones(data))
      .catch(() => {
        /* silencioso */
      })
      .finally(() => setCargandoLista(false))
  }

  useEffect(() => {
    cargarContador()
    const id = setInterval(cargarContador, INTERVALO_MS)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!abierto) return
    cargarNotificaciones()
  }, [abierto])

  useEffect(() => {
    const alHacerClicFuera = (e: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false)
      }
    }
    document.addEventListener('mousedown', alHacerClicFuera)
    return () => document.removeEventListener('mousedown', alHacerClicFuera)
  }, [])

  const abrirNotificacion = async (notificacion: Notificacion) => {
    if (!notificacion.leida) {
      try {
        await axiosInstance.patch(`/notificaciones/${notificacion.id}/leida`)
        setNotificaciones((prev) =>
          prev.map((n) => (n.id === notificacion.id ? { ...n, leida: true } : n)),
        )
        setContador((c) => Math.max(0, c - 1))
      } catch {
        /* silencioso */
      }
    }
    setAbierto(false)
    if (notificacion.enlace) navigate(notificacion.enlace)
  }

  const marcarTodasLeidas = async () => {
    try {
      await axiosInstance.patch('/notificaciones/leer-todas')
      setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })))
      setContador(0)
    } catch {
      /* silencioso */
    }
  }

  return (
    <div ref={contenedorRef} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="relative rounded-lg p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]"
        aria-label="Notificaciones"
      >
        <Bell className="h-5 w-5" />
        {contador > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {contador > 9 ? '9+' : contador}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-lg)]">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-2.5">
            <span className="text-sm font-semibold text-[var(--color-text)]">Notificaciones</span>
            {notificaciones.some((n) => !n.leida) && (
              <button
                type="button"
                onClick={marcarTodasLeidas}
                className="text-xs text-[var(--color-primario-legible)] hover:underline"
              >
                Marcar todas leídas
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {cargandoLista && <CargandoPantalla minHeight={140} />}

            {!cargandoLista && notificaciones.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-[var(--color-text-faint)]">
                Sin notificaciones
              </p>
            )}
            {!cargandoLista &&
              notificaciones.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => abrirNotificacion(n)}
                  className={`flex w-full items-start gap-3 border-b border-[var(--color-border)] px-4 py-3 text-left text-sm last:border-b-0 hover:bg-[var(--color-bg-hover)] ${
                    n.leida ? '' : 'bg-[var(--color-primario-suave)]/40'
                  }`}
                >
                  <IconoNotificacion tipo={n.tipo} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-[var(--color-text)]">{n.titulo}</span>
                    <span className="block text-[var(--color-text-muted)]">{n.mensaje}</span>
                    <span className="mt-1 block text-xs text-[var(--color-text-faint)]">
                      {tiempoRelativo(n.creadoEn)}
                    </span>
                  </span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
