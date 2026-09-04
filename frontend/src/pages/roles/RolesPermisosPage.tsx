import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { axiosInstance } from '../../lib/axios'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { Spinner } from '../../components/ui/Spinner'
import { CargandoPantalla } from '../../components/ui/CargandoPantalla'

interface Permiso {
  id: string
  clave: string
  etiqueta: string
}

interface Rol {
  id: string
  empresaId: string | null
  nombre: string
  descripcion: string | null
  permisos: { permiso: Permiso }[]
}

function grupoDe(clave: string) {
  return clave.split('.')[0]
}

export function RolesPermisosPage() {
  const [roles, setRoles] = useState<Rol[]>([])
  const [permisos, setPermisos] = useState<Permiso[]>([])
  const [cargando, setCargando] = useState(true)

  const [rolSeleccionadoId, setRolSeleccionadoId] = useState<string | null>(null)
  const [permisosMarcados, setPermisosMarcados] = useState<Set<string>>(new Set())
  const [guardando, setGuardando] = useState(false)

  const [nombreNuevoRol, setNombreNuevoRol] = useState('')
  const [descripcionNuevoRol, setDescripcionNuevoRol] = useState('')
  const [creandoRol, setCreandoRol] = useState(false)

  const cargar = async () => {
    setCargando(true)
    try {
      const [r, p] = await Promise.all([
        axiosInstance.get<Rol[]>('/roles'),
        axiosInstance.get<Permiso[]>('/permisos'),
      ])
      setRoles(r.data.filter((rol) => rol.empresaId !== null))
      setPermisos(p.data)
    } catch {
      toast.error('No se pudieron cargar los roles y permisos')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  const rolSeleccionado = roles.find((r) => r.id === rolSeleccionadoId) ?? null

  const seleccionarRol = (rol: Rol) => {
    setRolSeleccionadoId(rol.id)
    setPermisosMarcados(new Set(rol.permisos.map((p) => p.permiso.id)))
  }

  const gruposPermisos = useMemo(() => {
    const grupos = new Map<string, Permiso[]>()
    for (const permiso of permisos) {
      const grupo = grupoDe(permiso.clave)
      if (!grupos.has(grupo)) grupos.set(grupo, [])
      grupos.get(grupo)!.push(permiso)
    }
    return [...grupos.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [permisos])

  const alternarPermiso = (permisoId: string) => {
    setPermisosMarcados((prev) => {
      const nuevo = new Set(prev)
      if (nuevo.has(permisoId)) nuevo.delete(permisoId)
      else nuevo.add(permisoId)
      return nuevo
    })
  }

  const alternarGrupo = (permisosDelGrupo: Permiso[], marcarTodos: boolean) => {
    setPermisosMarcados((prev) => {
      const nuevo = new Set(prev)
      for (const permiso of permisosDelGrupo) {
        if (marcarTodos) nuevo.add(permiso.id)
        else nuevo.delete(permiso.id)
      }
      return nuevo
    })
  }

  const guardarPermisos = async () => {
    if (!rolSeleccionado) return
    setGuardando(true)
    try {
      await axiosInstance.patch(`/roles/${rolSeleccionado.id}/permisos`, {
        permisoIds: [...permisosMarcados],
      })
      toast.success('Permisos actualizados')
      await cargar()
    } catch {
      toast.error('No se pudieron guardar los permisos')
    } finally {
      setGuardando(false)
    }
  }

  const crearRol = async () => {
    if (!nombreNuevoRol.trim()) return
    setCreandoRol(true)
    try {
      await axiosInstance.post('/roles', {
        nombre: nombreNuevoRol,
        descripcion: descripcionNuevoRol || undefined,
      })
      setNombreNuevoRol('')
      setDescripcionNuevoRol('')
      toast.success('Rol creado')
      await cargar()
    } catch {
      toast.error('No se pudo crear el rol')
    } finally {
      setCreandoRol(false)
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--color-text)]">Roles y permisos</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Crea roles y define qué puede ver o hacer cada uno. Luego asigna un rol a cada colaborador
        desde la página de Usuarios.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)] p-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
            Nuevo rol
          </label>
          <input
            value={nombreNuevoRol}
            onChange={(e) => setNombreNuevoRol(e.target.value)}
            placeholder="Ej: Recepcionista"
            className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
            Descripción (opcional)
          </label>
          <input
            value={descripcionNuevoRol}
            onChange={(e) => setDescripcionNuevoRol(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={crearRol}
          disabled={creandoRol || !nombreNuevoRol.trim()}
          className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg)] disabled:opacity-50"
        >
          {creandoRol ? 'Creando…' : 'Crear rol'}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr]">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)] p-2">
          {cargando && <CargandoPantalla minHeight={80} />}
          {!cargando && roles.length === 0 && (
            <p className="p-2 text-sm text-[var(--color-text-faint)]">Sin roles todavía</p>
          )}
          {roles.map((rol) => (
            <button
              key={rol.id}
              type="button"
              onClick={() => seleccionarRol(rol)}
              className={`block w-full rounded px-3 py-2 text-left text-sm ${
                rolSeleccionadoId === rol.id
                  ? 'bg-[var(--color-primario)] text-white'
                  : 'text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]'
              }`}
            >
              {rol.nombre}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)] p-4">
          {!rolSeleccionado && (
            <p className="text-sm text-[var(--color-text-faint)]">
              Selecciona un rol de la izquierda para ver y editar sus permisos.
            </p>
          )}

          {rolSeleccionado && (
            <>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold text-[var(--color-text)]">
                    {rolSeleccionado.nombre}
                  </h2>
                  {rolSeleccionado.descripcion && (
                    <p className="text-sm text-[var(--color-text-muted)]">
                      {rolSeleccionado.descripcion}
                    </p>
                  )}
                </div>
                <PrimaryButton
                  type="button"
                  onClick={guardarPermisos}
                  disabled={guardando}
                  className="flex items-center gap-2"
                >
                  {guardando && <Spinner size={14} />}
                  {guardando ? 'Guardando…' : 'Guardar cambios'}
                </PrimaryButton>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {gruposPermisos.map(([grupo, permisosDelGrupo]) => {
                  const todosMarcados = permisosDelGrupo.every((p) => permisosMarcados.has(p.id))
                  return (
                    <div
                      key={grupo}
                      className="rounded-lg border border-[var(--color-border)] p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold capitalize text-[var(--color-text)]">
                          {grupo.replace('-', ' ')}
                        </span>
                        <button
                          type="button"
                          onClick={() => alternarGrupo(permisosDelGrupo, !todosMarcados)}
                          className="text-xs text-[var(--color-primario-legible)] hover:underline"
                        >
                          {todosMarcados ? 'Ninguno' : 'Todos'}
                        </button>
                      </div>
                      <div className="mt-2 flex flex-col gap-1.5">
                        {permisosDelGrupo.map((permiso) => (
                          <label
                            key={permiso.id}
                            className="flex items-center gap-2 text-sm text-[var(--color-text)]"
                          >
                            <input
                              type="checkbox"
                              checked={permisosMarcados.has(permiso.id)}
                              onChange={() => alternarPermiso(permiso.id)}
                            />
                            {permiso.etiqueta}
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
