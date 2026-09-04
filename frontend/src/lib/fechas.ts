/**
 * `new Date('YYYY-MM-DD')` se interpreta como medianoche UTC, no medianoche local —
 * en Ecuador (UTC-5) eso cae en la tarde/noche del día ANTERIOR, así que una fecha
 * escrita en un <input type="date"> se guardaba o filtraba corrida un día.
 * Estas funciones arman la fecha a partir de sus componentes (año/mes/día), que
 * el motor de JS interpreta en la zona horaria local del navegador.
 */

function partes(fechaYMD: string): [number, number, number] {
  const [y, m, d] = fechaYMD.split('-').map(Number)
  return [y, m - 1, d]
}

/** Inicio (00:00:00.000) de ese día en hora local, como ISO string. */
export function inicioDiaLocalISO(fechaYMD: string): string {
  const [y, m, d] = partes(fechaYMD)
  return new Date(y, m, d, 0, 0, 0, 0).toISOString()
}

/** Fin (23:59:59.999) de ese día en hora local, como ISO string — útil como límite
 * superior inclusivo de un filtro de rango de fechas. */
export function finDiaLocalISO(fechaYMD: string): string {
  const [y, m, d] = partes(fechaYMD)
  return new Date(y, m, d, 23, 59, 59, 999).toISOString()
}

/** "hace 5 min", "ayer", "hace 3 d"… y una fecha corta para lo más viejo que una semana. */
export function tiempoRelativo(fechaISO: string): string {
  const diffSeg = Math.round((Date.now() - new Date(fechaISO).getTime()) / 1000)

  if (diffSeg < 60) return 'hace un momento'
  const diffMin = Math.round(diffSeg / 60)
  if (diffMin < 60) return `hace ${diffMin} min`
  const diffHoras = Math.round(diffMin / 60)
  if (diffHoras < 24) return `hace ${diffHoras} h`
  const diffDias = Math.round(diffHoras / 24)
  if (diffDias === 1) return 'ayer'
  if (diffDias < 7) return `hace ${diffDias} d`

  return new Date(fechaISO).toLocaleDateString('es', { day: 'numeric', month: 'short' })
}
