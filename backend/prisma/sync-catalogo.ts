import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { CATALOGO_MODULOS, CATALOGO_PERMISOS } from './seed-lib';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/**
 * Sincroniza el catálogo de permisos/módulos (que cambia cuando se agrega un
 * módulo nuevo al sistema) en TODAS las empresas ya aprovisionadas, sin tocar
 * empresas, usuarios ni contraseñas. Se corre una vez por cada módulo nuevo.
 */
async function main() {
  const permisos = await Promise.all(
    CATALOGO_PERMISOS.map((permiso) =>
      prisma.permiso.upsert({ where: { clave: permiso.clave }, update: {}, create: permiso }),
    ),
  );

  await Promise.all(
    CATALOGO_MODULOS.map((modulo) =>
      prisma.modulo.upsert({ where: { clave: modulo.clave }, update: {}, create: modulo }),
    ),
  );

  const rolesAdmin = await prisma.rol.findMany({ where: { nombre: 'Admin' } });

  for (const rol of rolesAdmin) {
    await prisma.rolPermiso.createMany({
      data: permisos.map((permiso) => ({ rolId: rol.id, permisoId: permiso.id })),
      skipDuplicates: true,
    });
  }

  console.log(`Catálogo sincronizado: ${permisos.length} permisos, ${CATALOGO_MODULOS.length} módulos.`);
  console.log(`Permisos otorgados a ${rolesAdmin.length} rol(es) "Admin" existentes.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
