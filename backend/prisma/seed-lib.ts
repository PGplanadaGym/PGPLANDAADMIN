import bcrypt from 'bcrypt';
import type { PrismaClient } from '@prisma/client';

export const CATALOGO_PERMISOS = [
  { clave: 'empresas.leer', etiqueta: 'Ver empresas' },
  { clave: 'empresas.crear', etiqueta: 'Crear empresas' },
  { clave: 'empresas.actualizar', etiqueta: 'Actualizar empresas' },
  { clave: 'usuarios.leer', etiqueta: 'Ver usuarios' },
  { clave: 'usuarios.crear', etiqueta: 'Crear usuarios' },
  { clave: 'usuarios.actualizar', etiqueta: 'Cambiar el rol de un usuario' },
  { clave: 'roles.leer', etiqueta: 'Ver roles y permisos' },
  { clave: 'roles.crear', etiqueta: 'Crear roles' },
  { clave: 'roles.actualizar', etiqueta: 'Actualizar roles' },
  { clave: 'roles.eliminar', etiqueta: 'Eliminar roles' },
  { clave: 'modulos.leer', etiqueta: 'Ver módulos' },
  { clave: 'modulos.actualizar', etiqueta: 'Activar/desactivar módulos' },
  { clave: 'clientes.leer', etiqueta: 'Ver clientes' },
  { clave: 'clientes.crear', etiqueta: 'Crear clientes' },
  { clave: 'clientes.actualizar', etiqueta: 'Editar y archivar clientes' },
  { clave: 'entidades.leer', etiqueta: 'Ver entidades dinámicas' },
  { clave: 'entidades.crear', etiqueta: 'Crear entidades dinámicas' },
  { clave: 'entidades.actualizar', etiqueta: 'Editar entidades dinámicas' },
  { clave: 'entidades.eliminar', etiqueta: 'Eliminar entidades dinámicas' },
  { clave: 'entidades.registros.leer', etiqueta: 'Ver registros de entidades dinámicas' },
  { clave: 'entidades.registros.crear', etiqueta: 'Crear registros de entidades dinámicas' },
  { clave: 'entidades.registros.actualizar', etiqueta: 'Editar registros de entidades dinámicas' },
  { clave: 'entidades.registros.eliminar', etiqueta: 'Eliminar registros de entidades dinámicas' },
  { clave: 'auditoria.leer', etiqueta: 'Ver historial de actividad' },
  { clave: 'recursos.leer', etiqueta: 'Ver recursos agendables' },
  { clave: 'recursos.crear', etiqueta: 'Crear recursos agendables' },
  { clave: 'recursos.actualizar', etiqueta: 'Editar recursos agendables y su horario' },
  { clave: 'tipos-cita.leer', etiqueta: 'Ver tipos de cita' },
  { clave: 'tipos-cita.crear', etiqueta: 'Crear tipos de cita' },
  { clave: 'tipos-cita.actualizar', etiqueta: 'Editar tipos de cita' },
  { clave: 'citas.leer', etiqueta: 'Ver citas' },
  { clave: 'citas.crear', etiqueta: 'Crear citas' },
  { clave: 'citas.actualizar', etiqueta: 'Actualizar citas' },
  { clave: 'citas.eliminar', etiqueta: 'Eliminar citas' },
  { clave: 'activos.leer', etiqueta: 'Ver activos e inventario' },
  { clave: 'activos.crear', etiqueta: 'Crear activos' },
  { clave: 'activos.actualizar', etiqueta: 'Editar, dar de baja y registrar mantenimiento de activos' },
  { clave: 'activos.asignar', etiqueta: 'Asignar/devolver activos' },
  { clave: 'activos.eliminar', etiqueta: 'Eliminar activos sin historial (creados por error)' },
  { clave: 'productos.leer', etiqueta: 'Ver productos y stock' },
  { clave: 'productos.crear', etiqueta: 'Crear productos' },
  { clave: 'productos.actualizar', etiqueta: 'Editar y archivar productos' },
  { clave: 'productos.movimientos.crear', etiqueta: 'Registrar entradas/salidas de stock' },
  { clave: 'asistencia.leer', etiqueta: 'Ver asistencia de todos los colaboradores' },
  { clave: 'cuentas.leer', etiqueta: 'Ver ingresos y egresos' },
  { clave: 'cuentas.crear', etiqueta: 'Registrar ingresos y egresos' },
  { clave: 'cuentas.actualizar', etiqueta: 'Editar ingresos y egresos' },
  { clave: 'cuentas.eliminar', etiqueta: 'Eliminar ingresos y egresos' },
  { clave: 'costeo.leer', etiqueta: 'Ver materiales y costeos' },
  { clave: 'costeo.crear', etiqueta: 'Crear materiales y costeos' },
  { clave: 'costeo.actualizar', etiqueta: 'Editar costeos' },
  { clave: 'costeo.eliminar', etiqueta: 'Eliminar costeos' },
  { clave: 'ventas.leer', etiqueta: 'Ver ventas' },
  { clave: 'ventas.crear', etiqueta: 'Registrar ventas' },
  { clave: 'ventas.eliminar', etiqueta: 'Eliminar ventas' },
  { clave: 'proveedores.leer', etiqueta: 'Ver proveedores' },
  { clave: 'proveedores.crear', etiqueta: 'Crear proveedores' },
  { clave: 'proveedores.actualizar', etiqueta: 'Editar proveedores (incluye ubicación)' },
  { clave: 'compras.leer', etiqueta: 'Ver órdenes de compra' },
  { clave: 'compras.crear', etiqueta: 'Crear órdenes de compra' },
  { clave: 'compras.actualizar', etiqueta: 'Marcar órdenes de compra como recibidas' },
  { clave: 'compras.eliminar', etiqueta: 'Eliminar órdenes de compra' },
  { clave: 'sucursales.leer', etiqueta: 'Ver sucursales' },
  { clave: 'sucursales.crear', etiqueta: 'Crear sucursales' },
  { clave: 'sucursales.actualizar', etiqueta: 'Editar sucursales' },
  { clave: 'nomina.leer', etiqueta: 'Ver pagos de nómina' },
  { clave: 'nomina.crear', etiqueta: 'Registrar pagos de nómina' },
  { clave: 'nomina.actualizar', etiqueta: 'Editar pagos de nómina' },
  { clave: 'nomina.eliminar', etiqueta: 'Eliminar pagos de nómina' },
  { clave: 'membresias.leer', etiqueta: 'Ver membresías de socios' },
  { clave: 'membresias.crear', etiqueta: 'Renovar membresías' },
  { clave: 'membresias.actualizar', etiqueta: 'Editar planes de membresía' },
];

