import type { AccessControlProvider } from '@refinedev/core'
import { buildAbility } from '../ability/ability'
import { getIdentity } from '../lib/identity'

const ACTION_A_VERBO: Record<string, string> = {
  list: 'leer',
  show: 'leer',
  create: 'crear',
  edit: 'actualizar',
  delete: 'eliminar',
}

export const accessControlProvider: AccessControlProvider = {
  can: async ({ resource, action }) => {
    if (!resource) return { can: true }

    const verbo = ACTION_A_VERBO[action] ?? action
    const clave = `${resource}.${verbo}`

    try {
      const identity = await getIdentity()
      const ability = buildAbility(identity.permisos)
      return { can: ability.can(clave, 'all') }
    } catch {
      return { can: false }
    }
  },
}
