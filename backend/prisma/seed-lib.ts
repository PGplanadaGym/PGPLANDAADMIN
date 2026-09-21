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
  { clave: 'clientes.leer', etiqueta: 'Ver clientes' },
  { clave: 'clientes.crear', etiqueta: 'Crear clientes' },
  { clave: 'clientes.actualizar', etiqueta: 'Editar y archivar clientes' },
  { clave: 'clientes.eliminar', etiqueta: 'Eliminar clientes sin historial (creados por error)' },
  { clave: 'clientes.ver-todas-sucursales', etiqueta: 'Ver clientes de todas las sucursales (no solo la propia)' },
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
  { clave: 'mediciones.leer', etiqueta: 'Ver seguimiento físico de clientes' },
  { clave: 'mediciones.crear', etiqueta: 'Registrar mediciones corporales' },
  { clave: 'mediciones.actualizar', etiqueta: 'Editar mediciones corporales' },
  { clave: 'mediciones.eliminar', etiqueta: 'Eliminar mediciones corporales' },
];

interface SeedEmpresaBaseOptions {
  prisma: PrismaClient;
  empresaNombre: string;
  dominio: string;
  adminNombre: string;
  adminEmail: string;
  adminPassword: string;
}

/**
 * Crea (o actualiza de forma idempotente) el catálogo de permisos y módulos,
 * la empresa, el rol Admin con todos los permisos, y el usuario administrador.
 * Es la base mínima reutilizable para levantar el core en cualquier base nueva.
 */
export async function seedEmpresaBase(opts: SeedEmpresaBaseOptions) {
  const { prisma, empresaNombre, dominio, adminNombre, adminEmail, adminPassword } = opts;

  const permisos = await Promise.all(
    CATALOGO_PERMISOS.map((permiso) =>
      prisma.permiso.upsert({
        where: { clave: permiso.clave },
        update: {},
        create: permiso,
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

  return { empresa, admin, rolAdmin, permisos };
}