export const CATALOGO_MODULOS = [
  { clave: 'clientes', nombre: 'Clientes', descripcion: 'Gestión de clientes', precioMensual: 3 },
  {
    clave: 'citas',
    nombre: 'Citas',
    descripcion: 'Calendario de citas y reservas',
    precioMensual: 6,
  },
  {
    clave: 'inventario',
    nombre: 'Inventario',
    descripcion: 'Activos con historial de dueño y stock de productos por cantidad',
    precioMensual: 8,
  },
  {
    clave: 'asistencia',
    nombre: 'Asistencia',
    descripcion: 'Registro de entrada, salida y horario de comida con geolocalización',
    precioMensual: 5,
  },
  {
    clave: 'cuentas',
    nombre: 'Cuentas',
    descripcion: 'Registro de ingresos y egresos con reportes',
    precioMensual: 5,
  },
  {
    clave: 'costeo',
    nombre: 'Costeo',
    descripcion: 'Calculadora de costos por partes y materiales (ej. cosplay)',
    precioMensual: 6,
  },
  {
    clave: 'ventas',
    nombre: 'Ventas',
    descripcion: 'Punto de venta: vender productos del catálogo y descontar stock',
    precioMensual: 8,
  },
  {
    clave: 'compras',
    nombre: 'Proveedores y compras',
    descripcion: 'Proveedores y órdenes de compra: al recibirlas, suman stock y registran el egreso',
    precioMensual: 6,
  },
  {
    clave: 'sucursales',
    nombre: 'Sucursales',
    descripcion: 'Múltiples locales: asigna empleados, recursos y activos a una sucursal',
    precioMensual: 6,
  },
  {
    clave: 'nomina',
    nombre: 'Nómina',
    descripcion:
      'Registro simple de pagos a empleados por periodo (sin cálculo automático de IESS ni décimos)',
    precioMensual: 7,
  },
  {
    clave: 'membresias',
    nombre: 'Membresías',
    descripcion: 'Suscripciones de socios con vencimiento, renovación y avisos automáticos',
    precioMensual: 6,
  },
];

