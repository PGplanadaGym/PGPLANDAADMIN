import { useEffect, useState } from 'react'
import { axiosInstance } from '../../lib/axios'

interface RegistroAuditoria {
  id: string
  accion: string
  entidad: string
  entidadId: string | null
  detalle: Record<string, unknown> | null
  creadoEn: string
  usuario: { nombre: string; email: string } | null
}

const ACCION_LABEL: Record<string, string> = {
  crear: 'Creó',
  actualizar: 'Actualizó',
  eliminar: 'Eliminó',
  activar: 'Activó',
  desactivar: 'Desactivó',
}

const ACCION_COLOR: Record<string, string> = {
  crear: 'bg-emerald-100 text-emerald-700',
  actualizar: 'bg-blue-100 text-blue-700',
  eliminar: 'bg-red-100 text-red-700',
  activar: 'bg-emerald-100 text-emerald-700',
  desactivar: 'bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]',
}

function entidadLegible(entidad: string) {
  if (entidad.startsWith('entidad_dinamica:')) {
    return `entidad "${entidad.split(':')[1]}"`
  }
  return entidad
}

export function AuditoriaPage() {
  const [registros, setRegistros] = useState<RegistroAuditoria[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    axiosInstance
      .get<RegistroAuditoria[]>('/auditoria')
      .then(({ data }) => setRegistros(data))
      .finally(() => setCargando(false))
  }, [])

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--color-text)]">Actividad</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Registro de las acciones importantes realizadas en tu empresa.
      </p>

      <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-2">Fecha</th>
              <th className="px-4 py-2">Usuario</th>
              <th className="px-4 py-2">Acción</th>
              <th className="px-4 py-2">Sobre</th>
            </tr>
          </thead>
          <tbody>
            {registros.map((registro) => (
              <tr key={registro.id} className="border-t border-[var(--color-border)]">
                <td className="whitespace-nowrap px-4 py-2 text-[var(--color-text-muted)]">
                  {new Date(registro.creadoEn).toLocaleString()}
                </td>
                <td className="px-4 py-2">{registro.usuario?.nombre ?? '—'}</td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      ACCION_COLOR[registro.accion] ?? 'bg-[var(--color-bg)] text-[var(--color-text-muted)]'
                    }`}
                  >
                    {ACCION_LABEL[registro.accion] ?? registro.accion}
                  </span>
                </td>
                <td className="px-4 py-2 text-[var(--color-text-muted)]">
                  {entidadLegible(registro.entidad)}
                </td>
              </tr>
            ))}
            {registros.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-[var(--color-text-faint)]">
                  {cargando ? 'Cargando…' : 'Sin actividad registrada todavía'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
