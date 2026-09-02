import { useState } from 'react'
import { toast } from 'sonner'
import { axiosInstance } from '../../lib/axios'
import { useModulos } from '../../providers/modulosContext'

export function ModulosPage() {
  const { modulos, loading, refetch } = useModulos()
  const [actualizando, setActualizando] = useState<string | null>(null)

  const toggle = async (clave: string, nombre: string, activo: boolean) => {
    setActualizando(clave)
    try {
      await axiosInstance.patch(`/modulos/${clave}`, { activo: !activo })
      await refetch()
      toast.success(`${nombre} ${!activo ? 'activado' : 'desactivado'}`)
    } catch {
      toast.error(`No se pudo actualizar "${nombre}"`)
    } finally {
      setActualizando(null)
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--color-text)]">Módulos</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Activa o desactiva los módulos disponibles para esta empresa. Los
        cambios se reflejan de inmediato en el menú, sin reiniciar nada.
      </p>

      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)] p-4">
        {loading && <p className="text-sm text-[var(--color-text-faint)]">Cargando…</p>}

        {!loading && modulos.length === 0 && (
          <p className="text-sm text-[var(--color-text-faint)]">No hay módulos en el catálogo.</p>
        )}

        {modulos.map((modulo) => (
          <div
            key={modulo.id}
            className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] py-3 last:border-b-0"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--color-text)]">{modulo.nombre}</p>
              {modulo.descripcion && (
                <p className="truncate text-xs text-[var(--color-text-muted)]">{modulo.descripcion}</p>
              )}
            </div>
            <button
              type="button"
              disabled={actualizando === modulo.clave}
              onClick={() => toggle(modulo.clave, modulo.nombre, modulo.activo)}
              className={`shrink-0 rounded px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
                modulo.activo
                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                  : 'bg-[var(--color-bg-muted)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)]'
              }`}
            >
              {modulo.activo ? 'Activo' : 'Inactivo'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
