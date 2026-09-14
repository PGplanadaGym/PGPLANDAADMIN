import { z } from 'zod'
import type { CampoDinamico } from '../../providers/entidadesContext'

export function buildEntidadSchema(campos: CampoDinamico[]) {
  const shape: Record<string, z.ZodTypeAny> = {}

  for (const campo of campos) {
    let schema: z.ZodTypeAny

    if (campo.tipo === 'numero') {
      schema = campo.requerido
        ? z.coerce.number({ error: `${campo.etiqueta} es requerido` })
        : z.coerce.number().optional().or(z.literal(''))
    } else if (campo.tipo === 'booleano') {
      schema = z.boolean().optional()
    } else if (campo.requerido) {
      schema = z.string().min(1, `${campo.etiqueta} es requerido`)
    } else {
      schema = z.string().optional()
    }

    shape[campo.clave] = schema
  }

  return z.object(shape)
}
