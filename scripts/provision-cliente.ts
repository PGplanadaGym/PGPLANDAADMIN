import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const BACKEND_DIR = path.resolve(import.meta.dirname, '..', 'backend');
const CLIENTES_DIR = path.resolve(import.meta.dirname, '..', 'clientes');

/** Carga backend/.env sin depender del paquete `dotenv` (evita problemas de resolución de módulos al correr este script desde fuera de backend/). */
function cargarEnvBackend() {
  const envPath = path.join(BACKEND_DIR, '.env');
  if (!existsSync(envPath)) return;

  for (const linea of readFileSync(envPath, 'utf-8').split('\n')) {
    const match = linea.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    const [, clave, valorCrudo] = match;
    if (process.env[clave]) continue;
    process.env[clave] = valorCrudo.trim().replace(/^"(.*)"$/, '$1');
  }
}

cargarEnvBackend();
const NEON_API_KEY = process.env.NEON_API_KEY;

interface NeonProjectResponse {
  project: { id: string; name: string };
  connection_uris: { connection_uri: string }[];
}

function uso(): never {
  console.error(
    'Uso: npx tsx ../scripts/provision-cliente.ts <slug> "<Nombre Empresa>" <admin-email> [admin-nombre]',
  );
  console.error(
    'Ejemplo: npx tsx ../scripts/provision-cliente.ts taller-el-rayo "Taller El Rayo" admin@elrayo.com',
  );
  process.exit(1);
}

async function crearProyectoNeon(nombreProyecto: string) {
  const respuesta = await fetch('https://console.neon.tech/api/v2/projects', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${NEON_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ project: { name: nombreProyecto } }),
  });

  if (!respuesta.ok) {
    throw new Error(
      `Error creando proyecto en Neon (${respuesta.status}): ${await respuesta.text()}`,
    );
  }

  const data = (await respuesta.json()) as NeonProjectResponse;
  const connectionUri = data.connection_uris[0]?.connection_uri;

  if (!connectionUri) {
    throw new Error('Neon no devolvió una connection string');
  }

  return { projectId: data.project.id, connectionUri };
}

async function main() {
  if (!NEON_API_KEY) {
    console.error(
      'Falta NEON_API_KEY. Genera una en https://console.neon.tech (Account Settings → API Keys) y agrégala a backend/.env',
    );
    process.exit(1);
  }

  const [, , slug, empresaNombre, adminEmail, adminNombre] = process.argv;
  if (!slug || !empresaNombre || !adminEmail) uso();

  const dominio = `${slug}.backoffice.local`;
  const adminPassword = randomBytes(9).toString('base64url');
  const nombreProyecto = `backoffice-${slug}`;

  console.log(`\n1/4 · Creando proyecto Neon "${nombreProyecto}"...`);
  const { connectionUri } = await crearProyectoNeon(nombreProyecto);

  mkdirSync(CLIENTES_DIR, { recursive: true });
  const envPath = path.join(CLIENTES_DIR, `${slug}.env`);
  writeFileSync(
    envPath,
    [
      `# Cliente: ${empresaNombre}`,
      `DATABASE_URL="${connectionUri}"`,
      `JWT_SECRET="${randomBytes(24).toString('hex')}"`,
      '',
    ].join('\n'),
  );
  console.log(`2/4 · Credenciales guardadas en ${path.relative(process.cwd(), envPath)}`);

  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

  console.log('3/4 · Aplicando migraciones...');
  execFileSync(npx, ['prisma', 'migrate', 'deploy'], {
    cwd: BACKEND_DIR,
    env: { ...process.env, DATABASE_URL: connectionUri },
    stdio: 'inherit',
  });

  console.log('4/4 · Sembrando empresa, permisos y usuario admin...');
  execFileSync(npx, ['tsx', 'prisma/seed-cliente.ts'], {
    cwd: BACKEND_DIR,
    env: {
      ...process.env,
      DATABASE_URL: connectionUri,
      CLIENTE_EMPRESA_NOMBRE: empresaNombre,
      CLIENTE_DOMINIO: dominio,
      CLIENTE_ADMIN_EMAIL: adminEmail,
      CLIENTE_ADMIN_NOMBRE: adminNombre ?? 'Administrador',
      CLIENTE_ADMIN_PASSWORD: adminPassword,
    },
    stdio: 'inherit',
  });

  console.log('\n✅ Cliente aprovisionado');
  console.log(`   Empresa: ${empresaNombre}`);
  console.log(`   Login:   ${adminEmail}`);
  console.log(`   Password: ${adminPassword}  (guárdala, no se vuelve a mostrar)`);
  console.log(`   Env file: ${path.relative(process.cwd(), envPath)}`);
}

main().catch((error) => {
  console.error('\n❌ Falló el aprovisionamiento:', error.message ?? error);
  process.exit(1);
});
