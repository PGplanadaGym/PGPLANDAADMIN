import { useCallback, useState } from 'react'

interface ConfirmState {
  titulo: string
  mensaje: string
  textoConfirmar: string
  resolver: (confirmado: boolean) => void
}

export function useConfirm() {
  const [estado, setEstado] = useState<ConfirmState | null>(null)

  const confirmar = useCallback(
    (titulo: string, mensaje: string, textoConfirmar = 'Eliminar') => {
      return new Promise<boolean>((resolve) => {
        setEstado({ titulo, mensaje, textoConfirmar, resolver: resolve })
      })
    },
    [],
  )

  const dialog = estado ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-lg bg-[var(--color-bg-card)] p-6 shadow-lg">
        <h2 className="text-base font-semibold text-[var(--color-text)]">{estado.titulo}</h2>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">{estado.mensaje}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              estado.resolver(false)
              setEstado(null)
            }}
            className="rounded px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              estado.resolver(true)
              setEstado(null)
            }}
            className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
          >
            {estado.textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  ) : null

  return { confirmar, dialog }
}
