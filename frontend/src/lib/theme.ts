/** Mezcla un color hex hacia blanco un `factor` (0 = igual, 1 = blanco puro). */
function aclararHex(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const mezclar = (c: number) => Math.round(c + (255 - c) * factor).toString(16).padStart(2, '0')
  return `#${mezclar(r)}${mezclar(g)}${mezclar(b)}`
}

export function aplicarColorPrimario(color?: string | null) {
  const valido = color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#0f172a'
  const raiz = document.documentElement.style
  raiz.setProperty('--color-primario', valido)
  // El color de marca puede ser cualquier tono que el cliente elija (a menudo oscuro,
  // pensado para texto blanco encima). Usado como texto sobre un fondo oscuro se
  // vuelve ilegible, así que en modo oscuro se usa una versión aclarada — ver el
  // token --color-primario-legible en index.css.
  raiz.setProperty('--color-primario-legible-light', valido)
  raiz.setProperty('--color-primario-legible-dark', aclararHex(valido, 0.6))
}

const TEMA_KEY = 'backoffice_tema'

export type Tema = 'light' | 'dark'

export function obtenerTemaGuardado(): Tema | null {
  const guardado = localStorage.getItem(TEMA_KEY)
  return guardado === 'light' || guardado === 'dark' ? guardado : null
}

export function obtenerTemaPreferido(): Tema {
  return (
    obtenerTemaGuardado() ??
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  )
}

export function aplicarTema(tema: Tema) {
  document.documentElement.classList.toggle('dark', tema === 'dark')
  localStorage.setItem(TEMA_KEY, tema)
}
