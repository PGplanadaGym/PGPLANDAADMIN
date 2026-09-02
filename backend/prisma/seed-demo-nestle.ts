import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { seedEmpresaBase } from './seed-lib';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DOMINIO = 'nestle-demo.local';

async function crearRolConPermisos(empresaId: string, nombre: string, claves: string[]) {
  const rol = await prisma.rol.create({
    data: { empresaId, nombre, descripcion: `Rol de ${nombre.toLowerCase()}` },
  });
  const permisos = await prisma.permiso.findMany({ where: { clave: { in: claves } } });
  await prisma.rolPermiso.createMany({
    data: permisos.map((p) => ({ rolId: rol.id, permisoId: p.id })),
  });
  return rol;
}

async function crearEmpleado(
  empresaId: string,
  nombre: string,
  email: string,
  cargo: string,
  rolId: string,
  sucursalId?: string,
) {
  const passwordHash = await bcrypt.hash('Empleado123!', 10);
  const usuario = await prisma.usuario.create({
    data: { empresaId, nombre, email, passwordHash, cargo, sucursalId },
  });
  await prisma.usuarioRol.create({ data: { usuarioId: usuario.id, rolId } });
  return usuario;
}

async function crearProducto(
  empresaId: string,
  actorId: string,
  nombre: string,
  sku: string,
  precio: number,
  stockInicial: number,
  stockMinimo: number,
) {
  const producto = await prisma.productoServicio.create({
    data: { empresaId, tipo: 'producto', nombre, sku, precio, stockMinimo, unidadMedida: 'unidad', stock: 0 },
  });
  await prisma.movimientoStock.create({
    data: {
      empresaId,
      productoId: producto.id,
      tipo: 'entrada',
      cantidad: stockInicial,
      motivo: 'Stock inicial',
      usuarioId: actorId,
    },
  });
  return prisma.productoServicio.update({ where: { id: producto.id }, data: { stock: stockInicial } });
}

