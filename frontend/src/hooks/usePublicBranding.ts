import { useEffect, useState } from 'react'
import { axiosInstance } from '../lib/axios'
import { aplicarColorPrimario } from '../lib/theme'

interface Branding {
  nombre: string
  logoUrl: string | null
  colorPrimario: string | null
}

export function usePublicBranding(slug?: string) {
  const [branding, setBranding] = useState<Branding | null>(null)

  useEffect(() => {
    const url = slug ? `/public/branding/${slug}` : '/public/branding'
    axiosInstance
      .get<Branding>(url)
      .then(({ data }) => {
        setBranding(data)
        aplicarColorPrimario(data.colorPrimario)
      })
      .catch(() => {
        // sin conexión al backend todavía: se queda con el branding por defecto
      })
  }, [slug])

  return branding
}
