import { useMemo, useState } from 'react'

export function useBusquedaPaginada<T>(
  items: T[],
  extraerTexto: (item: T) => string,
  pageSize = 10,
) {
  const [query, setQuery] = useState('')
  const [pagina, setPagina] = useState(1)

  const filtrados = useMemo(() => {
    const texto = query.trim().toLowerCase()
    if (!texto) return items
    return items.filter((item) => extraerTexto(item).toLowerCase().includes(texto))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, query])

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / pageSize))
  const paginaSegura = Math.min(pagina, totalPaginas)

  const pageItems = useMemo(
    () => filtrados.slice((paginaSegura - 1) * pageSize, paginaSegura * pageSize),
    [filtrados, paginaSegura, pageSize],
  )

  return {
    query,
    setQuery: (valor: string) => {
      setQuery(valor)
      setPagina(1)
    },
    pageItems,
    filtrados,
    pagina: paginaSegura,
    setPagina,
    totalPaginas,
    totalFiltrados: filtrados.length,
  }
}
