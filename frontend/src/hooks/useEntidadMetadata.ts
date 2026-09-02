import { useEntidades } from '../providers/entidadesContext'

export function useEntidadMetadata(entidadClave: string) {
  const { entidades, loading } = useEntidades()
  const entidad = entidades.find((item) => item.clave === entidadClave)
  return { entidad, loading }
}
