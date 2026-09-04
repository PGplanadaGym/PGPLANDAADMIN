export interface FortalezaPassword {
  score: 1 | 2 | 3 | 4
  etiqueta: string
  color: string
}

function contarCriterios(password: string) {
  let n = 0
  if (password.length >= 8) n++
  if (password.length >= 12) n++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) n++
  if (/\d/.test(password)) n++
  if (/[^a-zA-Z0-9]/.test(password)) n++
  return n
}

export function evaluarFortaleza(password: string): FortalezaPassword | null {
  if (!password) return null

  const criterios = contarCriterios(password)
  if (criterios <= 1) return { score: 1, etiqueta: 'Muy débil', color: '#dc2626' }
  if (criterios === 2) return { score: 2, etiqueta: 'Débil', color: '#f59e0b' }
  if (criterios <= 4) return { score: 3, etiqueta: 'Media', color: '#eab308' }
  return { score: 4, etiqueta: 'Fuerte', color: '#16a34a' }
}
