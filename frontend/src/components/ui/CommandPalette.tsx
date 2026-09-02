import { useEffect } from 'react'
import { Command } from 'cmdk'
import { useNavigate } from 'react-router-dom'
import { useGetIdentity, useLogout } from '@refinedev/core'
import type { Identity } from '../../lib/identity'
import { NAV_ITEMS } from '../../lib/navigation'
import { useModulos } from '../../providers/modulosContext'
import { useEntidades } from '../../providers/entidadesContext'

interface Props {
  abierto: boolean
  onCambiar: (abierto: boolean) => void
}

export function CommandPalette({ abierto, onCambiar }: Props) {
  const navigate = useNavigate()
  const { data: identity } = useGetIdentity<Identity>()
  const { mutate: logout } = useLogout()
  const { modulos } = useModulos()
  const { entidades } = useEntidades()

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        onCambiar(!abierto)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto])

  const moduloActivo = (clave?: string) => {
    if (!clave) return true
    return modulos.some((modulo) => modulo.clave === clave && modulo.activo)
  }

  const tienePermiso = (permiso: string) => identity?.permisos.includes(permiso) ?? false

  const ir = (ruta: string) => {
    navigate(ruta)
    onCambiar(false)
  }

  const puedeVerEntidades = tienePermiso('entidades.registros.leer')

  return (
    <Command.Dialog open={abierto} onOpenChange={onCambiar} label="Buscar comandos" shouldFilter>
      <Command.Input placeholder="Buscar una pantalla o acción… (Ctrl+K)" />
      <Command.List>
        <Command.Empty>Sin resultados.</Command.Empty>

        <Command.Group heading="Navegación">
          {NAV_ITEMS.filter(
            (item) => moduloActivo(item.modulo) && (item.sinPermiso || tienePermiso(`${item.resource}.leer`)),
          ).map((item) => (
            <Command.Item key={item.to} onSelect={() => ir(item.to)}>
              <item.icon className="h-4 w-4" strokeWidth={2} />
              {item.label}
            </Command.Item>
          ))}
        </Command.Group>

        {puedeVerEntidades && entidades.length > 0 && (
          <Command.Group heading="Entidades">
            {entidades.map((entidad) => (
              <Command.Item
                key={entidad.clave}
                onSelect={() => ir(`/entidades/${entidad.clave}`)}
              >
                {entidad.nombre}
              </Command.Item>
            ))}
          </Command.Group>
        )}

        <Command.Group heading="Acciones rápidas">
          {tienePermiso('usuarios.crear') && (
            <Command.Item onSelect={() => ir('/usuarios/nuevo')}>
              Invitar usuario
            </Command.Item>
          )}
          {tienePermiso('clientes.crear') && moduloActivo('clientes') && (
            <Command.Item onSelect={() => ir('/clientes/nuevo')}>
              Nuevo cliente
            </Command.Item>
          )}
          <Command.Item onSelect={() => ir('/perfil')}>Mi perfil</Command.Item>
          <Command.Item
            onSelect={() => {
              onCambiar(false)
              logout()
            }}
          >
            Cerrar sesión
          </Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  )
}
