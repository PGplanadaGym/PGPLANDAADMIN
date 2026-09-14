ALTER TABLE "Activo" ADD COLUMN "garantiaHasta" TIMESTAMP(3);

CREATE TABLE "MantenimientoActivo" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "activoId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "costo" DECIMAL(10,2),
    "usuarioId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MantenimientoActivo_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MantenimientoActivo_activoId_fecha_idx" ON "MantenimientoActivo"("activoId", "fecha");

ALTER TABLE "MantenimientoActivo" ADD CONSTRAINT "MantenimientoActivo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MantenimientoActivo" ADD CONSTRAINT "MantenimientoActivo_activoId_fkey" FOREIGN KEY ("activoId") REFERENCES "Activo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MantenimientoActivo" ADD CONSTRAINT "MantenimientoActivo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
