-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "calidad" TEXT,
    "unidadMedida" TEXT NOT NULL,
    "precioUnitario" DECIMAL(10,2) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CosteoProyecto" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "clienteId" TEXT,
    "tarifaHora" DECIMAL(10,2) NOT NULL,
    "margenPorcentaje" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "otrosCostos" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "notas" TEXT,
    "usuarioId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CosteoProyecto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CosteoParte" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "horas" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CosteoParte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CosteoParteMaterial" (
    "id" TEXT NOT NULL,
    "parteId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "cantidad" DECIMAL(10,2) NOT NULL,
    "precioUnitarioSnapshot" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "CosteoParteMaterial_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CosteoProyecto" ADD CONSTRAINT "CosteoProyecto_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CosteoProyecto" ADD CONSTRAINT "CosteoProyecto_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CosteoProyecto" ADD CONSTRAINT "CosteoProyecto_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CosteoParte" ADD CONSTRAINT "CosteoParte_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "CosteoProyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CosteoParteMaterial" ADD CONSTRAINT "CosteoParteMaterial_parteId_fkey" FOREIGN KEY ("parteId") REFERENCES "CosteoParte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CosteoParteMaterial" ADD CONSTRAINT "CosteoParteMaterial_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
