import { useEffect, useState } from 'react'
import { axiosInstance } from '../lib/axios'
import { useEntidades, type EntidadMeta } from '../providers/entidadesContext'

export interface OpcionRelacion {
  value: string
  label: string
}

function etiquetaDeRegistroDinamico(
  registro: { id: string; valores: Record<string, unknown> },
  entidad: EntidadMeta | undefined,
): string {
  const primerCampo = entidad?.campos[0]?.clave
  const valor = primerCampo ? registro.valores[primerCampo] : undefined
  return valor != null && valor !== '' ? String(valor) : registro.id
}

/** Carga las opciones para un campo tipo "relacion" ("cliente" o "entidad:<clave>"). */
export function useOpcionesRelacion(relacionCon: string | null | undefined) {
  const { entidades } = useEntidades()
  const [opciones, setOpciones] = useState<OpcionRelacion[]>([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!relacionCon) {
      setOpciones([])
      return
    }

    setCargando(true)
    setError(false)

    if (relacionCon === 'cliente') {
      axiosInstance
        .get<{ id: string; nombre: string }[]>('/clientes')
        .then(({ data }) => setOpciones(data.map((c) => ({ value: c.id, label: c.nombre }))))
        .catch(() => setError(true))
        .finally(() => setCargando(false))
      return
    }

    if (relacionCon.startsWith('entidad:')) {
      const claveDestino = relacionCon.slice('entidad:'.length)
      const entidadDestino = entidades.find((e) => e.clave === claveDestino)
      axiosInstance
        .get<{ id: string; valores: Record<string, unknown> }[]>(
          `/dinamico/${claveDestino}/registros`,
        )
        .then(({ data }) =>
          setOpciones(
            data.map((r) => ({ value: r.id, label: etiquetaDeRegistroDinamico(r, entidadDestino) })),
          ),
        )
        .catch(() => setError(true))
        .finally(() => setCargando(false))
      return
    }

    setCargando(false)
  }, [relacionCon, entidades])

  return { opciones, cargando, error }
}