async function main() {
  const existente = await prisma.empresa.findUnique({ where: { dominio: DOMINIO } });
  if (existente) {
    console.log(`Ya existe una empresa con dominio "${DOMINIO}" (id: ${existente.id}). Nada que hacer.`);
    return;
  }

  const { empresa, admin } = await seedEmpresaBase({
    prisma,
    empresaNombre: 'Nestlé Ecuador (Demo)',
    dominio: DOMINIO,
    adminNombre: 'Administrador Nestlé',
    adminEmail: 'adminNestle@nestle-demo.local',
    adminPassword: 'Nestle123!',
    modulosActivos: ['clientes', 'inventario', 'ventas', 'compras', 'cuentas', 'sucursales', 'nomina'],
  });

  // ---------- Sucursales ----------
  const sucursalQuito = await prisma.sucursal.create({
    data: { empresaId: empresa.id, nombre: 'Planta Quito', direccion: 'Av. Panamericana Norte km 12, Quito' },
  });
  const sucursalGuayaquil = await prisma.sucursal.create({
    data: { empresaId: empresa.id, nombre: 'Bodega Guayaquil', direccion: 'Vía a Daule km 8, Guayaquil' },
  });

  // ---------- Roles personalizados (permisos acotados, no todo el catálogo) ----------
  const rolRecepcionista = await crearRolConPermisos(empresa.id, 'Recepcionista', [
    'clientes.leer',
    'clientes.crear',
  ]);
  const rolBodeguero = await crearRolConPermisos(empresa.id, 'Bodeguero', [
    'productos.leer',
    'productos.crear',
    'productos.movimientos.crear',
    'proveedores.leer',
    'compras.leer',
    'compras.crear',
  ]);
  const rolVendedor = await crearRolConPermisos(empresa.id, 'Vendedor', [
    'ventas.leer',
    'ventas.crear',
    'productos.leer',
    'clientes.leer',
    'clientes.crear',
  ]);
  const rolContador = await crearRolConPermisos(empresa.id, 'Contador', [
    'cuentas.leer',
    'cuentas.crear',
    'cuentas.actualizar',
    'nomina.leer',
    'nomina.crear',
    'compras.leer',
  ]);

  // ---------- Empleados ----------
  const recepcionista = await crearEmpleado(
    empresa.id,
    'María Fernández',
    'recepcion@nestle-demo.local',
    'Recepcionista',
    rolRecepcionista.id,
    sucursalQuito.id,
  );
  const bodeguero = await crearEmpleado(
    empresa.id,
    'Carlos Andrade',
    'bodega@nestle-demo.local',
    'Jefe de Bodega',
    rolBodeguero.id,
    sucursalGuayaquil.id,
  );
  const vendedor = await crearEmpleado(
    empresa.id,
    'Lucía Paredes',
    'ventas@nestle-demo.local',
    'Ejecutiva de Ventas',
    rolVendedor.id,
    sucursalQuito.id,
  );
  const contador = await crearEmpleado(
    empresa.id,
    'Jorge Salazar',
    'contabilidad@nestle-demo.local',
    'Contador General',
    rolContador.id,
    sucursalQuito.id,
  );

  // ---------- Productos con stock (uno queda a propósito bajo el mínimo) ----------
  const nescafe = await crearProducto(empresa.id, admin.id, 'Nescafé Clásico 200g', 'NES-001', 4.5, 500, 50);
  const nido = await crearProducto(empresa.id, admin.id, 'Leche Nido Lata 800g', 'NID-002', 8.75, 300, 30);
  const kitkat = await crearProducto(empresa.id, admin.id, 'KitKat Chocolate 4 barras', 'KTK-003', 1.25, 20, 50);
  const agua = await crearProducto(empresa.id, admin.id, 'Agua Pure Life 1L', 'PWL-004', 0.75, 1000, 100);

  // ---------- Proveedor ----------
  const proveedor = await prisma.proveedor.create({
    data: {
      empresaId: empresa.id,
      nombre: 'Distribuidora Andina S.A.',
      telefono: '042345678',
      email: 'ventas@distandina.ec',
    },
  });

  // ---------- Clientes ----------
  const clienteFavorita = await prisma.cliente.create({
    data: { empresaId: empresa.id, nombre: 'Supermercado La Favorita', email: 'compras@favorita.ec' },
  });
  const clienteAhorro = await prisma.cliente.create({
    data: { empresaId: empresa.id, nombre: 'Tienda El Ahorro', email: 'pedidos@elahorro.ec' },
  });

  // ---------- Categorías de cuenta ----------
  const catVentas = await prisma.categoriaMovimiento.create({
    data: { empresaId: empresa.id, tipo: 'ingreso', nombre: 'Ventas de productos' },
  });
  const catCompras = await prisma.categoriaMovimiento.create({
    data: { empresaId: empresa.id, tipo: 'egreso', nombre: 'Compra de mercadería' },
  });
  const catSueldos = await prisma.categoriaMovimiento.create({
    data: { empresaId: empresa.id, tipo: 'egreso', nombre: 'Sueldos' },
  });

  // ---------- Venta 1: La Favorita compra Nescafé + Leche Nido (registrada por la vendedora) ----------
  const totalVenta1 = 50 * 4.5 + 20 * 8.75; // 400
  const venta1 = await prisma.orden.create({
    data: {
      empresaId: empresa.id,
      clienteId: clienteFavorita.id,
      usuarioId: vendedor.id,
      total: totalVenta1,
      items: {
        create: [
          { productoId: nescafe.id, cantidad: 50, precioUnit: 4.5 },
          { productoId: nido.id, cantidad: 20, precioUnit: 8.75 },
        ],
      },
    },
  });
  await prisma.movimientoStock.createMany({
    data: [
      { empresaId: empresa.id, productoId: nescafe.id, tipo: 'salida', cantidad: -50, motivo: 'Venta', usuarioId: vendedor.id },
      { empresaId: empresa.id, productoId: nido.id, tipo: 'salida', cantidad: -20, motivo: 'Venta', usuarioId: vendedor.id },
    ],
  });
  await prisma.productoServicio.update({ where: { id: nescafe.id }, data: { stock: 500 - 50 } });
  await prisma.productoServicio.update({ where: { id: nido.id }, data: { stock: 300 - 20 } });
  await prisma.movimientoCuenta.create({
    data: {
      empresaId: empresa.id,
      tipo: 'ingreso',
      categoriaId: catVentas.id,
      monto: totalVenta1,
      fecha: new Date(),
      descripcion: `Venta #${venta1.id.slice(0, 8)}`,
      clienteId: clienteFavorita.id,
      usuarioId: vendedor.id,
      ordenId: venta1.id,
    },
  });

  // ---------- Venta 2: El Ahorro compra Agua + KitKat (deja el KitKat aún más bajo) ----------
  const totalVenta2 = 100 * 0.75 + 10 * 1.25; // 87.5
  const venta2 = await prisma.orden.create({
    data: {
      empresaId: empresa.id,
      clienteId: clienteAhorro.id,
      usuarioId: vendedor.id,
      total: totalVenta2,
      items: {
        create: [
          { productoId: agua.id, cantidad: 100, precioUnit: 0.75 },
          { productoId: kitkat.id, cantidad: 10, precioUnit: 1.25 },
        ],
      },
    },
  });
  await prisma.movimientoStock.createMany({
    data: [
      { empresaId: empresa.id, productoId: agua.id, tipo: 'salida', cantidad: -100, motivo: 'Venta', usuarioId: vendedor.id },
      { empresaId: empresa.id, productoId: kitkat.id, tipo: 'salida', cantidad: -10, motivo: 'Venta', usuarioId: vendedor.id },
    ],
  });
  await prisma.productoServicio.update({ where: { id: agua.id }, data: { stock: 1000 - 100 } });
  await prisma.productoServicio.update({ where: { id: kitkat.id }, data: { stock: 20 - 10 } });
  await prisma.movimientoCuenta.create({
    data: {
      empresaId: empresa.id,
      tipo: 'ingreso',
      categoriaId: catVentas.id,
      monto: totalVenta2,
      fecha: new Date(),
      descripcion: `Venta #${venta2.id.slice(0, 8)}`,
      clienteId: clienteAhorro.id,
      usuarioId: vendedor.id,
      ordenId: venta2.id,
    },
  });

  // ---------- Orden de compra PENDIENTE: el bodeguero ya pidió reponer KitKat, pero aún no llega ----------
  // Se deja "pendiente" a propósito: el stock de KitKat sigue bajo el mínimo para que se vea
  // la alerta en Productos/Dashboard, y para que puedas probar tú mismo el botón "Recibir".
  const totalCompra = 200 * 0.9; // 180
  await prisma.ordenCompra.create({
    data: {
      empresaId: empresa.id,
      proveedorId: proveedor.id,
      usuarioId: bodeguero.id,
      estado: 'pendiente',
      total: totalCompra,
      items: { create: [{ productoId: kitkat.id, cantidad: 200, precioUnit: 0.9 }] },
    },
  });

  // ---------- Nómina del mes para cada empleado (registrada por el contador) ----------
  const hoy = new Date();
  const periodo = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  const sueldos: [string, number][] = [
    [recepcionista.id, 450],
    [bodeguero.id, 500],
    [vendedor.id, 480],
    [contador.id, 600],
  ];
  for (const [empleadoId, sueldoBase] of sueldos) {
    const pago = await prisma.pagoNomina.create({
      data: {
        empresaId: empresa.id,
        empleadoId,
        periodo,
        sueldoBase,
        totalPagado: sueldoBase,
        fechaPago: hoy,
        registradoPorId: contador.id,
      },
    });
    await prisma.movimientoCuenta.create({
      data: {
        empresaId: empresa.id,
        tipo: 'egreso',
        categoriaId: catSueldos.id,
        monto: sueldoBase,
        fecha: hoy,
        descripcion: `Nómina ${periodo}`,
        usuarioId: contador.id,
        pagoNominaId: pago.id,
      },
    });
  }

  console.log('Empresa demo "Nestlé Ecuador" creada:');
  console.log(`  Admin: adminNestle@nestle-demo.local / Nestle123!`);
  console.log(`  Empleados (todos con contraseña Empleado123!):`);
  console.log(`    recepcion@nestle-demo.local      -> rol Recepcionista`);
  console.log(`    bodega@nestle-demo.local         -> rol Bodeguero`);
  console.log(`    ventas@nestle-demo.local         -> rol Vendedor`);
  console.log(`    contabilidad@nestle-demo.local   -> rol Contador`);
  console.log(`  Sucursales: Planta Quito, Bodega Guayaquil`);
  console.log(`  Productos: Nescafé (450), Leche Nido (280), KitKat (10, bajo el mínimo de 50), Agua (900)`);
  console.log(`  2 ventas, 1 orden de compra PENDIENTE (pruébala con "Recibir"), ${sueldos.length} pagos de nómina de ${periodo}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
