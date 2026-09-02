import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { CanAccess } from '@refinedev/core'
import { axiosInstance } from '../../lib/axios'
import { PrimaryButton } from '../../components/ui/PrimaryButton'

const TIPOS_RECURSO = [
  { value: 'persona', label: 'Persona' },
  { value: 'sala', label: 'Sala' },
  { value: 'equipo', label: 'Equipo' },
] as const

const DIAS_SEMANA = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
]

interface HorarioAtencion {
  id: string
  diaSemana: number
  horaInicio: string
  horaFin: string
}

interface Sucursal {
  id: string
  nombre: string
}

interface Recurso {
  id: string
  nombre: string
  tipo: string
  activo: boolean
  horarios: HorarioAtencion[]
  sucursal: Sucursal | null
}

interface DiaHorarioForm {
  activo: boolean
  horaInicio: string
  horaFin: string
}

function horarioFormInicial(horarios: HorarioAtencion[]): DiaHorarioForm[] {
  return DIAS_SEMANA.map((dia) => {
    const existente = horarios.find((h) => h.diaSemana === dia.value)
    return {
      activo: !!existente,
      horaInicio: existente?.horaInicio ?? '09:00',
      horaFin: existente?.horaFin ?? '18:00',
    }
  })
}

export function RecursosPage() {
  const [recursos, setRecursos] = useState<Recurso[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [loading, setLoading] = useState(true)
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<(typeof TIPOS_RECURSO)[number]['value']>('persona')
  const [sucursalId, setSucursalId] = useState('')
  const [creando, setCreando] = useState(false)
  const [recursoHorario, setRecursoHorario] = useState<Recurso | null>(null)
  const [formHorario, setFormHorario] = useState<DiaHorarioForm[]>([])
  const [guardandoHorario, setGuardandoHorario] = useState(false)

  const cargar = async () => {
    setLoading(true)
    try {
      const { data } = await axiosInstance.get<Recurso[]>('/recursos')
      setRecursos(data)
    } catch {
      toast.error('No se pudieron cargar los recursos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargar()
    axiosInstance
      .get<Sucursal[]>('/sucursales')
      .then(({ data }) => setSucursales(data))
      .catch(() => {
        /* módulo Sucursales puede no estar activo */
      })
  }, [])

  const crear = async () => {
    if (!nombre.trim()) return
    setCreando(true)
    try {
      await axiosInstance.post('/recursos', { nombre, tipo, sucursalId: sucursalId || undefined })
      setNombre('')
      setSucursalId('')
      toast.success('Recurso creado')
      await cargar()
    } catch {
      toast.error('No se pudo crear el recurso')
    } finally {
      setCreando(false)
    }
  }

  const abrirHorario = (recurso: Recurso) => {
    setRecursoHorario(recurso)
    setFormHorario(horarioFormInicial(recurso.horarios))
  }

  const guardarHorario = async () => {
    if (!recursoHorario) return
    setGuardandoHorario(true)
    try {
      const horarios = formHorario
        .map((dia, index) => ({ ...dia, diaSemana: DIAS_SEMANA[index].value }))
        .filter((dia) => dia.activo)
        .map(({ diaSemana, horaInicio, horaFin }) => ({ diaSemana, horaInicio, horaFin }))

      await axiosInstance.post(`/recursos/${recursoHorario.id}/horarios`, { horarios })
      toast.success('Horario actualizado')
      setRecursoHorario(null)
      await cargar()
    } catch {
      toast.error('No se pudo guardar el horario')
    } finally {
      setGuardandoHorario(false)
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--color-text)]">Recursos</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Personas, salas o equipos que se pueden agendar (por ejemplo: un estilista, una cancha,
        un box de atención).
      </p>

      <CanAccess resource="recursos" action="create">
        <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)] p-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
              Nombre
            </label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
              placeholder="Ej: Recepción, Cancha 1…"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
              Tipo
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as typeof tipo)}
              className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
            >
              {TIPOS_RECURSO.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          {sucursales.length > 0 && (
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                Sucursal
              </label>
              <select
                value={sucursalId}
                onChange={(e) => setSucursalId(e.target.value)}
                className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
              >
                <option value="">Sin asignar</option>
                {sucursales.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}
          <PrimaryButton type="button" onClick={crear} disabled={creando || !nombre.trim()}>
            {creando ? 'Creando…' : 'Agregar recurso'}
          </PrimaryButton>
        </div>
      </CanAccess>

      <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Tipo</th>
              {sucursales.length > 0 && <th className="px-4 py-2">Sucursal</th>}
              <th className="px-4 py-2">Horario</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {recursos.map((recurso) => (
              <tr key={recurso.id} className="border-t border-[var(--color-border)]">
                <td className="px-4 py-2">{recurso.nombre}</td>
                <td className="px-4 py-2 capitalize">{recurso.tipo}</td>
                {sucursales.length > 0 && (
                  <td className="px-4 py-2 text-[var(--color-text-muted)]">
                    {recurso.sucursal?.nombre ?? '—'}
                  </td>
                )}
                <td className="px-4 py-2 text-[var(--color-text-muted)]">
                  {recurso.horarios.length > 0
                    ? `${recurso.horarios.length} día(s) configurado(s)`
                    : 'Sin configurar'}
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => abrirHorario(recurso)}
                    className="rounded px-2 py-1 text-sm text-[var(--color-primario-legible)] hover:bg-[var(--color-bg-subtle)]"
                  >
                    Editar horario
                  </button>
                </td>
              </tr>
            ))}
            {recursos.length === 0 && (
              <tr>
                <td
                  colSpan={sucursales.length > 0 ? 5 : 4}
                  className="px-4 py-6 text-center text-[var(--color-text-faint)]"
                >
                  {loading ? 'Cargando…' : 'Sin recursos todavía'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {recursoHorario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-[var(--color-bg-card)] p-6 shadow-lg">
            <h2 className="text-base font-semibold text-[var(--color-text)]">
              Horario de {recursoHorario.nombre}
            </h2>
            <div className="mt-4 flex flex-col gap-2">
              {DIAS_SEMANA.map((dia, index) => (
                <div key={dia.value} className="flex items-center gap-2">
                  <label className="flex w-28 shrink-0 items-center gap-2 text-sm text-[var(--color-text)]">
                    <input
                      type="checkbox"
                      checked={formHorario[index]?.activo ?? false}
                      onChange={(e) =>
                        setFormHorario((prev) =>
                          prev.map((d, i) => (i === index ? { ...d, activo: e.target.checked } : d)),
                        )
                      }
                    />
                    {dia.label}
                  </label>
                  <input
                    type="time"
                    value={formHorario[index]?.horaInicio ?? '09:00'}
                    disabled={!formHorario[index]?.activo}
                    onChange={(e) =>
                      setFormHorario((prev) =>
                        prev.map((d, i) => (i === index ? { ...d, horaInicio: e.target.value } : d)),
                      )
                    }
                    className="rounded-lg border border-[var(--color-border)] px-2 py-1 text-sm disabled:opacity-40"
                  />
                  <span className="text-[var(--color-text-muted)]">a</span>
                  <input
                    type="time"
                    value={formHorario[index]?.horaFin ?? '18:00'}
                    disabled={!formHorario[index]?.activo}
                    onChange={(e) =>
                      setFormHorario((prev) =>
                        prev.map((d, i) => (i === index ? { ...d, horaFin: e.target.value } : d)),
                      )
                    }
                    className="rounded-lg border border-[var(--color-border)] px-2 py-1 text-sm disabled:opacity-40"
                  />
                </div>
              ))}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRecursoHorario(null)}
                className="rounded px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]"
              >
                Cancelar
              </button>
              <PrimaryButton type="button" onClick={guardarHorario} disabled={guardandoHorario}>
                {guardandoHorario ? 'Guardando…' : 'Guardar'}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
