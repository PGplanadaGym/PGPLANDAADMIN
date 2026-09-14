-- Orden: agrega usuario que realizó la venta, notas, y cambia default de estado
ALTER TABLE "Orden" ADD COLUMN "usuarioId" TEXT;
ALTER TABLE "Orden" ADD COLUMN "notas" TEXT;
ALTER TABLE "Orden" ALTER COLUMN "estado" SET DEFAULT 'completada';

UPDATE "Orden" o SET "usuarioId" = (
  SELECT u."id" FROM "Usuario" u WHERE u."empresaId" = o."empresaId" LIMIT 1
);

ALTER TABLE "Orden" ALTER COLUMN "usuarioId" SET NOT NULL;

ALTER TABLE "Orden" ADD CONSTRAINT "Orden_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- OrdenItem: itemId (sin relación real) -> productoId (FK a ProductoServicio)
ALTER TABLE "OrdenItem" RENAME COLUMN "itemId" TO "productoId";

ALTER TABLE "OrdenItem" ADD CONSTRAINT "OrdenItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "ProductoServicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- OrdenItem.ordenId ahora en cascada (borrar Orden borra sus items)
ALTER TABLE "OrdenItem" DROP CONSTRAINT "OrdenItem_ordenId_fkey";
ALTER TABLE "OrdenItem" ADD CONSTRAINT "OrdenItem_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "Orden"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- MovimientoCuenta: vínculo opcional a la Orden que lo generó (mismo patrón que costeoProyectoId)
ALTER TABLE "MovimientoCuenta" ADD COLUMN "ordenId" TEXT;

ALTER TABLE "MovimientoCuenta" ADD CONSTRAINT "MovimientoCuenta_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "Orden"("id") ON DELETE CASCADE ON UPDATE CASCADE;
