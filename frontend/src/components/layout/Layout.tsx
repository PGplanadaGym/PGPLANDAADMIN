import { useEffect, useState } from 'react'
import { CanAccess, useGetIdentity, useLogout } from '@refinedev/core'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Menu, Search, LogOut } from 'lucide-react'
import type { Identity } from '../../lib/identity'
import { aplicarColorPrimario } from '../../lib/theme'
import { ModulosProvider, useModulos } from '../../providers/modulosContext'
import { EntidadesProvider, useEntidades } from '../../providers/entidadesContext'
import { Avatar } from '../ui/Avatar'
import { ThemeToggle } from '../ui/ThemeToggle'
import { NotificationBell } from '../ui/NotificationBell'
import { CommandPalette } from '../ui/CommandPalette'
import { NAV_ITEMS } from '../../lib/navigation'

interface SidebarProps {
  identity?: Identity
  abierto: boolean
  onCerrar: () => void
}

function esRutaActiva(pathname: string, to: string) {
  if (to === '/') return pathname === '/'
  return pathname === to || pathname.startsWith(`${to}/`)
}

function Sidebar({ identity, abierto, onCerrar }: SidebarProps) {
  const { modulos } = useModulos()
  const { entidades } = useEntidades()
  const location = useLocation()

  const moduloActivo = (clave?: string) => {
    if (!clave) return true
    return modulos.some((modulo) => modulo.clave === clave && modulo.activo)
  }

  const puedeVerEntidades =
    identity?.permisos.includes('entidades.registros.leer') ?? false

  const claseEnlace = (activo: boolean) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      activo
        ? 'bg-[var(--color-primario-suave)] text-[var(--color-primario-legible)]'
        : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text)]'
    }`

  return (
    <>
      {/* Overlay solo en móvil, cuando el drawer está abierto */}
      {abierto && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={onCerrar}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-card)] transition-transform duration-200 ease-in-out md:relative md:z-auto md:translate-x-0 ${
          abierto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2 px-5 py-5">
          {identity?.empresa.logoUrl ? (
            <img
              src={identity.empresa.logoUrl}
              alt={identity.empresa.nombre}
              className="h-8 max-w-full object-contain"
            />
          ) : (
            <span className="truncate text-lg font-bold tracking-tight text-[var(--color-text)]">
              {identity?.empresa.nombre ?? 'Backoffice Core'}
            </span>
          )}
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-4">
          {NAV_ITEMS.filter((item) => moduloActivo(item.modulo)).map((item) => {
            const Icono = item.icon
            const activo = esRutaActiva(location.pathname, item.to)
            const enlace = (
              <Link to={item.to} onClick={onCerrar} className={claseEnlace(activo)}>
                <Icono className="h-4 w-4 shrink-0" strokeWidth={2} />
                <span className="truncate">{item.label}</span>
              </Link>
            )

            if (item.sinPermiso) {
              return <div key={item.to}>{enlace}</div>
            }

            return (
              <CanAccess key={item.to} resource={item.resource} action="list">
                {enlace}
              </CanAccess>
            )
          })}

          {puedeVerEntidades && entidades.length > 0 && (
            <>
              <div className="mb-1 mt-4 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-faint)]">
                Entidades
              </div>
              {entidades.map((entidad) => (
                <Link
                  key={entidad.clave}
                  to={`/entidades/${entidad.clave}`}
                  onClick={onCerrar}
                  className={claseEnlace(esRutaActiva(location.pathname, `/entidades/${entidad.clave}`))}
                >
                  <span className="h-4 w-4 shrink-0 rounded bg-[var(--color-bg-muted)]" />
                  <span className="truncate">{entidad.nombre}</span>
                </Link>
              ))}
            </>
          )}
        </nav>
      </aside>
    </>
  )
}

export function Layout() {
  const { data: identity } = useGetIdentity<Identity>()
  const { mutate: logout } = useLogout()
  const [sidebarAbierto, setSidebarAbierto] = useState(false)
  const [paletaAbierta, setPaletaAbierta] = useState(false)
  const location = useLocation()

  useEffect(() => {
    aplicarColorPrimario(identity?.empresa.colorPrimario)
  }, [identity?.empresa.colorPrimario])

  // Cierra el drawer móvil automáticamente al navegar
  useEffect(() => {
    setSidebarAbierto(false)
  }, [location.pathname])

  return (
    <ModulosProvider>
      <EntidadesProvider>
        <CommandPalette abierto={paletaAbierta} onCambiar={setPaletaAbierta} />
        <div className="flex min-h-screen bg-[var(--color-bg)]">
          <Sidebar
            identity={identity}
            abierto={sidebarAbierto}
            onCerrar={() => setSidebarAbierto(false)}
          />

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-bg-card)]/80 px-4 py-3 backdrop-blur sm:px-6">
              <div className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSidebarAbierto((v) => !v)}
                  className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] md:hidden"
                  aria-label="Abrir menú"
                >
                  <Menu className="h-5 w-5" />
                </button>

                <Link
                  to="/perfil"
                  className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-1 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]"
                >
                  <Avatar nombre={identity?.nombre} fotoUrl={identity?.fotoUrl} size={28} />
                  <span className="truncate">
                    <span className="font-medium text-[var(--color-text)]">{identity?.nombre}</span>
                    <span className="hidden sm:inline"> · {identity?.email}</span>
                  </span>
                </Link>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPaletaAbierta(true)}
                  className="hidden items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] sm:flex"
                >
                  <Search className="h-4 w-4" />
                  Buscar
                  <kbd className="rounded-lg border border-[var(--color-border)] px-1.5 py-0.5 text-xs">
                    Ctrl K
                  </kbd>
                </button>
                <NotificationBell />
                <ThemeToggle />
                <button
                  type="button"
                  onClick={() => logout()}
                  className="flex items-center gap-2 rounded-lg bg-[var(--color-bg-muted)] px-3 py-1.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-border)]"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Cerrar sesión</span>
                </button>
              </div>
            </header>

            <main className="min-w-0 flex-1 p-4 sm:p-6">
              <Outlet />
            </main>
          </div>
        </div>
      </EntidadesProvider>
    </ModulosProvider>
  )
}
