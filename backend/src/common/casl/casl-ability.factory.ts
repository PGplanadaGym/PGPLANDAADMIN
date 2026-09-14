import { Injectable } from '@nestjs/common';
import {
  AbilityBuilder,
  createMongoAbility,
  MongoAbility,
} from '@casl/ability';

export type AppAbility = MongoAbility<[string, 'all']>;

@Injectable()
export class CaslAbilityFactory {
  build(permisoClaves: string[]): AppAbility {
    const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    for (const clave of permisoClaves) {
      can(clave, 'all');
    }

    return build();
  }
}
