import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useGetIdentity } from '@refinedev/core'
import { axiosInstance } from '../../lib/axios'
import { CargandoPantalla } from '../../components/ui/CargandoPantalla'
import { Spinner } from '../../components/ui/Spinner'
import { SearchInput } from '../../components/ui/SearchInput'
import { useConfirm } from '../../components/ui/ConfirmDialog'
import { mensajeError } from '../../lib/errores'
import type { Identity } from '../../lib/identity'

interface ModuloActivoResumen {
  clave: string
  nombre: string
  precioMensual: string | null
}

interface EmpresaResumen {
  id: string
  nombre: string
  razonSocial: string | null
  ruc: string | null
  email: string | null
  dominio: string | null
  creadoEn: string
  totalUsuarios: number
  modulosActivos: ModuloActivoResumen[]
  totalMensual: number
}

interface EntitlementModulo {
  id: string
  clave: string
  nombre: string
  descripcion: string | null
  habilitado: boolean
  activo: boolean
}

export function EmpresasAdminPage() {
  const { data: identity, isLoading: cargandoIdentity } = useGetIdentity<Identity>()
  const [empresas, setEmpresas] = useState<EmpresaResumen[]>([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  const [modalModulos, setModalModulos] = useState<EmpresaResumen | null>(null)
  const [entitlements, setEntitlements] = useState<EntitlementModulo[]>([])
  const [cargandoModal, setCargandoModal] = useState(false)
  const [guardandoClave, setGuardandoClave] = useState<string | null>(null)
  const [regenerandoId, setRegenerandoId] = useState<string | null>(null)
  const { confirmar, dialog: dialogConfirmar } = useConfirm()

  const cargarEmpresas = () =>
    axiosInstance.get<EmpresaResumen[]>('/empresas/resumen').then(({ data }) => setEmpresas(data))

  useEffect(() => {
    if (cargandoIdentity || !identity?.esSuperAdmin) return
    cargarEmpresas()
      .catch(() => toast.error('No se pudo cargar el listado de empresas'))
      .finally(() => setCargando(false))
  }, [cargandoIdentity, identity?.esSuperAdmin])

  const abrirModulos = (empresa: EmpresaResumen) => {
    setModalModulos(empresa)
    setCargandoModal(true)
    axiosInstance
      .get<EntitlementModulo[]>(`/empresas/${empresa.id}/modulos`)
      .then(({ data }) => setEntitlements(data))
      .catch(() => toast.error('No se pudieron cargar los módulos de esta empresa'))
      .finally(() => setCargandoModal(false))
  }

  const alternarHabilitado = async (modulo: EntitlementModulo) => {
    if (!modalModulos) return
    const nuevoHabilitado = !modulo.habilitado
    setGuardandoClave(modulo.clave)
    try {
      await axiosInstance.patch(`/empresas/${modalModulos.id}/modulos/${modulo.clave}`, {
        habilitado: nuevoHabilitado,
      })
      // revocar el permiso también desactiva el módulo del lado de la empresa
      setEntitlements((prev) =>
        prev.map((m) =>
          m.clave === modulo.clave
            ? { ...m, habilitado: nuevoHabilitado, activo: nuevoHabilitado ? m.activo : false }
            : m,
        ),
      )
      await cargarEmpresas()
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo actualizar el módulo'))
    } finally {
      setGuardandoClave(null)
    }
  }

  const copiarEnlace = async (empresa: EmpresaResumen) => {
    if (!empresa.dominio) {
      toast.error('Esta empresa todavía no tiene un enlace de login')
      return
    }
    const enlace = `${window.location.origin}/login/${empresa.dominio}`
    try {
      await navigator.clipboard.writeText(enlace)
      toast.success('Enlace copiado')
    } catch {
      toast.error('No se pudo copiar — cópialo manualmente: ' + enlace)
    }
  }

  const regenerarEnlace = async (empresa: EmpresaResumen) => {
    const confirmado = await confirmar(
      `¿Regenerar el enlace de ${empresa.nombre}?`,
      'El enlace de login anterior deja de funcionar de inmediato. Tendrás que compartir el nuevo con la empresa.',
      'Regenerar',
    )
    if (!confirmado) return

    setRegenerandoId(empresa.id)
    try {
      await axiosInstance.post(`/empresas/${empresa.id}/regenerar-login`)
      toast.success('Enlace regenerado')
      await cargarEmpresas()
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo regenerar el enlace'))
    } finally {
      setRegenerandoId(null)
    }
  }

  const filtradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    if (!texto) return empresas
    return empresas.filter((e) =>
      [e.nombre, e.razonSocial ?? '', e.ruc ?? '', e.email ?? '', e.dominio ?? '']
        .join(' ')
        .toLowerCase()
        .includes(texto),
    )
  }, [empresas, busqueda])

  const totalGeneral = useMemo(
    () => empresas.reduce((acc, e) => acc + e.totalMensual, 0),
    [empresas],
  )

  if (cargandoIdentity) {
    return <CargandoPantalla minHeight={300} />
  }

  if (!identity?.esSuperAdmin) {
    return (
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text)]">Empresas (plataforma)</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Esta sección es solo para el administrador de la plataforma.
        </p>
      </div>
    )
  }

  return (
    <div>
      {dialogConfirmar}
      <h1 className="text-xl font-bold text-[var(--color-text)]">Empresas (plataforma)</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Vista de solo lectura de todos tus clientes: qué módulos tiene activos cada uno y cuánto
        sumaría cobrarles según el precio de esos módulos.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <SearchInput value={busqueda} onChange={setBusqueda} placeholder="Buscar por nombre, RUC o dominio…" />
        <p className="ml-auto text-sm text-[var(--color-text-muted)]">
          Total mensual de todos los clientes:{' '}
          <span className="font-semibold text-[var(--color-text)]">${totalGeneral.toFixed(2)}</span>
        </p>
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-2">Empresa</th>
              <th className="px-4 py-2">RUC</th>
              <th className="px-4 py-2">Usuarios</th>
              <th className="px-4 py-2">Módulos activos</th>
              <th className="px-4 py-2">Mensual</th>
              <th className="px-4 py-2">Cliente desde</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {filtradas.map((empresa) => (
              <tr key={empresa.id} className="border-t border-[var(--color-border)] align-top">
                <td className="px-4 py-2">
                  <p className="font-medium text-[var(--color-text)]">{empresa.nombre}</p>
                  {empresa.razonSocial && (
                    <p className="text-xs text-[var(--color-text-faint)]">{empresa.razonSocial}</p>
                  )}
                  {empresa.email && (
                    <p className="text-xs text-[var(--color-text-faint)]">{empresa.email}</p>
                  )}
                </td>
                <td className="px-4 py-2 text-[var(--color-text-muted)]">{empresa.ruc ?? '—'}</td>
                <td className="px-4 py-2 text-[var(--color-text-muted)]">{empresa.totalUsuarios}</td>
                <td className="px-4 py-2">
                  {empresa.modulosActivos.length === 0 ? (
                    <span className="text-[var(--color-text-faint)]">Ninguno</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {empresa.modulosActivos.map((m) => (
                        <span
                          key={m.clave}
                          className="rounded bg-[var(--color-bg-muted)] px-1.5 py-0.5 text-xs text-[var(--color-text-muted)]"
                        >
                          {m.nombre}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-2 font-medium text-[var(--color-text)]">
                  ${empresa.totalMensual.toFixed(2)}
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-[var(--color-text-muted)]">
                  {new Date(empresa.creadoEn).toLocaleDateString()}
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="flex flex-wrap justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => abrirModulos(empresa)}
                      className="rounded-lg border border-[var(--color-border)] px-2.5 py-1 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]"
                    >
                      Gestionar módulos
                    </button>
                    <button
                      type="button"
                      onClick={() => copiarEnlace(empresa)}
                      className="rounded-lg border border-[var(--color-border)] px-2.5 py-1 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]"
                    >
                      Copiar enlace de login
                    </button>
                    <button
                      type="button"
                      onClick={() => regenerarEnlace(empresa)}
                      disabled={regenerandoId === empresa.id}
                      className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-2.5 py-1 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-50"
                    >
                      {regenerandoId === empresa.id && <Spinner size={12} />}
                      Regenerar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!cargando && filtradas.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-[var(--color-text-faint)]">
                  {busqueda ? 'Sin resultados para tu búsqueda' : 'No hay empresas todavía'}
                </td>
              </tr>
            )}
            {cargando && (
              <tr>
                <td colSpan={7} className="px-4 py-6">
                  <CargandoPantalla minHeight={80} />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalModulos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-[var(--color-bg-card)] p-5 shadow-lg">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">
              Módulos habilitados — {modalModulos.nombre}
            </h2>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Solo los módulos habilitados aquí aparecen para que esta empresa los active.
            </p>

            <div className="mt-3 max-h-80 overflow-y-auto">
              {cargandoModal ? (
                <CargandoPantalla minHeight={120} />
              ) : (
                <div className="flex flex-col gap-1">
                  {entitlements.map((modulo) => (
                    <label
                      key={modulo.clave}
                      className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-[var(--color-bg-subtle)]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-[var(--color-text)]">{modulo.nombre}</p>
                        {modulo.activo && (
                          <p className="text-xs text-emerald-600">Activo actualmente</p>
                        )}
                      </div>
                      {guardandoClave === modulo.clave ? (
                        <Spinner size={16} />
                      ) : (
                        <input
                          type="checkbox"
                          checked={modulo.habilitado}
                          onChange={() => alternarHabilitado(modulo)}
                          className="h-4 w-4 shrink-0"
                        />
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setModalModulos(null)}
                className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
