import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useGetIdentity } from '@refinedev/core'
import { axiosInstance } from '../../lib/axios'
import { CargandoPantalla } from '../../components/ui/CargandoPantalla'
import { SearchInput } from '../../components/ui/SearchInput'
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

export function EmpresasAdminPage() {
  const { data: identity, isLoading: cargandoIdentity } = useGetIdentity<Identity>()
  const [empresas, setEmpresas] = useState<EmpresaResumen[]>([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    if (cargandoIdentity || !identity?.esSuperAdmin) return
    axiosInstance
      .get<EmpresaResumen[]>('/empresas/resumen')
      .then(({ data }) => setEmpresas(data))
      .catch(() => toast.error('No se pudo cargar el listado de empresas'))
      .finally(() => setCargando(false))
  }, [cargandoIdentity, identity?.esSuperAdmin])

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
              </tr>
            ))}
            {!cargando && filtradas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-[var(--color-text-faint)]">
                  {busqueda ? 'Sin resultados para tu búsqueda' : 'No hay empresas todavía'}
                </td>
              </tr>
            )}
            {cargando && (
              <tr>
                <td colSpan={6} className="px-4 py-6">
                  <CargandoPantalla minHeight={80} />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
