import type { SucursalBasica } from '../../hooks/useSucursalActiva'

interface Props {
  sucursales: SucursalBasica[]
  value: string
  onChange: (id: string) => void
}

/** Selector de "sucursal activa" — filtra la lista y queda como valor por defecto al crear. */
export function SucursalActivaSelector({ sucursales, value, onChange }: Props) {
  if (sucursales.length < 2) return null

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      title="Sucursal activa: filtra esta lista y queda como valor por defecto al crear"
      className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm focus:border-[var(--color-primario)] focus:outline-none"
    >
      <option value="">Todas las sucursales</option>
      {sucursales.map((s) => (
        <option key={s.id} value={s.id}>
          {s.nombre}
        </option>
      ))}
    </select>
  )
}
