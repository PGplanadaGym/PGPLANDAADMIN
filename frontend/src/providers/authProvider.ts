import type { AuthProvider } from '@refinedev/core'
import { axiosInstance } from '../lib/axios'
import { clearIdentity, getIdentity } from '../lib/identity'

export const authProvider: AuthProvider = {
  login: async ({ email, password }) => {
    try {
      await axiosInstance.post('/auth/login', { email, password })
      return { success: true, redirectTo: '/' }
    } catch {
      return {
        success: false,
        error: { name: 'LoginError', message: 'Credenciales inválidas' },
      }
    }
  },
  logout: async () => {
    try {
      await axiosInstance.post('/auth/logout')
    } catch {
      // si falla, igual limpiamos el estado local y mandamos al login
    }
    clearIdentity()
    return { success: true, redirectTo: '/login' }
  },
  check: async () => {
    try {
      await getIdentity()
      return { authenticated: true }
    } catch {
      clearIdentity()
      return { authenticated: false, redirectTo: '/login' }
    }
  },
  onError: async (error) => {
    if (error?.response?.status === 401) {
      clearIdentity()
      return { logout: true, redirectTo: '/login' }
    }
    return { error }
  },
  getIdentity: async () => {
    try {
      return await getIdentity()
    } catch {
      return null
    }
  },
}
