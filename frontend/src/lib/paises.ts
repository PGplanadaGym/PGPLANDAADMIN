export interface Pais {
  iso: string
  nombre: string
  codigo: string
}

/** Enfocada en Latinoamérica (mercado principal de la app) + los países más comunes fuera de la región. */
export const PAISES: Pais[] = [
  { iso: 'EC', nombre: 'Ecuador', codigo: '+593' },
  { iso: 'PE', nombre: 'Perú', codigo: '+51' },
  { iso: 'CO', nombre: 'Colombia', codigo: '+57' },
  { iso: 'MX', nombre: 'México', codigo: '+52' },
  { iso: 'AR', nombre: 'Argentina', codigo: '+54' },
  { iso: 'CL', nombre: 'Chile', codigo: '+56' },
  { iso: 'BO', nombre: 'Bolivia', codigo: '+591' },
  { iso: 'PY', nombre: 'Paraguay', codigo: '+595' },
  { iso: 'UY', nombre: 'Uruguay', codigo: '+598' },
  { iso: 'VE', nombre: 'Venezuela', codigo: '+58' },
  { iso: 'BR', nombre: 'Brasil', codigo: '+55' },
  { iso: 'PA', nombre: 'Panamá', codigo: '+507' },
  { iso: 'CR', nombre: 'Costa Rica', codigo: '+506' },
  { iso: 'NI', nombre: 'Nicaragua', codigo: '+505' },
  { iso: 'HN', nombre: 'Honduras', codigo: '+504' },
  { iso: 'SV', nombre: 'El Salvador', codigo: '+503' },
  { iso: 'GT', nombre: 'Guatemala', codigo: '+502' },
  { iso: 'DO', nombre: 'República Dominicana', codigo: '+1' },
  { iso: 'PR', nombre: 'Puerto Rico', codigo: '+1' },
  { iso: 'CU', nombre: 'Cuba', codigo: '+53' },
  { iso: 'US', nombre: 'Estados Unidos', codigo: '+1' },
  { iso: 'CA', nombre: 'Canadá', codigo: '+1' },
  { iso: 'ES', nombre: 'España', codigo: '+34' },
  { iso: 'GB', nombre: 'Reino Unido', codigo: '+44' },
  { iso: 'FR', nombre: 'Francia', codigo: '+33' },
  { iso: 'DE', nombre: 'Alemania', codigo: '+49' },
  { iso: 'IT', nombre: 'Italia', codigo: '+39' },
  { iso: 'PT', nombre: 'Portugal', codigo: '+351' },
  { iso: 'CN', nombre: 'China', codigo: '+86' },
  { iso: 'JP', nombre: 'Japón', codigo: '+81' },
  { iso: 'IN', nombre: 'India', codigo: '+91' },
  { iso: 'AU', nombre: 'Australia', codigo: '+61' },
]

const ISO_POR_DEFECTO = 'EC'

export function banderaDesdeIso(iso: string): string {
  return [...iso.toUpperCase()]
    .map((letra) => String.fromCodePoint(0x1f1e6 + (letra.charCodeAt(0) - 65)))
    .join('')
}

/** Separa un teléfono guardado como "+593 987654321" en { iso, numero }. Si no hay código
 * reconocido (o el campo está vacío), asume el país por defecto y deja el resto como número. */
export function separarTelefono(telefono: string | null | undefined): {
  iso: string
  numero: string
} {
  const valor = (telefono ?? '').trim()
  if (!valor) return { iso: ISO_POR_DEFECTO, numero: '' }

  const match = valor.match(/^(\+\d{1,4})\s*(.*)$/)
  if (!match) return { iso: ISO_POR_DEFECTO, numero: valor }

  const [, codigo, numero] = match
  const pais = PAISES.find((p) => p.codigo === codigo)
  return pais ? { iso: pais.iso, numero } : { iso: ISO_POR_DEFECTO, numero: valor }
}

export function combinarTelefono(iso: string, numero: string): string {
  const numeroLimpio = numero.trim()
  if (!numeroLimpio) return ''
  const pais = PAISES.find((p) => p.iso === iso) ?? PAISES[0]
  return `${pais.codigo} ${numeroLimpio}`
}
