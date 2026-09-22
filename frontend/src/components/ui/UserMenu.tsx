import { useEffect, useRef, useState } from 'react'
import { useGetIdentity, useLogout } from '@refinedev/core'
import { Link } from 'react-router-dom'
import { Power, UserRound } from 'lucide-react'
import type { Identity } from '../../lib/identity'
import { Avatar } from './Avatar'

export function UserMenu() {
  const { data: identity } = useGetIdentity<Identity>()
  const { mutate: logout } = useLogout()
  const [abierto, setAbierto] = useState(false)
  const contenedorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const alHacerClicFuera = (e: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false)
      }
    }
    document.addEventListener('mousedown', alHacerClicFuera)
    return () => document.removeEventListener('mousedown', alHacerClicFuera)
  }, [])

  return (
    <div ref={contenedorRef} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-label="Menú de cuenta"
        aria-haspopup="menu"
        aria-expanded={abierto}
        className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-1 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]"
      >
        <Avatar nombre={identity?.nombre} fotoUrl={identity?.fotoUrl} size={28} />
        <span className="min-w-0 truncate font-medium text-[var(--color-text)]">
          {identity?.nombre}
        </span>
      </button>

      {abierto && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-1 shadow-[var(--sombra-lg)]"
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium text-[var(--color-text)]">
              {identity?.nombre}
            </p>
            <p className="truncate text-xs text-[var(--color-text-faint)]">{identity?.email}</p>
          </div>

          <div className="my-1 h-px bg-[var(--color-border)]" />

          <Link
            to="/perfil"
            onClick={() => setAbierto(false)}
            role="menuitem"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-hover)]"
          >
            <UserRound className="h-4 w-4" />
            Mi perfil
          </Link>

          <div className="my-1 h-px bg-[var(--color-border)]" />

          <button
            type="button"
            role="menuitem"
            onClick={() => logout()}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
          >
            <Power className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}
