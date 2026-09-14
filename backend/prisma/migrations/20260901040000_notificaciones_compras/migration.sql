-- Notificaciones
CREATE TABLE "Notificacion" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "enlace" TEXT,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Notificacion_empresaId_usuarioId_leida_idx" ON "Notificacion"("empresaId", "usuarioId", "leida");

-- Proveedores
CREATE TABLE "Proveedor" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "contacto" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "notas" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Proveedor_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Proveedor" ADD CONSTRAINT "Proveedor_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Órdenes de compra
CREATE TABLE "OrdenCompra" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "total" DECIMAL(10,2) NOT NULL,
    "notas" TEXT,
    "fechaRecepcion" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrdenCompra_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "OrdenCompraItem" (
    "id" TEXT NOT NULL,
    "ordenCompraId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnit" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "OrdenCompraItem_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "OrdenCompraItem" ADD CONSTRAINT "OrdenCompraItem_ordenCompraId_fkey" FOREIGN KEY ("ordenCompraId") REFERENCES "OrdenCompra"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrdenCompraItem" ADD CONSTRAINT "OrdenCompraItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "ProductoServicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- MovimientoCuenta: vínculo opcional a la Orden de compra que lo generó
ALTER TABLE "MovimientoCuenta" ADD COLUMN "ordenCompraId" TEXT;

ALTER TABLE "MovimientoCuenta" ADD CONSTRAINT "MovimientoCuenta_ordenCompraId_fkey" FOREIGN KEY ("ordenCompraId") REFERENCES "OrdenCompra"("id") ON DELETE CASCADE ON UPDATE CASCADE;
