import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { seedEmpresaBase } from './seed-lib';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const { empresa, admin, rolAdmin, permisos } = await seedEmpresaBase({
    prisma,
    empresaNombre: 'Empresa Demo',
    dominio: 'demo.local',
    adminNombre: 'Administrador Demo',
    adminEmail: 'admin@demo.local',
    adminPassword: 'Admin123!',
    modulosActivos: [
      'clientes',
      'citas',
      'inventario',
      'asistencia',
      'cuentas',
      'costeo',
      'ventas',
      'compras',
      'sucursales',
      'nomina',
    ],
  });

  const rolEmpleado = await prisma.rol.upsert({
    where: { empresaId_nombre: { empresaId: empresa.id, nombre: 'Empleado' } },
    update: {},
    create: {
      empresaId: empresa.id,
      nombre: 'Empleado',
      descripcion: 'Acceso limitado, solo lectura de usuarios',
    },
  });

  const permisoUsuariosLeer = permisos.find(
    (permiso) => permiso.clave === 'usuarios.leer',
  )!;
  await prisma.rolPermiso.createMany({
    data: [{ rolId: rolEmpleado.id, permisoId: permisoUsuariosLeer.id }],
    skipDuplicates: true,
  });

  const passwordLimitado = await bcrypt.hash('Empleado123!', 10);
  const empleado = await prisma.usuario.upsert({
    where: { email: 'empleado@demo.local' },
    update: { passwordHash: passwordLimitado },
    create: {
      empresaId: empresa.id,
      nombre: 'Empleado Demo',
      email: 'empleado@demo.local',
      passwordHash: passwordLimitado,
    },
  });
  await prisma.usuarioRol.upsert({
    where: { usuarioId_rolId: { usuarioId: empleado.id, rolId: rolEmpleado.id } },
    update: {},
    create: { usuarioId: empleado.id, rolId: rolEmpleado.id },
  });

  const entidadMascotaExistente = await prisma.entidadDinamica.findUnique({
    where: { empresaId_clave: { empresaId: empresa.id, clave: 'mascota' } },
  });
  if (!entidadMascotaExistente) {
    await prisma.entidadDinamica.create({
      data: {
        empresaId: empresa.id,
        clave: 'mascota',
        nombre: 'Mascotas',
        campos: {
          create: [
            { clave: 'nombre', etiqueta: 'Nombre', tipo: 'texto', requerido: true, orden: 0 },
            {
              clave: 'especie',
              etiqueta: 'Especie',
              tipo: 'select',
              requerido: true,
              opciones: ['Perro', 'Gato', 'Otro'],
              orden: 1,
            },
            { clave: 'fechaNacimiento', etiqueta: 'Fecha de nacimiento', tipo: 'fecha', orden: 2 },
            { clave: 'peso', etiqueta: 'Peso (kg)', tipo: 'numero', orden: 3 },
          ],
        },
      },
    });
  }

  const recursoDemo = await prisma.recurso.findFirst({
    where: { empresaId: empresa.id, nombre: 'Recepción' },
  });
  const recurso =
    recursoDemo ??
    (await prisma.recurso.create({
      data: { empresaId: empresa.id, nombre: 'Recepción', tipo: 'persona' },
    }));

  const tipoCitaDemo = await prisma.tipoCita.findFirst({
    where: { empresaId: empresa.id, nombre: 'Consulta general' },
  });
  const tipoCita =
    tipoCitaDemo ??
    (await prisma.tipoCita.create({
      data: {
        empresaId: empresa.id,
        nombre: 'Consulta general',
        duracionMinutos: 30,
        bufferMinutos: 5,
        color: '#0ea5e9',
      },
    }));

  const categoriaActivoDemo = await prisma.categoriaActivo.findFirst({
    where: { empresaId: empresa.id, nombre: 'Laptops' },
  });
  const categoriaActivo =
    categoriaActivoDemo ??
    (await prisma.categoriaActivo.create({
      data: { empresaId: empresa.id, nombre: 'Laptops' },
    }));

  let activoDemo = await prisma.activo.findFirst({
    where: { empresaId: empresa.id, nombre: 'Laptop Dell Latitude #001' },
  });
  if (!activoDemo) {
    activoDemo = await prisma.activo.create({
      data: {
        empresaId: empresa.id,
        categoriaActivoId: categoriaActivo.id,
        nombre: 'Laptop Dell Latitude #001',
        codigoInterno: 'ACT-0001',
        estado: 'asignado',
      },
    });
    await prisma.asignacionActivo.create({
      data: {
        empresaId: empresa.id,
        activoId: activoDemo.id,
        usuarioId: admin.id,
        asignadoPorId: admin.id,
        notas: 'Asignación inicial de ejemplo',
      },
    });
  }

  const productoDemo = await prisma.productoServicio.findFirst({
    where: { empresaId: empresa.id, tipo: 'producto', nombre: 'Papel bond A4 (paquete)' },
  });
  if (!productoDemo) {
    const producto = await prisma.productoServicio.create({
      data: {
        empresaId: empresa.id,
        tipo: 'producto',
        nombre: 'Papel bond A4 (paquete)',
        sku: 'SUP-001',
        precio: 12.5,
        unidadMedida: 'paquete',
        stockMinimo: 5,
        stock: 0,
      },
    });
    await prisma.movimientoStock.create({
      data: {
        empresaId: empresa.id,
        productoId: producto.id,
        tipo: 'entrada',
        cantidad: 20,
        motivo: 'Stock inicial de ejemplo',
        usuarioId: admin.id,
      },
    });
    await prisma.productoServicio.update({
      where: { id: producto.id },
      data: { stock: 20 },
    });
  }

  const categoriasCuentaDemo: Array<[string, 'ingreso' | 'egreso']> = [
    ['Venta de trajes', 'ingreso'],
    ['Compra de tela e insumos', 'egreso'],
    ['Alquiler de local', 'egreso'],
  ];
  const categoriasCuenta = new Map<string, { id: string }>();
  for (const [nombre, tipo] of categoriasCuentaDemo) {
    const categoria = await prisma.categoriaMovimiento.upsert({
      where: { empresaId_tipo_nombre: { empresaId: empresa.id, tipo, nombre } },
      update: {},
      create: { empresaId: empresa.id, tipo, nombre },
    });
    categoriasCuenta.set(nombre, categoria);
  }

  const movimientoCuentaDemoExiste = await prisma.movimientoCuenta.findFirst({
    where: { empresaId: empresa.id },
  });
  if (!movimientoCuentaDemoExiste) {
    const hoy = new Date();
    const haceNDias = (n: number) => new Date(hoy.getTime() - n * 24 * 60 * 60 * 1000);

    await prisma.movimientoCuenta.createMany({
      data: [
        {
          empresaId: empresa.id,
          tipo: 'ingreso',
          categoriaId: categoriasCuenta.get('Venta de trajes')!.id,
          monto: 450,
          fecha: haceNDias(3),
          descripcion: 'Venta de traje de gala',
          metodoPago: 'transferencia',
          usuarioId: admin.id,
        },
        {
          empresaId: empresa.id,
          tipo: 'ingreso',
          categoriaId: categoriasCuenta.get('Venta de trajes')!.id,
          monto: 320,
          fecha: haceNDias(20),
          descripcion: 'Venta de cosplay por encargo',
          metodoPago: 'efectivo',
          usuarioId: admin.id,
        },
        {
          empresaId: empresa.id,
          tipo: 'egreso',
          categoriaId: categoriasCuenta.get('Compra de tela e insumos')!.id,
          monto: 180,
          fecha: haceNDias(18),
          descripcion: 'Tela y accesorios para pedidos',
          metodoPago: 'efectivo',
          numeroComprobante: 'B001-00123',
          usuarioId: admin.id,
        },
        {
          empresaId: empresa.id,
          tipo: 'egreso',
          categoriaId: categoriasCuenta.get('Alquiler de local')!.id,
          monto: 600,
          fecha: haceNDias(10),
          descripcion: 'Alquiler del mes',
          metodoPago: 'transferencia',
          usuarioId: admin.id,
        },
      ],
    });
  }

  const materialesDemo: Array<[string, string | null, string, number]> = [
    ['Tela Lycra', 'Estándar', 'metro', 15],
    ['Tela Lycra', 'Premium', 'metro', 35],
    ['Goma EVA 5mm', null, 'pliego', 12],
    ['Pintura acrílica', null, 'unidad', 8],
  ];
  for (const [nombre, calidad, unidadMedida, precioUnitario] of materialesDemo) {
    const existente = await prisma.material.findFirst({
      where: { empresaId: empresa.id, nombre, calidad },
    });
    if (!existente) {
      await prisma.material.create({
        data: { empresaId: empresa.id, nombre, calidad, unidadMedida, precioUnitario },
      });
    }
  }

  console.log('Seed completo:');
  console.log(`  Rol Admin id: ${rolAdmin.id}`);
  console.log('  admin@demo.local / Admin123!  (rol Admin, todos los permisos)');
  console.log('  empleado@demo.local / Empleado123!  (rol Empleado, solo usuarios.leer)');
  console.log('  Módulo "clientes" activo para Empresa Demo');
  console.log('  Entidad dinámica "Mascota" creada de ejemplo');
  console.log(`  Módulo "citas" activo — recurso "${recurso.nombre}", tipo de cita "${tipoCita.nombre}"`);
  console.log('  Módulo "inventario" activo — activo "Laptop Dell Latitude #001" (asignado al admin), producto "Papel bond A4 (paquete)" (stock 20)');
  console.log('  Módulo "cuentas" activo — 3 categorías y 4 movimientos de ejemplo');
  console.log('  Módulo "costeo" activo — 4 materiales de ejemplo (tela, goma EVA, pintura)');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
