import { useEffect, useState } from 'react'
import { CanAccess, useTable } from '@refinedev/core'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { X } from 'lucide-react'
import { axiosInstance } from '../../lib/axios'
import { mensajeError } from '../../lib/errores'
import { useBusquedaPaginada } from '../../hooks/useBusquedaPaginada'
import { useConfirm } from '../../components/ui/ConfirmDialog'
import { SearchInput } from '../../components/ui/SearchInput'
import { Pagination } from '../../components/ui/Pagination'
import { PrimaryButton, PrimaryLinkButton } from '../../components/ui/PrimaryButton'
import { ExportarExcelButton } from '../../components/ui/ExportarExcelButton'
import { Spinner } from '../../components/ui/Spinner'
import { CargandoPantalla } from '../../components/ui/CargandoPantalla'
import { Avatar } from '../../components/ui/Avatar'

interface Rol {
  id: string
  nombre: string
}

interface Sucursal {
  id: string
  nombre: string
}

interface Usuario {
  id: string
  nombre: string
  email: string
  fotoUrl: string | null
  activo: boolean
  passwordConfigurada: boolean
  creadoEn: string
  roles: { rol: Rol }[]
  sucursal: Sucursal | null
}

const ESTADOS = [
  { value: '', label: 'Todos los estados' },
  { value: 'activos', label: 'Activos' },
  { value: 'inactivos', label: 'Inactivos' },
  { value: 'pendientes', label: 'Invitación pendiente' },
] as const

