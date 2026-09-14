-- AlterTable
ALTER TABLE "Modulo" ADD COLUMN "precioMensual" DECIMAL(10,2);

-- Precios sugeridos por defecto (editables luego desde el panel de administración)
UPDATE "Modulo" SET "precioMensual" = 3 WHERE "clave" = 'clientes';
UPDATE "Modulo" SET "precioMensual" = 6 WHERE "clave" = 'citas';
UPDATE "Modulo" SET "precioMensual" = 8 WHERE "clave" = 'inventario';
UPDATE "Modulo" SET "precioMensual" = 5 WHERE "clave" = 'asistencia';
UPDATE "Modulo" SET "precioMensual" = 5 WHERE "clave" = 'cuentas';
UPDATE "Modulo" SET "precioMensual" = 6 WHERE "clave" = 'costeo';
UPDATE "Modulo" SET "precioMensual" = 8 WHERE "clave" = 'ventas';
UPDATE "Modulo" SET "precioMensual" = 6 WHERE "clave" = 'compras';
UPDATE "Modulo" SET "precioMensual" = 6 WHERE "clave" = 'sucursales';
UPDATE "Modulo" SET "precioMensual" = 7 WHERE "clave" = 'nomina';
