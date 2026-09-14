-- AlterTable
ALTER TABLE "EmpresaModulo" ADD COLUMN "habilitado" BOOLEAN NOT NULL DEFAULT true;

-- Respaldo de datos: las empresas que ya existen quedan con todo su catálogo
-- habilitado (nada se les restringe de golpe). Las empresas creadas DESPUÉS de
-- esta migración no reciben filas automáticas — arrancan sin módulos hasta que
-- el super-admin les habilite alguno explícitamente.
INSERT INTO "EmpresaModulo" ("empresaId", "moduloId", "activo", "habilitado")
SELECT e."id", m."id", false, true
FROM "Empresa" e
CROSS JOIN "Modulo" m
WHERE NOT EXISTS (
  SELECT 1 FROM "EmpresaModulo" em
  WHERE em."empresaId" = e."id" AND em."moduloId" = m."id"
);
