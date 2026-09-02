import { useEffect, useState } from 'react'
import { CanAccess, useTable } from '@refinedev/core'
import { toast } from 'sonner'
import { axiosInstance } from '../../lib/axios'
import { useBusquedaPaginada } from '../../hooks/useBusquedaPaginada'
import { SearchInput } from '../../components/ui/SearchInput'
import { Pagination } from '../../components/ui/Pagination'
import { PrimaryButton, PrimaryLinkButton } from '../../components/ui/PrimaryButton'
import { ExportarCSVButton } from '../../components/ui/ExportarCSVButton'
import { Spinner } from '../../components/ui/Spinner'

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
  activo: boolean
  creadoEn: string
  roles: { rol: Rol }[]
  sucursal: Sucursal | null
}

export function UsuariosListPage() {
  const { tableQuery } = useTable<Usuario>({ resource: 'usuarios' })
  const usuarios = tableQuery.data?.data ?? []

  const [roles, setRoles] = useState<Rol[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [modalUsuario, setModalUsuario] = useState<Usuario | null>(null)
  const [rolesMarcados, setRolesMarcados] = useState<Set<string>>(new Set())
  const [guardando, setGuardando] = useState(false)

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
    try {
      await axiosInstance.patch(`/usuarios/${usuario.id}/sucursal`, {
        sucursalId: sucursalId || null,
      })
      toast.success('Sucursal actualizada')
      await tableQuery.refetch()
    } catch {
      toast.error('No se pudo actualizar la sucursal')
    }
  }

  const {
    query,
    setQuery,
    pageItems,
    filtrados,
    pagina,
    setPagina,
    totalPaginas,
    totalFiltrados,
  } = useBusquedaPaginada(usuarios, (u) => `${u.nombre} ${u.email}`)

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

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-[var(--color-text)]">Usuarios</h1>
        <div className="flex flex-wrap items-center gap-2">
          <ExportarCSVButton nombreArchivo="usuarios.csv" filas={filtrados} />
          <CanAccess resource="usuarios" action="create">
            <PrimaryLinkButton to="/usuarios/nuevo">Invitar usuario</PrimaryLinkButton>
          </CanAccess>
        </div>
      </div>

      <div className="mt-4">
        <SearchInput value={query} onChange={setQuery} placeholder="Buscar por nombre o email…" />
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Rol</th>
              {sucursales.length > 0 && <th className="px-4 py-2">Sucursal</th>}
              <th className="px-4 py-2">Activo</th>
              <th className="px-4 py-2">Creado</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {pageItems.map((usuario) => (
              <tr key={usuario.id} className="border-t border-[var(--color-border)]">
                <td className="px-4 py-2">{usuario.nombre}</td>
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
                    <select
                      value={usuario.sucursal?.id ?? ''}
                      onChange={(e) => cambiarSucursal(usuario, e.target.value)}
                      className="rounded-lg border border-[var(--color-border)] px-2 py-1 text-xs focus:border-[var(--color-primario)] focus:outline-none"
                    >
                      <option value="">Sin asignar</option>
                      {sucursales.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nombre}
                        </option>
                      ))}
                    </select>
                  </td>
                )}
                <td className="px-4 py-2">{usuario.activo ? 'Sí' : 'No'}</td>
                <td className="px-4 py-2">
                  {new Date(usuario.creadoEn).toLocaleDateString()}
                </td>
                <td className="px-4 py-2 text-right">
                  <CanAccess resource="usuarios" action="edit">
                    <button
                      type="button"
                      onClick={() => abrirModal(usuario)}
                      className="text-xs text-[var(--color-primario-legible)] hover:underline"
                    >
                      Cambiar rol
                    </button>
                  </CanAccess>
                </td>
              </tr>
            ))}
            {pageItems.length === 0 && (
              <tr>
                <td
                  colSpan={sucursales.length > 0 ? 7 : 6}
                  className="px-4 py-6 text-center text-[var(--color-text-faint)]"
                >
                  {tableQuery.isLoading
                    ? 'Cargando…'
                    : query
                      ? 'Sin resultados para tu búsqueda'
                      : 'Sin usuarios todavía'}
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
          <div className="w-full max-w-sm rounded-lg bg-[var(--color-bg-card)] p-6 shadow-lg">
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
