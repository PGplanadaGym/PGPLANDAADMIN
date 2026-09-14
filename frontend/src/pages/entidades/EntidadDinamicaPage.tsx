import { useParams } from 'react-router-dom'
import { EntidadCRUD } from '../../components/entidad-crud/EntidadCRUD'

export function EntidadDinamicaPage() {
  const { entidadClave } = useParams<{ entidadClave: string }>()

  if (!entidadClave) return null

  return <EntidadCRUD entidadClave={entidadClave} />
}
