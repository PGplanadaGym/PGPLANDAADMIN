-- CreateTable
CREATE TABLE "Marcacion" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "latitud" DOUBLE PRECISION,
    "longitud" DOUBLE PRECISION,
    "precision" DOUBLE PRECISION,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Marcacion_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Marcacion" ADD CONSTRAINT "Marcacion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Marcacion" ADD CONSTRAINT "Marcacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
