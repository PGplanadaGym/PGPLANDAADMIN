import { exportarCSV } from '../../lib/csv'

interface Props<T extends object> {
  nombreArchivo: string
  filas: T[]
}

export function ExportarCSVButton<T extends object>({ nombreArchivo, filas }: Props<T>) {
  return (
    <button
      type="button"
      onClick={() => exportarCSV(nombreArchivo, filas as Record<string, unknown>[])}
      disabled={filas.length === 0}
      className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-40"
    >
      Exportar CSV
    </button>
  )
}
