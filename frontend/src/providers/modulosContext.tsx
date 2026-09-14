import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { axiosInstance } from '../lib/axios'

export interface ModuloEstado {
  id: string
  clave: string
  nombre: string
  descripcion?: string | null
  activo: boolean
}

interface ModulosContextValue {
  modulos: ModuloEstado[]
  loading: boolean
  refetch: () => Promise<void>
}

const ModulosContext = createContext<ModulosContextValue | null>(null)

export function ModulosProvider({ children }: { children: ReactNode }) {
  const [modulos, setModulos] = useState<ModuloEstado[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await axiosInstance.get<ModuloEstado[]>('/modulos')
      setModulos(data)
    } catch {
      setModulos([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  return (
    <ModulosContext.Provider value={{ modulos, loading, refetch }}>
      {children}
    </ModulosContext.Provider>
  )
}

export function useModulos() {
  const ctx = useContext(ModulosContext)
  if (!ctx) {
    throw new Error('useModulos debe usarse dentro de <ModulosProvider>')
  }
  return ctx
}
