export type EstadoMembresia = 'activo' | 'por_vencer' | 'vencido' | 'sin_membresia'

export const ESTADO_MEMBRESIA_LABEL: Record<EstadoMembresia, string> = {
  activo: 'Activo',
  por_vencer: 'Por vencer',
  vencido: 'Vencido',
  sin_membresia: 'Sin membresía',
}

export const ESTADO_MEMBRESIA_COLOR: Record<EstadoMembresia, string> = {
  activo: 'bg-emerald-100 text-emerald-700',
  por_vencer: 'bg-amber-100 text-amber-700',
  vencido: 'bg-red-100 text-red-700',
  sin_membresia: 'bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]',
}

interface Props {
  estado: EstadoMembresia
  className?: string
}

export function EstadoMembresiaBadge({ estado, className = '' }: Props) {
  return (
    <span
      className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${ESTADO_MEMBRESIA_COLOR[estado]} ${className}`}
    >
      {ESTADO_MEMBRESIA_LABEL[estado]}
    </span>
  )
}
