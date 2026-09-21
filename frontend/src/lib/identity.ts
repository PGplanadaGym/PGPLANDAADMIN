import { axiosInstance } from './axios'

export interface EmpresaBranding {
  nombre: string
  razonSocial: string | null
  logoUrl: string | null
  colorPrimario: string | null
  ruc: string | null
  direccion: string | null
  telefono: string | null
}

export interface Identity {
  id: string
  empresaId: string
  nombre: string
  email: string
  fotoUrl: string | null
  permisos: string[]
  sucursalId: string | null
  empresa: EmpresaBranding
}

let cached: Identity | null = null
let inFlight: Promise<Identity> | null = null

export async function getIdentity(): Promise<Identity> {
  if (cached) return cached
  if (!inFlight) {
    inFlight = axiosInstance
      .get<Identity>('/auth/me')
      .then((res) => {
        cached = res.data
        return res.data
      })
      .catch((error) => {
        inFlight = null
        throw error
      })
  }
  return inFlight
}

export function clearIdentity() {
  cached = null
  inFlight = null
}
