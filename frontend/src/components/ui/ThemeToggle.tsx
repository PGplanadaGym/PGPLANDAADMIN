import { useEffect, useState } from 'react'
import { aplicarTema, obtenerTemaPreferido, type Tema } from '../../lib/theme'

function IconoSol() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
      <circle cx="12" cy="12" r="4" />
      <path
        strokeLinecap="round"
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
      />
    </svg>
  )
}

function IconoLuna() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  )
}

export function ThemeToggle() {
  const [tema, setTema] = useState<Tema>('light')

  useEffect(() => {
    setTema(obtenerTemaPreferido())
  }, [])

  const alternar = () => {
    const nuevo: Tema = tema === 'dark' ? 'light' : 'dark'
    setTema(nuevo)
    aplicarTema(nuevo)
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label="Cambiar tema"
      className="rounded p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]"
    >
      {tema === 'dark' ? <IconoSol /> : <IconoLuna />}
    </button>
  )
}