interface SeedEmpresaBaseOptions {
  prisma: PrismaClient;
  empresaNombre: string;
  dominio: string;
  adminNombre: string;
  adminEmail: string;
  adminPassword: string;
  activarModuloClientes?: boolean;
  modulosActivos?: string[];
}

/**
 * Crea (o actualiza de forma idempotente) el catálogo de permisos y módulos,
 * la empresa, el rol Admin con todos los permisos, y el usuario administrador.
 * Es la base mínima reutilizable para levantar el core en cualquier base nueva.
 */
export async function seedEmpresaBase(opts: SeedEmpresaBaseOptions) {
  const {
    prisma,
    empresaNombre,
    dominio,
    adminNombre,
    adminEmail,
    adminPassword,
    activarModuloClientes = true,
    modulosActivos = [],
  } = opts;

  const permisos = await Promise.all(
    CATALOGO_PERMISOS.map((permiso) =>
      prisma.permiso.upsert({
        where: { clave: permiso.clave },
        update: {},
        create: permiso,
      }),
    ),
  );

  const modulos = await Promise.all(
    CATALOGO_MODULOS.map((modulo) =>
      prisma.modulo.upsert({
        where: { clave: modulo.clave },
        update: {},
        create: modulo,
      }),
    ),
  );

  const empresa = await prisma.empresa.upsert({
    where: { dominio },
    update: {},
    create: { nombre: empresaNombre, dominio },
  });

  const rolAdmin = await prisma.rol.upsert({
    where: { empresaId_nombre: { empresaId: empresa.id, nombre: 'Admin' } },
    update: {},
    create: {
      empresaId: empresa.id,
      nombre: 'Admin',
      descripcion: 'Acceso total a la empresa',
    },
  });

  await prisma.rolPermiso.createMany({
    data: permisos.map((permiso) => ({
      rolId: rolAdmin.id,
      permisoId: permiso.id,
    })),
    skipDuplicates: true,
  });

  const clavesAActivar = new Set(modulosActivos);
  if (activarModuloClientes) clavesAActivar.add('clientes');

  for (const clave of clavesAActivar) {
    const modulo = modulos.find((m) => m.clave === clave);
    if (!modulo) continue;

    await prisma.empresaModulo.upsert({
      where: { empresaId_moduloId: { empresaId: empresa.id, moduloId: modulo.id } },
      update: { activo: true },
      create: { empresaId: empresa.id, moduloId: modulo.id, activo: true },
    });
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const admin = await prisma.usuario.upsert({
    where: { email: adminEmail },
    update: { passwordHash },
    create: {
      empresaId: empresa.id,
      nombre: adminNombre,
      email: adminEmail,
      passwordHash,
    },
  });

  await prisma.usuarioRol.upsert({
    where: { usuarioId_rolId: { usuarioId: admin.id, rolId: rolAdmin.id } },
    update: {},
    create: { usuarioId: admin.id, rolId: rolAdmin.id },
  });

  return { empresa, admin, rolAdmin, permisos, modulos };
}
