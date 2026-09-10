// Paquetes por tipo de negocio: activan de una vez el set típico de módulos
// para ese rubro, en vez de tener que prenderlos uno por uno.
export const PLANTILLAS_NEGOCIO = [
  {
    clave: 'taller-comercio',
    nombre: 'Taller / comercio con inventario',
    descripcion: 'Vende productos, controla stock y compra a proveedores',
    modulos: ['clientes', 'inventario', 'ventas', 'compras', 'cuentas'],
  },
  {
    clave: 'citas-servicios',
    nombre: 'Servicios con reservas (academia, veterinaria, spa)',
    descripcion: 'Agenda citas, atiende clientes y controla asistencia del personal',
    modulos: ['clientes', 'citas', 'asistencia', 'cuentas'],
  },
  {
    clave: 'proyectos-costeo',
    nombre: 'Proyectos por encargo (ej. cosplay, diseño)',
    descripcion: 'Cotiza proyectos por partes y materiales, y lleva las cuentas',
    modulos: ['clientes', 'costeo', 'cuentas'],
  },
  {
    clave: 'multi-sucursal',
    nombre: 'Negocio con varias sucursales y personal',
    descripcion: 'Varios locales, empleados con nómina y control de asistencia',
    modulos: ['sucursales', 'nomina', 'asistencia', 'cuentas'],
  },
];
