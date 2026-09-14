import { useEffect, useMemo, useRef, useState } from 'react'

export interface ClienteOpcion {
  id: string
  nombre: string
  email?: string | null
  telefono?: string | null
}

interface Props {
  clientes: ClienteOpcion[]
  value: string
  onChange: (id: string) => void
  placeholder?: string
  opcionSinCliente?: string
}

const LIMITE_RESULTADOS = 50

export function SelectorCliente({
  clientes,
  value,
  onChange,
  placeholder = 'Buscar cliente por nombre o email…',
  opcionSinCliente,
}: Props) {
  const [query, setQuery] = useState('')
  const [abierto, setAbierto] = useState(false)
  const contenedorRef = useRef<HTMLDivElement>(null)

  const seleccionado = clientes.find((c) => c.id === value) ?? null

  useEffect(() => {
    function alHacerClicFuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false)
      }
    }
    document.addEventListener('mousedown', alHacerClicFuera)
    return () => document.removeEventListener('mousedown', alHacerClicFuera)
  }, [])

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase()
    const lista = !q
      ? clientes
      : clientes.filter(
          (c) =>
            c.nombre.toLowerCase().includes(q) ||
            c.email?.toLowerCase().includes(q) ||
            c.telefono?.toLowerCase().includes(q),
        )
    return lista.slice(0, LIMITE_RESULTADOS)
  }, [clientes, query])

  return (
    <div ref={contenedorRef} className="relative">
      <input
        type="text"
        value={abierto ? query : (seleccionado?.nombre ?? '')}
        onChange={(e) => {
          setQuery(e.target.value)
          setAbierto(true)
        }}
        onFocus={() => {
          setQuery('')
          setAbierto(true)
        }}
        placeholder={seleccionado ? seleccionado.nombre : placeholder}
        className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
      />
      {abierto && (
        <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-md)]">
          {opcionSinCliente && (
            <button
              type="button"
              onClick={() => {
                onChange('')
                setQuery('')
                setAbierto(false)
              }}
              className="block w-full px-3 py-2 text-left text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)]"
            >
              {opcionSinCliente}
            </button>
          )}
          {filtrados.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                onChange(c.id)
                setQuery('')
                setAbierto(false)
              }}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-bg-subtle)]"
            >
              <span className="text-[var(--color-text)]">{c.nombre}</span>
              {c.email && (
                <span className="ml-1.5 text-xs text-[var(--color-text-faint)]">{c.email}</span>
              )}
            </button>
          ))}
          {filtrados.length === 0 && (
            <p className="px-3 py-2 text-sm text-[var(--color-text-faint)]">Sin resultados</p>
          )}
        </div>
      )}
    </div>
  )
}
