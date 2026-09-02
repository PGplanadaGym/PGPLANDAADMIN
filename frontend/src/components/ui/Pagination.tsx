interface Props {
  pagina: number
  totalPaginas: number
  onChange: (pagina: number) => void
  total: number
}

export function Pagination({ pagina, totalPaginas, onChange, total }: Props) {
  if (totalPaginas <= 1) return null

  return (
    <div className="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-2 text-xs text-[var(--color-text-muted)]">
      <span>{total} resultado{total === 1 ? '' : 's'}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={pagina <= 1}
          onClick={() => onChange(pagina - 1)}
          className="rounded px-2 py-1 hover:bg-[var(--color-bg)] disabled:opacity-30"
        >
          Anterior
        </button>
        <span>
          Página {pagina} de {totalPaginas}
        </span>
        <button
          type="button"
          disabled={pagina >= totalPaginas}
          onClick={() => onChange(pagina + 1)}
          className="rounded px-2 py-1 hover:bg-[var(--color-bg)] disabled:opacity-30"
        >
          Siguiente
        </button>
      </div>
    </div>
  )
}
