import { useEffect, useState } from 'react'
import { Command } from 'cmdk'
import { useNavigate } from 'react-router-dom'
import { useGetIdentity, useLogout } from '@refinedev/core'
import type { Identity } from '../../lib/identity'
import { NAV_ITEMS, aplanarNav } from '../../lib/navigation'
import { useModulos } from '../../providers/modulosContext'
import { useEntidades } from '../../providers/entidadesContext'
import { axiosInstance } from '../../lib/axios'

interface Props {
  abierto: boolean
  onCambiar: (abierto: boolean) => void
}

interface ClienteResultado {
  id: string
  nombre: string
  email: string | null
}

interface ProductoResultado {
  id: string
  nombre: string
  sku: string | null
}

interface UsuarioResultado {
  id: string
  nombre: string
  email: string
}

const MAX_RESULTADOS = 5

function coincide(texto: string | null | undefined, busqueda: string) {
  return (texto ?? '').toLowerCase().includes(busqueda)
}

export function CommandPalette({ abierto, onCambiar }: Props) {
  const navigate = useNavigate()
  const { data: identity } = useGetIdentity<Identity>()
  const { mutate: logout } = useLogout()
  const { modulos } = useModulos()
  const { entidades } = useEntidades()

  const [busqueda, setBusqueda] = useState('')
  const [clientes, setClientes] = useState<ClienteResultado[] | null>(null)
  const [productos, setProductos] = useState<ProductoResultado[] | null>(null)
  const [usuarios, setUsuarios] = useState<UsuarioResultado[] | null>(null)

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

  // Trae clientes/productos/usuarios una sola vez, la primera vez que se abre la paleta —
  // para poder buscarlos por nombre/email/sku sin pedirlos de nuevo en cada tecla.
  useEffect(() => {
    if (!abierto) return

    if (clientes === null && moduloActivo('clientes') && tienePermiso('clientes.leer')) {
      axiosInstance
        .get<ClienteResultado[]>('/clientes')
        .then(({ data }) => setClientes(data))
        .catch(() => setClientes([]))
    }
    if (productos === null && moduloActivo('inventario') && tienePermiso('productos.leer')) {
      axiosInstance
        .get<ProductoResultado[]>('/productos')
        .then(({ data }) => setProductos(data))
        .catch(() => setProductos([]))
    }
    if (usuarios === null && tienePermiso('usuarios.leer')) {
      axiosInstance
        .get<UsuarioResultado[]>('/usuarios')
        .then(({ data }) => setUsuarios(data))
        .catch(() => setUsuarios([]))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto])

  const ir = (ruta: string) => {
    navigate(ruta)
    onCambiar(false)
  }

  const puedeVerEntidades = tienePermiso('entidades.registros.leer')
  const busquedaNormalizada = busqueda.trim().toLowerCase()
  const buscandoDatos = busquedaNormalizada.length >= 2

  const clientesFiltrados = buscandoDatos
    ? (clientes ?? [])
        .filter((c) => coincide(c.nombre, busquedaNormalizada) || coincide(c.email, busquedaNormalizada))
        .slice(0, MAX_RESULTADOS)
    : []
  const productosFiltrados = buscandoDatos
    ? (productos ?? [])
        .filter((p) => coincide(p.nombre, busquedaNormalizada) || coincide(p.sku, busquedaNormalizada))
        .slice(0, MAX_RESULTADOS)
    : []
  const usuariosFiltrados = buscandoDatos
    ? (usuarios ?? [])
        .filter((u) => coincide(u.nombre, busquedaNormalizada) || coincide(u.email, busquedaNormalizada))
        .slice(0, MAX_RESULTADOS)
    : []

  return (
    <Command.Dialog open={abierto} onOpenChange={onCambiar} label="Buscar comandos" shouldFilter>
      <Command.Input
        placeholder="Buscar una pantalla, cliente, producto…"
        value={busqueda}
        onValueChange={setBusqueda}
      />
      <Command.List>
        <Command.Empty>Sin resultados.</Command.Empty>

        {clientesFiltrados.length > 0 && (
          <Command.Group heading="Clientes">
            {clientesFiltrados.map((cliente) => (
              <Command.Item
                key={cliente.id}
                value={`cliente ${cliente.nombre} ${cliente.email ?? ''}`}
                onSelect={() => ir(`/clientes/${cliente.id}`)}
              >
                {cliente.nombre}
                {cliente.email && (
                  <span className="ml-1 text-[var(--color-text-faint)]">· {cliente.email}</span>
                )}
              </Command.Item>
            ))}
          </Command.Group>
        )}

        {productosFiltrados.length > 0 && (
          <Command.Group heading="Productos">
            {productosFiltrados.map((producto) => (
              <Command.Item
                key={producto.id}
                value={`producto ${producto.nombre} ${producto.sku ?? ''}`}
                onSelect={() => ir('/productos')}
              >
                {producto.nombre}
                {producto.sku && (
                  <span className="ml-1 text-[var(--color-text-faint)]">· {producto.sku}</span>
                )}
              </Command.Item>
            ))}
          </Command.Group>
        )}

        {usuariosFiltrados.length > 0 && (
          <Command.Group heading="Usuarios">
            {usuariosFiltrados.map((usuario) => (
              <Command.Item
                key={usuario.id}
                value={`usuario ${usuario.nombre} ${usuario.email}`}
                onSelect={() => ir('/usuarios')}
              >
                {usuario.nombre}
                <span className="ml-1 text-[var(--color-text-faint)]">· {usuario.email}</span>
              </Command.Item>
            ))}
          </Command.Group>
        )}

        <Command.Group heading="Navegación">
          {aplanarNav(NAV_ITEMS).filter(
            (item) =>
              moduloActivo(item.modulo) &&
              (!item.superAdminOnly || identity?.esSuperAdmin) &&
              (item.sinPermiso || tienePermiso(`${item.resource}.leer`)),
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
          {tienePermiso('productos.crear') && moduloActivo('inventario') && (
            <Command.Item onSelect={() => ir('/productos')}>
              Nuevo producto
            </Command.Item>
          )}
          {tienePermiso('activos.crear') && moduloActivo('inventario') && (
            <Command.Item onSelect={() => ir('/activos')}>
              Nuevo activo
            </Command.Item>
          )}
          {tienePermiso('citas.crear') && moduloActivo('citas') && (
            <Command.Item onSelect={() => ir('/citas')}>
              Nueva cita
            </Command.Item>
          )}
          {tienePermiso('ventas.crear') && moduloActivo('ventas') && (
            <Command.Item onSelect={() => ir('/ventas')}>
              Nueva venta
            </Command.Item>
          )}
          {tienePermiso('proveedores.crear') && moduloActivo('compras') && (
            <Command.Item onSelect={() => ir('/proveedores')}>
              Nuevo proveedor
            </Command.Item>
          )}
          {tienePermiso('costeo.crear') && moduloActivo('costeo') && (
            <Command.Item onSelect={() => ir('/costeos/nuevo')}>
              Nuevo costeo
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

      <div className="flex items-center justify-end gap-3 border-t border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-text-faint)]">
        <span className="flex items-center gap-1">
          <kbd className="rounded border border-[var(--color-border)] px-1.5 py-0.5">↑↓</kbd>
          Navegar
        </span>
        <span className="flex items-center gap-1">
          <kbd className="rounded border border-[var(--color-border)] px-1.5 py-0.5">↵</kbd>
          Seleccionar
        </span>
        <span className="flex items-center gap-1">
          <kbd className="rounded border border-[var(--color-border)] px-1.5 py-0.5">Esc</kbd>
          Cerrar
        </span>
      </div>
    </Command.Dialog>
  )
}
