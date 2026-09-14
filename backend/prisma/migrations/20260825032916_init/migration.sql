-- CreateTable
CREATE TABLE "Empresa" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "logoUrl" TEXT,
    "colorPrimario" TEXT DEFAULT '#0F172A',
    "dominio" TEXT,
    "zonaHoraria" TEXT NOT NULL DEFAULT 'America/Lima',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sucursal" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Sucursal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rol" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "Rol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsuarioRol" (
    "usuarioId" TEXT NOT NULL,
    "rolId" TEXT NOT NULL,

    CONSTRAINT "UsuarioRol_pkey" PRIMARY KEY ("usuarioId","rolId")
);

-- CreateTable
CREATE TABLE "Permiso" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "etiqueta" TEXT NOT NULL,

    CONSTRAINT "Permiso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolPermiso" (
    "rolId" TEXT NOT NULL,
    "permisoId" TEXT NOT NULL,

    CONSTRAINT "RolPermiso_pkey" PRIMARY KEY ("rolId","permisoId")
);

-- CreateTable
CREATE TABLE "Modulo" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "Modulo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmpresaModulo" (
    "empresaId" TEXT NOT NULL,
    "moduloId" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "EmpresaModulo_pkey" PRIMARY KEY ("empresaId","moduloId")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT,
    "telefono" TEXT,
    "atributosExtra" JSONB,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductoServicio" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "precio" DECIMAL(10,2) NOT NULL,
    "stock" INTEGER,
    "atributosExtra" JSONB,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductoServicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Orden" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "clienteId" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "total" DECIMAL(10,2) NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Orden_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrdenItem" (
    "id" TEXT NOT NULL,
    "ordenId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnit" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "OrdenItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntidadDinamica" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "EntidadDinamica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampoDinamico" (
    "id" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "etiqueta" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "requerido" BOOLEAN NOT NULL DEFAULT false,
    "opciones" JSONB,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CampoDinamico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroDinamico" (
    "id" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "valores" JSONB NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistroDinamico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Empresa_dominio_key" ON "Empresa"("dominio");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Permiso_clave_key" ON "Permiso"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "Modulo_clave_key" ON "Modulo"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "EntidadDinamica_empresaId_clave_key" ON "EntidadDinamica"("empresaId", "clave");

-- CreateIndex
CREATE UNIQUE INDEX "CampoDinamico_entidadId_clave_key" ON "CampoDinamico"("entidadId", "clave");

-- AddForeignKey
ALTER TABLE "Sucursal" ADD CONSTRAINT "Sucursal_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rol" ADD CONSTRAINT "Rol_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioRol" ADD CONSTRAINT "UsuarioRol_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsuarioRol" ADD CONSTRAINT "UsuarioRol_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES "Rol"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolPermiso" ADD CONSTRAINT "RolPermiso_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES "Rol"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolPermiso" ADD CONSTRAINT "RolPermiso_permisoId_fkey" FOREIGN KEY ("permisoId") REFERENCES "Permiso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmpresaModulo" ADD CONSTRAINT "EmpresaModulo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmpresaModulo" ADD CONSTRAINT "EmpresaModulo_moduloId_fkey" FOREIGN KEY ("moduloId") REFERENCES "Modulo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductoServicio" ADD CONSTRAINT "ProductoServicio_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orden" ADD CONSTRAINT "Orden_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orden" ADD CONSTRAINT "Orden_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenItem" ADD CONSTRAINT "OrdenItem_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "Orden"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntidadDinamica" ADD CONSTRAINT "EntidadDinamica_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampoDinamico" ADD CONSTRAINT "CampoDinamico_entidadId_fkey" FOREIGN KEY ("entidadId") REFERENCES "EntidadDinamica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroDinamico" ADD CONSTRAINT "RegistroDinamico_entidadId_fkey" FOREIGN KEY ("entidadId") REFERENCES "EntidadDinamica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