export function UsuariosListPage() {
  const { tableQuery } = useTable<Usuario>({ resource: 'usuarios' })
  const usuarios = tableQuery.data?.data ?? []

  const [roles, setRoles] = useState<Rol[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [modalUsuario, setModalUsuario] = useState<Usuario | null>(null)
  const [rolesMarcados, setRolesMarcados] = useState<Set<string>>(new Set())
  const [guardando, setGuardando] = useState(false)
  const [reenviandoId, setReenviandoId] = useState<string | null>(null)
  const [cambiandoSucursalId, setCambiandoSucursalId] = useState<string | null>(null)
  const [cambiandoActivoId, setCambiandoActivoId] = useState<string | null>(null)
  const [filtroRol, setFiltroRol] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<(typeof ESTADOS)[number]['value']>('')
  const { confirmar, dialog } = useConfirm()

  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [rolLoteId, setRolLoteId] = useState('')
  const [procesandoLote, setProcesandoLote] = useState(false)

  useEffect(() => {
    axiosInstance
      .get<{ id: string; empresaId: string | null; nombre: string }[]>('/roles')
      .then(({ data }) => setRoles(data.filter((r) => r.empresaId !== null)))
      .catch(() => {
        /* si no tiene permiso para ver roles, simplemente no se puede editar desde aquí */
      })
    axiosInstance
      .get<Sucursal[]>('/sucursales')
      .then(({ data }) => setSucursales(data))
      .catch(() => {
        /* módulo Sucursales puede no estar activo */
      })
  }, [])

  const cambiarSucursal = async (usuario: Usuario, sucursalId: string) => {
    setCambiandoSucursalId(usuario.id)
    try {
      await axiosInstance.patch(`/usuarios/${usuario.id}/sucursal`, {
        sucursalId: sucursalId || null,
      })
      toast.success('Sucursal actualizada')
      await tableQuery.refetch()
    } catch {
      toast.error('No se pudo actualizar la sucursal')
    } finally {
      setCambiandoSucursalId(null)
    }
  }

  const cambiarActivo = async (usuario: Usuario) => {
    if (usuario.activo) {
      const confirmado = await confirmar(
        `Desactivar a ${usuario.nombre}`,
        'Ya no podrá iniciar sesión y se cerrarán todas sus sesiones activas. Puedes reactivarlo cuando quieras.',
        'Desactivar',
      )
      if (!confirmado) return
    }
    setCambiandoActivoId(usuario.id)
    try {
      await axiosInstance.patch(`/usuarios/${usuario.id}/activo`, { activo: !usuario.activo })
      toast.success(usuario.activo ? 'Usuario desactivado' : 'Usuario activado')
      await tableQuery.refetch()
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo actualizar el estado'))
    } finally {
      setCambiandoActivoId(null)
    }
  }

  const reenviarInvitacion = async (usuario: Usuario) => {
    setReenviandoId(usuario.id)
    try {
      await axiosInstance.post(`/usuarios/${usuario.id}/reenviar-invitacion`)
      toast.success(`Invitación reenviada a ${usuario.email}`)
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo reenviar la invitación'))
    } finally {
      setReenviandoId(null)
    }
  }

  const usuariosFiltrados = usuarios.filter((u) => {
    if (filtroRol && !u.roles.some((r) => r.rol.id === filtroRol)) return false
    if (filtroEstado === 'activos' && !u.activo) return false
    if (filtroEstado === 'inactivos' && u.activo) return false
    if (filtroEstado === 'pendientes' && u.passwordConfigurada) return false
    return true
  })

  const {
    query,
    setQuery,
    pageItems,
    filtrados,
    pagina,
    setPagina,
    totalPaginas,
    totalFiltrados,
  } = useBusquedaPaginada(usuariosFiltrados, (u) => `${u.nombre} ${u.email}`)

  const abrirModal = (usuario: Usuario) => {
    setModalUsuario(usuario)
    setRolesMarcados(new Set(usuario.roles.map((r) => r.rol.id)))
  }

  const alternarRol = (rolId: string) => {
    setRolesMarcados((prev) => {
      const nuevo = new Set(prev)
      if (nuevo.has(rolId)) nuevo.delete(rolId)
      else nuevo.add(rolId)
      return nuevo
    })
  }

  const guardarRoles = async () => {
    if (!modalUsuario) return
    setGuardando(true)
    try {
      await axiosInstance.patch(`/usuarios/${modalUsuario.id}/roles`, {
        rolIds: [...rolesMarcados],
      })
      toast.success('Rol actualizado')
      setModalUsuario(null)
      await tableQuery.refetch()
    } catch {
      toast.error('No se pudo actualizar el rol')
    } finally {
      setGuardando(false)
    }
  }

  const todosSeleccionadosEnPagina =
    pageItems.length > 0 && pageItems.every((u) => seleccionados.has(u.id))

  const alternarSeleccionTodos = () => {
    setSeleccionados((prev) => {
      if (todosSeleccionadosEnPagina) {
        const nuevo = new Set(prev)
        pageItems.forEach((u) => nuevo.delete(u.id))
        return nuevo
      }
      const nuevo = new Set(prev)
      pageItems.forEach((u) => nuevo.add(u.id))
      return nuevo
    })
  }

  const alternarSeleccion = (usuarioId: string) => {
    setSeleccionados((prev) => {
      const nuevo = new Set(prev)
      if (nuevo.has(usuarioId)) nuevo.delete(usuarioId)
      else nuevo.add(usuarioId)
      return nuevo
    })
  }

  const limpiarSeleccion = () => setSeleccionados(new Set())

  const usuariosSeleccionados = usuarios.filter((u) => seleccionados.has(u.id))

  const cambiarActivoEnLote = async (activo: boolean) => {
    if (usuariosSeleccionados.length === 0) return
    if (!activo) {
      const confirmado = await confirmar(
        `Desactivar ${usuariosSeleccionados.length} usuario(s)`,
        'Ya no podrán iniciar sesión y se cerrarán todas sus sesiones activas. Puedes reactivarlos cuando quieras.',
        'Desactivar',
      )
      if (!confirmado) return
    }
    setProcesandoLote(true)
    try {
      const resultados = await Promise.allSettled(
        usuariosSeleccionados.map((u) =>
          axiosInstance.patch(`/usuarios/${u.id}/activo`, { activo }),
        ),
      )
      const fallidos = resultados.filter((r) => r.status === 'rejected').length
      if (fallidos > 0) {
        toast.error(`${fallidos} usuario(s) no se pudieron actualizar`)
      } else {
        toast.success(`${usuariosSeleccionados.length} usuario(s) actualizados`)
      }
      limpiarSeleccion()
      await tableQuery.refetch()
    } finally {
      setProcesandoLote(false)
    }
  }

  const asignarRolEnLote = async () => {
    if (!rolLoteId || usuariosSeleccionados.length === 0) return
    setProcesandoLote(true)
    try {
      const resultados = await Promise.allSettled(
        usuariosSeleccionados.map((u) => {
          const rolIdsNuevo = new Set(u.roles.map((r) => r.rol.id))
          rolIdsNuevo.add(rolLoteId)
          return axiosInstance.patch(`/usuarios/${u.id}/roles`, { rolIds: [...rolIdsNuevo] })
        }),
      )
      const fallidos = resultados.filter((r) => r.status === 'rejected').length
      if (fallidos > 0) {
        toast.error(`${fallidos} usuario(s) no se pudieron actualizar`)
      } else {
        toast.success(`Rol asignado a ${usuariosSeleccionados.length} usuario(s)`)
      }
      setRolLoteId('')
      limpiarSeleccion()
      await tableQuery.refetch()
    } finally {
      setProcesandoLote(false)
    }
  }

  return (
    <div>
      {dialog}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-[var(--color-text)]">Usuarios</h1>
        <div className="flex flex-wrap items-center gap-2">
          <ExportarExcelButton nombreArchivo="usuarios.csv" filas={filtrados} />
          <CanAccess resource="usuarios" action="create">
            <PrimaryLinkButton to="/usuarios/nuevo">Invitar usuario</PrimaryLinkButton>
          </CanAccess>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <SearchInput value={query} onChange={setQuery} placeholder="Buscar por nombre o email…" />
        <select
          value={filtroRol}
          onChange={(e) => setFiltroRol(e.target.value)}
          className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm focus:border-[var(--color-primario)] focus:outline-none"
        >
          <option value="">Todos los roles</option>
          {roles.map((rol) => (
            <option key={rol.id} value={rol.id}>
              {rol.nombre}
            </option>
          ))}
        </select>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value as typeof filtroEstado)}
          className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm focus:border-[var(--color-primario)] focus:outline-none"
        >
          {ESTADOS.map((estado) => (
            <option key={estado.value} value={estado.value}>
              {estado.label}
            </option>
          ))}
        </select>
      </div>

      <CanAccess resource="usuarios" action="edit">
        {seleccionados.size > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--color-primario)] bg-[var(--color-primario-suave)] px-3 py-2">
            <span className="text-sm font-medium text-[var(--color-text)]">
              {seleccionados.size} seleccionado(s)
            </span>
            <select
              value={rolLoteId}
              onChange={(e) => setRolLoteId(e.target.value)}
              className="rounded-lg border border-[var(--color-border)] px-2 py-1 text-sm focus:border-[var(--color-primario)] focus:outline-none"
            >
              <option value="">Asignar rol…</option>
              {roles.map((rol) => (
                <option key={rol.id} value={rol.id}>
                  {rol.nombre}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={asignarRolEnLote}
              disabled={!rolLoteId || procesandoLote}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-50"
            >
              Aplicar
            </button>
            <button
              type="button"
              onClick={() => cambiarActivoEnLote(true)}
              disabled={procesandoLote}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1 text-sm text-emerald-700 hover:bg-[var(--color-bg-subtle)] disabled:opacity-50"
            >
              Activar
            </button>
            <button
              type="button"
              onClick={() => cambiarActivoEnLote(false)}
              disabled={procesandoLote}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-1 text-sm text-red-600 hover:bg-[var(--color-bg-subtle)] disabled:opacity-50"
            >
              Desactivar
            </button>
            {procesandoLote && <Spinner size={14} />}
            <button
              type="button"
              onClick={limpiarSeleccion}
              className="ml-auto flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              <X size={12} />
              Limpiar selección
            </button>
          </div>
        )}
      </CanAccess>

      <div className="mt-3 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]">
            <tr>
              <CanAccess resource="usuarios" action="edit">
                <th className="w-8 px-4 py-2">
                  <input
                    type="checkbox"
                    checked={todosSeleccionadosEnPagina}
                    onChange={alternarSeleccionTodos}
                    aria-label="Seleccionar todos"
                  />
                </th>
              </CanAccess>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Rol</th>
              {sucursales.length > 0 && <th className="px-4 py-2">Sucursal</th>}
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2">Creado</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {pageItems.map((usuario) => (
              <tr key={usuario.id} className="border-t border-[var(--color-border)]">
                <CanAccess resource="usuarios" action="edit">
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={seleccionados.has(usuario.id)}
                      onChange={() => alternarSeleccion(usuario.id)}
                      aria-label={`Seleccionar ${usuario.nombre}`}
                    />
                  </td>
                </CanAccess>
                <td className="px-4 py-2">
                  <Link
                    to={`/usuarios/${usuario.id}`}
                    className="flex items-center gap-2 text-[var(--color-primario-legible)] hover:underline"
                  >
                    <span className="relative shrink-0">
                      <Avatar nombre={usuario.nombre} fotoUrl={usuario.fotoUrl} size={28} />
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-[var(--color-bg-card)] ${
                          usuario.activo ? 'bg-emerald-500' : 'bg-[var(--color-text-faint)]'
                        }`}
                      />
                    </span>
                    {usuario.nombre}
                  </Link>
                </td>
                <td className="px-4 py-2">{usuario.email}</td>
                <td className="px-4 py-2">
                  {usuario.roles.length > 0 ? (
                    usuario.roles.map((r) => r.rol.nombre).join(', ')
                  ) : (
                    <span className="text-[var(--color-text-faint)]">Sin rol</span>
                  )}
                </td>
                {sucursales.length > 0 && (
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1.5">
                      <select
                        value={usuario.sucursal?.id ?? ''}
                        onChange={(e) => cambiarSucursal(usuario, e.target.value)}
                        disabled={cambiandoSucursalId === usuario.id}
                        className="rounded-lg border border-[var(--color-border)] px-2 py-1 text-xs focus:border-[var(--color-primario)] focus:outline-none disabled:opacity-50"
                      >
                        <option value="">Sin asignar</option>
                        {sucursales.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.nombre}
                          </option>
                        ))}
                      </select>
                      {cambiandoSucursalId === usuario.id && <Spinner size={12} />}
                    </div>
                  </td>
                )}
                <td className="px-4 py-2">
                  <div className="flex flex-wrap items-center gap-1">
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                        usuario.activo
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]'
                      }`}
                    >
                      {usuario.activo ? 'Activo' : 'Inactivo'}
                    </span>
                    {!usuario.passwordConfigurada && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                        Pendiente
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2">
                  {new Date(usuario.creadoEn).toLocaleDateString()}
                </td>
                <td className="px-4 py-2 text-right">
                  <CanAccess resource="usuarios" action="edit">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => abrirModal(usuario)}
                        className="text-xs text-[var(--color-primario-legible)] hover:underline"
                      >
                        Cambiar rol
                      </button>
                      {!usuario.passwordConfigurada && (
                        <button
                          type="button"
                          onClick={() => reenviarInvitacion(usuario)}
                          disabled={reenviandoId === usuario.id}
                          className="text-xs text-[var(--color-primario-legible)] hover:underline disabled:opacity-50"
                        >
                          {reenviandoId === usuario.id ? 'Enviando…' : 'Reenviar invitación'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => cambiarActivo(usuario)}
                        disabled={cambiandoActivoId === usuario.id}
                        className={`flex items-center gap-1 text-xs hover:underline disabled:opacity-50 ${
                          usuario.activo ? 'text-red-600' : 'text-emerald-600'
                        }`}
                      >
                        {cambiandoActivoId === usuario.id && <Spinner size={12} />}
                        {cambiandoActivoId === usuario.id
                          ? 'Actualizando…'
                          : usuario.activo
                            ? 'Desactivar'
                            : 'Activar'}
                      </button>
                    </div>
                  </CanAccess>
                </td>
              </tr>
            ))}
            {pageItems.length === 0 && (
              <tr>
                <td
                  colSpan={sucursales.length > 0 ? 8 : 7}
                  className="px-4 py-6 text-center text-[var(--color-text-faint)]"
                >
                  {tableQuery.isLoading ? (
                    <CargandoPantalla minHeight={80} />
                  ) : query || filtroRol || filtroEstado ? (
                    'Sin resultados para tu búsqueda'
                  ) : (
                    'Sin usuarios todavía'
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination
          pagina={pagina}
          totalPaginas={totalPaginas}
          onChange={setPagina}
          total={totalFiltrados}
        />
      </div>

      {modalUsuario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-lg bg-[var(--color-bg-card)] p-6 shadow-lg">
            <h2 className="text-base font-semibold text-[var(--color-text)]">
              Rol de {modalUsuario.nombre}
            </h2>

            <div className="mt-4 flex flex-col gap-2">
              {roles.length === 0 && (
                <p className="text-sm text-[var(--color-text-faint)]">
                  No hay roles creados todavía.
                </p>
              )}
              {roles.map((rol) => (
                <label key={rol.id} className="flex items-center gap-2 text-sm text-[var(--color-text)]">
                  <input
                    type="checkbox"
                    checked={rolesMarcados.has(rol.id)}
                    onChange={() => alternarRol(rol.id)}
                  />
                  {rol.nombre}
                </label>
              ))}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalUsuario(null)}
                className="rounded px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]"
              >
                Cancelar
              </button>
              <PrimaryButton
                type="button"
                onClick={guardarRoles}
                disabled={guardando}
                className="flex items-center gap-2"
              >
                {guardando && <Spinner size={14} />}
                {guardando ? 'Guardando…' : 'Guardar'}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
