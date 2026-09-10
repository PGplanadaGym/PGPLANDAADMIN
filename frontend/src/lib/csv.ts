export function exportarCSV(nombreArchivo: string, filas: Record<string, unknown>[]) {
  if (filas.length === 0) return

  const columnas = Object.keys(filas[0])

  const escapar = (valor: unknown) => {
    const texto = valor === null || valor === undefined ? '' : String(valor)
    return /[",\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
  }

  const lineas = [
    columnas.join(','),
    ...filas.map((fila) => columnas.map((columna) => escapar(fila[columna])).join(',')),
  ]

  const blob = new Blob(['﻿' + lineas.join('\n')], {
    type: 'text/csv;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombreArchivo
  enlace.click()
  URL.revokeObjectURL(url)
}

function parsearFilaCSV(linea: string): string[] {
  const campos: string[] = []
  let actual = ''
  let entreComillas = false

  for (let i = 0; i < linea.length; i++) {
    const char = linea[i]
    if (entreComillas) {
      if (char === '"') {
        if (linea[i + 1] === '"') {
          actual += '"'
          i++
        } else {
          entreComillas = false
        }
      } else {
        actual += char
      }
    } else if (char === '"') {
      entreComillas = true
    } else if (char === ',') {
      campos.push(actual)
      actual = ''
    } else {
      actual += char
    }
  }
  campos.push(actual)
  return campos
}

/** Inverso de exportarCSV: espera un archivo con la misma cabecera (una columna por clave). */
export function parsearCSV(texto: string): Record<string, string>[] {
  const lineas = texto
    .replace(/^﻿/, '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((l) => l.trim().length > 0)

  if (lineas.length === 0) return []

  const columnas = parsearFilaCSV(lineas[0])
  return lineas.slice(1).map((linea) => {
    const valores = parsearFilaCSV(linea)
    const fila: Record<string, string> = {}
    columnas.forEach((columna, i) => {
      fila[columna] = valores[i] ?? ''
    })
    return fila
  })
}
