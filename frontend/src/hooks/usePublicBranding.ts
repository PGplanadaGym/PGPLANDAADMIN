import { useEffect, useState } from 'react'
import { axiosInstance } from '../lib/axios'
import { aplicarColorPrimario } from '../lib/theme'

interface Branding {
  nombre: string
  logoUrl: string | null
  colorPrimario: string | null
}

export function usePublicBranding() {
  const [branding, setBranding] = useState<Branding | null>(null)

  useEffect(() => {
    axiosInstance
      .get<Branding>('/public/branding')
      .then(({ data }) => {
        setBranding(data)
        aplicarColorPrimario(data.colorPrimario)
      })
      .catch(() => {
        // sin conexión al backend todavía: se queda con el branding por defecto
      })
  }, [])

  return branding
}
