CREATE TABLE "CategoriaProducto" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CategoriaProducto_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CategoriaProducto_empresaId_nombre_key" ON "CategoriaProducto"("empresaId", "nombre");

ALTER TABLE "CategoriaProducto" ADD CONSTRAINT "CategoriaProducto_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductoServicio" ADD COLUMN "categoriaId" TEXT;
ALTER TABLE "ProductoServicio" ADD COLUMN "costo" DECIMAL(10,2);
ALTER TABLE "ProductoServicio" ADD COLUMN "activo" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "ProductoServicio" ADD CONSTRAINT "ProductoServicio_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "CategoriaProducto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
