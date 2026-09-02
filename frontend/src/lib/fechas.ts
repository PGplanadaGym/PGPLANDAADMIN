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
