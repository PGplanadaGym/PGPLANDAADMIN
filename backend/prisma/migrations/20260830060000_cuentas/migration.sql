-- CreateTable
CREATE TABLE "CategoriaMovimiento" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CategoriaMovimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoCuenta" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "descripcion" TEXT,
    "metodoPago" TEXT,
    "numeroComprobante" TEXT,
    "comprobanteUrl" TEXT,
    "clienteId" TEXT,
    "usuarioId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimientoCuenta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CategoriaMovimiento_empresaId_tipo_nombre_key" ON "CategoriaMovimiento"("empresaId", "tipo", "nombre");

-- AddForeignKey
ALTER TABLE "CategoriaMovimiento" ADD CONSTRAINT "CategoriaMovimiento_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCuenta" ADD CONSTRAINT "MovimientoCuenta_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCuenta" ADD CONSTRAINT "MovimientoCuenta_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "CategoriaMovimiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCuenta" ADD CONSTRAINT "MovimientoCuenta_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoCuenta" ADD CONSTRAINT "MovimientoCuenta_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
