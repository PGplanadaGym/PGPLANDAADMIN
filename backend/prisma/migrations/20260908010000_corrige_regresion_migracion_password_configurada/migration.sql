-- Corrige una regresión introducida sin querer por la migración
-- 20260904191742_add_password_configurada (probablemente generada por
-- `prisma migrate dev` diffeando contra un schema.prisma que nunca había
-- anotado explícitamente estos dos detalles, aunque sí existían en la base):
--
-- 1) El FK de Notificacion.usuarioId había quedado en ON DELETE SET NULL en vez
--    de ON DELETE CASCADE. Como el sistema trata usuarioId = NULL como "notificación
--    para toda la empresa", si algún día se borra un usuario sus notificaciones
--    personales quedarían huérfanas y se le mostrarían a todos los demás usuarios
--    en vez de desaparecer con él.
-- 2) Dos índices se habían borrado sin volver a crearse, afectando el rendimiento
--    de consultas frecuentes (contador de notificaciones, listado de nómina por periodo).

-- Notificacion: restaurar ON DELETE CASCADE
ALTER TABLE "Notificacion" DROP CONSTRAINT "Notificacion_usuarioId_fkey";
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Recrear los índices perdidos
CREATE INDEX "Notificacion_empresaId_usuarioId_leida_idx" ON "Notificacion"("empresaId", "usuarioId", "leida");
CREATE INDEX "PagoNomina_empresaId_periodo_idx" ON "PagoNomina"("empresaId", "periodo");
