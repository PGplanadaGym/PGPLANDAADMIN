import { useCallback, useEffect, useState } from 'react'
import { useGetIdentity } from '@refinedev/core'
import { axiosInstance } from '../lib/axios'
import type { Identity } from '../lib/identity'

const STORAGE_KEY = 'sucursalActivaId'

export interface SucursalBasica {
  id: string
  nombre: string
}

function leerStorage(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

function escribirStorage(id: string) {
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* localStorage puede fallar en modo privado — no es crítico, solo se pierde el recordatorio */
  }
}

/**
 * "Sucursal activa": la sucursal que un usuario que puede ver todas eligió para trabajar
 * ahora mismo. Se recuerda entre páginas y sesiones (localStorage) y sirve para dos cosas:
 * filtrar listas (Clientes, Membresías…) y precargar el campo sucursal al crear un registro,
 * para no tener que elegirla cada vez ni arriesgarse a dejarla en la sucursal equivocada.
 *
 * Un usuario que NO puede ver todas las sucursales no la necesita: su propia sucursal ya
 * hace ese trabajo automáticamente en el backend.
 */
export function useSucursalActiva() {
  const { data: identity } = useGetIdentity<Identity>()
  const puedeVerTodasSucursales = identity?.permisos.includes('clientes.ver-todas-sucursales') ?? false

  const [sucursales, setSucursales] = useState<SucursalBasica[]>([])
  const [sucursalActivaId, setSucursalActivaIdState] = useState<string>(leerStorage)

  useEffect(() => {
    if (!puedeVerTodasSucursales) return
    axiosInstance
      .get<SucursalBasica[]>('/sucursales')
      .then(({ data }) => setSucursales(data))
      .catch(() => {
        /* si no tiene permiso o falla, simplemente no hay opciones para elegir */
      })
  }, [puedeVerTodasSucursales])

  const setSucursalActivaId = useCallback((id: string) => {
    setSucursalActivaIdState(id)
    escribirStorage(id)
  }, [])

  // Valor por defecto para precargar formularios de creación: la activa elegida, o si no
  // eligió ninguna, la propia sucursal del usuario (si la tiene asignada).
  const sucursalIdPorDefecto = sucursalActivaId || identity?.sucursalId || ''

  return {
    puedeVerTodasSucursales,
    sucursales,
    sucursalActivaId,
    setSucursalActivaId,
    sucursalIdPorDefecto,
  }
}
