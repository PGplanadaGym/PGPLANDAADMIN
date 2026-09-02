import { CanAccess, useTable } from '@refinedev/core'
import { useNavigate } from 'react-router-dom'
import { useBusquedaPaginada } from '../../hooks/useBusquedaPaginada'
import { SearchInput } from '../../components/ui/SearchInput'
import { Pagination } from '../../components/ui/Pagination'
import { PrimaryLinkButton } from '../../components/ui/PrimaryButton'
import { ExportarCSVButton } from '../../components/ui/ExportarCSVButton'

interface Cliente {
  id: string
  nombre: string
  email: string | null
  telefono: string | null
  creadoEn: string
}

export function ClientesListPage() {
  const navigate = useNavigate()
  const { tableQuery } = useTable<Cliente>({ resource: 'clientes' })
  const clientes = tableQuery.data?.data ?? []

  const {
    query,
    setQuery,
    pageItems,
    filtrados,
    pagina,
    setPagina,
    totalPaginas,
    totalFiltrados,
  } = useBusquedaPaginada(clientes, (c) => `${c.nombre} ${c.email ?? ''}`)

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-[var(--color-text)]">Clientes</h1>
        <div className="flex flex-wrap items-center gap-2">
          <ExportarCSVButton nombreArchivo="clientes.csv" filas={filtrados} />
          <CanAccess resource="clientes" action="create">
            <PrimaryLinkButton to="/clientes/nuevo">Nuevo cliente</PrimaryLinkButton>
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
              <th className="px-4 py-2">Teléfono</th>
              <th className="px-4 py-2">Creado</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((cliente) => (
              <tr
                key={cliente.id}
                onClick={() => navigate(`/clientes/${cliente.id}`)}
                className="cursor-pointer border-t border-[var(--color-border)] hover:bg-[var(--color-bg-hover)]"
              >
                <td className="px-4 py-2">{cliente.nombre}</td>
                <td className="px-4 py-2">{cliente.email ?? '—'}</td>
                <td className="px-4 py-2">{cliente.telefono ?? '—'}</td>
                <td className="px-4 py-2">
                  {new Date(cliente.creadoEn).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {pageItems.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-[var(--color-text-faint)]">
                  {tableQuery.isLoading
                    ? 'Cargando…'
                    : query
                      ? 'Sin resultados para tu búsqueda'
                      : 'Sin clientes todavía'}
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
    </div>
  )
}
