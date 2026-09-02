-- DropForeignKey
ALTER TABLE "MovimientoCuenta" DROP CONSTRAINT "MovimientoCuenta_costeoProyectoId_fkey";

-- AddForeignKey: eliminar un costeo ahora borra en cascada su(s) movimiento(s) de cuenta.
ALTER TABLE "MovimientoCuenta" ADD CONSTRAINT "MovimientoCuenta_costeoProyectoId_fkey" FOREIGN KEY ("costeoProyectoId") REFERENCES "CosteoProyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
