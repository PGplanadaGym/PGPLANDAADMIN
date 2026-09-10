import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { axiosInstance } from '../lib/axios'

export type TipoCampo = 'texto' | 'numero' | 'fecha' | 'booleano' | 'select' | 'relacion' | 'imagen'

export interface CampoDinamico {
  clave: string
  etiqueta: string
  tipo: TipoCampo
  requerido: boolean
  opciones?: string[] | null
  relacionCon?: string | null
  orden: number
}

export interface EntidadMeta {
  clave: string
  nombre: string
  campos: CampoDinamico[]
}

interface EntidadesContextValue {
  entidades: EntidadMeta[]
  loading: boolean
  refetch: () => Promise<void>
}

const EntidadesContext = createContext<EntidadesContextValue | null>(null)

export function EntidadesProvider({ children }: { children: ReactNode }) {
  const [entidades, setEntidades] = useState<EntidadMeta[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await axiosInstance.get<EntidadMeta[]>('/meta/entidades')
      setEntidades(data)
    } catch {
      setEntidades([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  return (
    <EntidadesContext.Provider value={{ entidades, loading, refetch }}>
      {children}
    </EntidadesContext.Provider>
  )
}

export function useEntidades() {
  const ctx = useContext(EntidadesContext)
  if (!ctx) {
    throw new Error('useEntidades debe usarse dentro de <EntidadesProvider>')
  }
  return ctx
}
