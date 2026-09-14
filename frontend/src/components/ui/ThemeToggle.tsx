import { useEffect, useRef, useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { aplicarTema, obtenerTemaGuardado, type Tema } from '../../lib/theme'

const OPCIONES: { value: Tema; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Oscuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor },
]

export function ThemeToggle() {
  const [tema, setTema] = useState<Tema>('system')
  const [abierto, setAbierto] = useState(false)
  const contenedorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setTema(obtenerTemaGuardado())
  }, [])

  useEffect(() => {
    const alHacerClicFuera = (e: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false)
      }
    }
    document.addEventListener('mousedown', alHacerClicFuera)
    return () => document.removeEventListener('mousedown', alHacerClicFuera)
  }, [])

  const elegir = (nuevo: Tema) => {
    setTema(nuevo)
    aplicarTema(nuevo)
    setAbierto(false)
  }

  const opcionActual = OPCIONES.find((o) => o.value === tema) ?? OPCIONES[2]
  const IconoActual = opcionActual.icon

  return (
    <div ref={contenedorRef} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-label="Cambiar tema"
        aria-haspopup="menu"
        aria-expanded={abierto}
        className="rounded p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]"
      >
        <IconoActual className="h-5 w-5" strokeWidth={2} />
      </button>

      {abierto && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-36 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-1 shadow-[var(--sombra-lg)]"
        >
          {OPCIONES.map((opcion) => {
            const Icono = opcion.icon
            const activa = tema === opcion.value
            return (
              <button
                key={opcion.value}
                type="button"
                role="menuitemradio"
                aria-checked={activa}
                onClick={() => elegir(opcion.value)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                  activa
                    ? 'bg-[var(--color-primario-suave)] text-[var(--color-primario-legible)]'
                    : 'text-[var(--color-text)] hover:bg-[var(--color-bg-hover)]'
                }`}
              >
                <Icono className="h-4 w-4" strokeWidth={2} />
                {opcion.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
