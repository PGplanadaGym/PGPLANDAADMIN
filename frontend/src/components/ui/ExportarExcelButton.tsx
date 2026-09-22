interface Props<T extends object> {
  nombreArchivo: string
  filas: T[]
}

export function ExportarExcelButton<T extends object>({ nombreArchivo, filas }: Props<T>) {
  const exportar = async () => {
    const { exportarExcel } = await import('../../lib/excel')
    await exportarExcel(nombreArchivo, filas as Record<string, unknown>[])
  }

  return (
    <button
      type="button"
      onClick={exportar}
      disabled={filas.length === 0}
      className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-40"
    >
      Exportar Excel
    </button>
  )
}
