-- Agrega nombres/apellidos como columnas nullable primero (hay clientes existentes)
ALTER TABLE "Cliente" ADD COLUMN "nombres" TEXT;
ALTER TABLE "Cliente" ADD COLUMN "apellidos" TEXT;

-- Backfill: separa el "nombre" actual en la primera palabra (nombres) y el resto (apellidos).
-- Si no hay espacio, todo el nombre queda en "nombres" y "apellidos" se deja vacío.
UPDATE "Cliente"
SET
  "nombres" = CASE
    WHEN position(' ' in "nombre") > 0 THEN substring("nombre" from 1 for position(' ' in "nombre") - 1)
    ELSE "nombre"
  END,
  "apellidos" = CASE
    WHEN position(' ' in "nombre") > 0 THEN trim(substring("nombre" from position(' ' in "nombre") + 1))
    ELSE ''
  END;

ALTER TABLE "Cliente" ALTER COLUMN "nombres" SET NOT NULL;
ALTER TABLE "Cliente" ALTER COLUMN "apellidos" SET NOT NULL;
