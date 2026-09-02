import axios from 'axios'

export const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000'

export const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
})

let refrescando: Promise<void> | null = null

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const esRutaAuth =
      typeof original?.url === 'string' && original.url.startsWith('/auth/')

    if (error.response?.status === 401 && !original?._retry && !esRutaAuth) {
      original._retry = true
      try {
        if (!refrescando) {
          refrescando = axiosInstance
            .post('/auth/refresh')
            .then(() => undefined)
            .finally(() => {
              refrescando = null
            })
        }
        await refrescando
        return axiosInstance(original)
      } catch {
        // El refresh también falló: dejamos que el 401 original se propague.
      }
    }

    return Promise.reject(error)
  },
)
