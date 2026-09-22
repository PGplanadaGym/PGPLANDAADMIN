import { useEffect, useState, type ChangeEvent } from 'react'

interface Props {
  value: number
  onChange: (value: number) => void
  className?: string
  placeholder?: string
}

/** Limpia lo que se escribe para que solo queden dólares y, como mucho, centavos:
 * dígitos y un único separador decimal, con máximo 2 decimales — nada de "5,5465465"
 * ni letras. También quita ceros a la izquierda sobrantes (evita el "05" o el "0" que
 * no se deja borrar al usar un <input type="number"> controlado). */
function limpiarTextoMonto(textoCrudo: string): string {
  let texto = textoCrudo.replace(',', '.').replace(/[^0-9.]/g, '')

  const primerPunto = texto.indexOf('.')
  if (primerPunto !== -1) {
    texto = texto.slice(0, primerPunto + 1) + texto.slice(primerPunto + 1).replace(/\./g, '')
  }

  const [entero, decimales] = texto.split('.')
  const enteroSinCeros = entero.replace(/^0+(?=\d)/, '')
  texto = decimales !== undefined ? `${enteroSinCeros}.${decimales.slice(0, 2)}` : enteroSinCeros

  return texto
}

export function MontoInput({ value, onChange, className = '', placeholder = '0.00' }: Props) {
  const [texto, setTexto] = useState(value > 0 ? String(value) : '')

  // Si el valor llega desde afuera (ej. se abre el formulario en modo edición), sincroniza
  // el texto mostrado — pero no mientras el usuario está escribiendo (ver onChange).
  useEffect(() => {
    setTexto(value > 0 ? String(value) : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const manejarCambio = (e: ChangeEvent<HTMLInputElement>) => {
    const limpio = limpiarTextoMonto(e.target.value)
    setTexto(limpio)
    onChange(limpio === '' || limpio === '.' ? 0 : Number(limpio))
  }

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-text-faint)]">
        $
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={texto}
        onChange={manejarCambio}
        placeholder={placeholder}
        className={`w-full rounded-lg border border-[var(--color-border)] py-2 pl-6 pr-3 text-sm focus:border-[var(--color-primario)] focus:outline-none ${className}`}
      />
    </div>
  )
}
