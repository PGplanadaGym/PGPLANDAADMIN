import {
  AbilityBuilder,
  createMongoAbility,
  type MongoAbility,
} from '@casl/ability'

export type AppAbility = MongoAbility<[string, 'all']>

export function buildAbility(permisos: string[]): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility)
  for (const permiso of permisos) {
    can(permiso, 'all')
  }
  return build()
}
