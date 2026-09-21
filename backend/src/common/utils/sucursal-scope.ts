export const PERMISO_VER_TODAS_SUCURSALES = 'clientes.ver-todas-sucursales';

export function puedeVerTodasSucursales(permisosVisor: string[]): boolean {
  return permisosVisor.includes(PERMISO_VER_TODAS_SUCURSALES);
}

/**
 * Filtro de Prisma para el campo `sucursalId` de Cliente, según lo que puede ver el visor.
 * Si no puede ver todas las sucursales y no tiene una asignada (cuenta mal configurada),
 * el filtro es imposible de cumplir: no ve ningún cliente en vez de ver todo por accidente.
 */
export function filtroSucursalCliente(
  permisosVisor: string[],
  sucursalIdVisor: string | null,
): { sucursalId?: string } {
  if (puedeVerTodasSucursales(permisosVisor)) return {};
  return { sucursalId: sucursalIdVisor ?? '__sin-sucursal-asignada__' };
}
