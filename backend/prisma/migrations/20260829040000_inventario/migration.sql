-- AlterTable
ALTER TABLE "ProductoServicio" ADD COLUMN "sku" TEXT;
ALTER TABLE "ProductoServicio" ADD COLUMN "stockMinimo" INTEGER;
ALTER TABLE "ProductoServicio" ADD COLUMN "unidadMedida" TEXT NOT NULL DEFAULT 'unidad';

-- CreateTable
CREATE TABLE "CategoriaActivo" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CategoriaActivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activo" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "categoriaActivoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "codigoInterno" TEXT,
    "numeroSerie" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'disponible',
    "valorCompra" DECIMAL(10,2),
    "fechaCompra" TIMESTAMP(3),
    "notas" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsignacionActivo" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "activoId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "clienteId" TEXT,
    "fechaAsignacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaDevolucion" TIMESTAMP(3),
    "notas" TEXT,
    "asignadoPorId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AsignacionActivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoStock" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "motivo" TEXT,
    "usuarioId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimientoStock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CategoriaActivo_empresaId_nombre_key" ON "CategoriaActivo"("empresaId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Activo_empresaId_codigoInterno_key" ON "Activo"("empresaId", "codigoInterno");

-- AddForeignKey
ALTER TABLE "CategoriaActivo" ADD CONSTRAINT "CategoriaActivo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activo" ADD CONSTRAINT "Activo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activo" ADD CONSTRAINT "Activo_categoriaActivoId_fkey" FOREIGN KEY ("categoriaActivoId") REFERENCES "CategoriaActivo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsignacionActivo" ADD CONSTRAINT "AsignacionActivo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsignacionActivo" ADD CONSTRAINT "AsignacionActivo_activoId_fkey" FOREIGN KEY ("activoId") REFERENCES "Activo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsignacionActivo" ADD CONSTRAINT "AsignacionActivo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsignacionActivo" ADD CONSTRAINT "AsignacionActivo_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsignacionActivo" ADD CONSTRAINT "AsignacionActivo_asignadoPorId_fkey" FOREIGN KEY ("asignadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoStock" ADD CONSTRAINT "MovimientoStock_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoStock" ADD CONSTRAINT "MovimientoStock_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "ProductoServicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoStock" ADD CONSTRAINT "MovimientoStock_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
