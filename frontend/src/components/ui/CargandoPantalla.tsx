import { Spinner } from './Spinner'

interface Props {
  mensaje?: string
  minHeight?: number
}

/** Estado de carga visible: spinner grande en el color de marca de la empresa (--color-primario),
 * centrado en el espacio disponible. Para esperas cortas e inline usa <Spinner /> directo. */
export function CargandoPantalla({ mensaje = 'Cargando…', minHeight = 240 }: Props) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 text-[var(--color-primario)]"
      style={{ minHeight }}
    >
      <Spinner size={40} />
      <p className="text-sm font-medium text-[var(--color-text-muted)]">{mensaje}</p>
    </div>
  )
}
