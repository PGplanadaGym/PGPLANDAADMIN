/** Helpers para filtrar en vivo lo que se puede escribir en inputs de texto/número,
 * para que no se pueda ni siquiera teclear un valor inválido (en vez de solo avisar
 * después de guardar). */

/** Deja pasar solo dígitos — para códigos numéricos (ej. código SRI). */
export function soloDigitos(valor: string): string {
  return valor.replace(/[^0-9]/g, '')
}

/** Deja pasar dígitos, espacios, +, - y paréntesis — formato libre de teléfono
 * (ej. "099 321 0108", "+593 99 321 0108", "(02) 234-5678"). */
export function soloTelefono(valor: string): string {
  return valor.replace(/[^0-9+\-\s()]/g, '')
}

/** Quita espacios en los extremos y colapsa espacios repetidos — para nombres y textos
 * donde " Juan   Pérez " no debería registrarse distinto de "Juan Pérez". */
export function normalizarTexto(valor: string): string {
  return valor.replace(/\s+/g, ' ')
}

/** Deja pasar solo letras (con acentos/ñ), espacios, apóstrofes y guiones — para nombres
 * de persona (ej. "María José O'Brien-Pérez"). Sin números ni símbolos. */
export function soloLetras(valor: string): string {
  return valor.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ'\-\s]/g, '')
}

/** Quita espacios (nunca son válidos en un email) mientras se escribe. */
export function sinEspacios(valor: string): string {
  return valor.replace(/\s/g, '')
}
