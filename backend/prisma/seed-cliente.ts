import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { seedEmpresaBase } from './seed-lib';

const empresaNombre = process.env.CLIENTE_EMPRESA_NOMBRE;
const dominio = process.env.CLIENTE_DOMINIO;
const adminNombre = process.env.CLIENTE_ADMIN_NOMBRE ?? 'Administrador';
const adminEmail = process.env.CLIENTE_ADMIN_EMAIL;
const adminPassword = process.env.CLIENTE_ADMIN_PASSWORD;

if (!empresaNombre || !dominio || !adminEmail || !adminPassword) {
  console.error(
    'Faltan variables de entorno: CLIENTE_EMPRESA_NOMBRE, CLIENTE_DOMINIO, CLIENTE_ADMIN_EMAIL, CLIENTE_ADMIN_PASSWORD',
  );
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const { empresa, admin } = await seedEmpresaBase({
    prisma,
    empresaNombre: empresaNombre!,
    dominio: dominio!,
    adminNombre,
    adminEmail: adminEmail!,
    adminPassword: adminPassword!,
  });

  console.log('Cliente aprovisionado:');
  console.log(`  Empresa: ${empresa.nombre} (${empresa.dominio})`);
  console.log(`  Admin: ${admin.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
