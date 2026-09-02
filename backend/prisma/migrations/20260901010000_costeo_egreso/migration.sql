-- DropIndex: un costeo ahora puede tener dos movimientos (el ingreso de la venta
-- y el egreso del costo real en materiales/otros), ya no es 1:1.
DROP INDEX "MovimientoCuenta_costeoProyectoId_key";
