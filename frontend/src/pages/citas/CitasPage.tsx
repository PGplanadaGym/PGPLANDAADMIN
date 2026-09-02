import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Calendar,
  dateFnsLocalizer,
  type SlotInfo,
  type View,
} from 'react-big-calendar'
import dragAndDropModulo, {
  type EventInteractionArgs,
} from 'react-big-calendar/lib/addons/dragAndDrop'
import {
  format,
  parse,
  startOfWeek,
  getDay,
  startOfMonth,
  endOfMonth,
  endOfWeek,
  startOfDay,
  endOfDay,
  differenceInMinutes,
} from 'date-fns'
import { es } from 'date-fns/locale/es'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import { axiosInstance } from '../../lib/axios'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { useConfirm } from '../../components/ui/ConfirmDialog'
import { Spinner } from '../../components/ui/Spinner'

// Algunos bundlers entregan el default export de este subpath ya
// desenvuelto (la función) y otros lo dejan anidado en `.default`
// (interop CJS/ESM); este fallback funciona con ambos.
const withDragAndDrop =
  (dragAndDropModulo as unknown as { default?: typeof dragAndDropModulo }).default ??
  dragAndDropModulo

const DnDCalendar = withDragAndDrop<CitaEvento, object>(Calendar)

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: es }),
  getDay,
  locales: { es },
})

const MENSAJES_CALENDARIO = {
  next: 'Sig.',
  previous: 'Ant.',
  today: 'Hoy',
  month: 'Mes',
  week: 'Semana',
  day: 'Día',
  agenda: 'Agenda',
  date: 'Fecha',
  time: 'Hora',
  event: 'Cita',
  noEventsInRange: 'No hay citas en este rango',
  showMore: (total: number) => `+${total} más`,
}

const ESTADOS_CITA = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'confirmada', label: 'Confirmada' },
  { value: 'cancelada', label: 'Cancelada' },
  { value: 'completada', label: 'Completada' },
  { value: 'no_asistio', label: 'No asistió' },
] as const

interface Recurso {
  id: string
  nombre: string
}

interface TipoCita {
  id: string
  nombre: string
  duracionMinutos: number
  color: string
}

interface Cliente {
  id: string
  nombre: string
}

interface Cita {
  id: string
  recursoId: string
  tipoCitaId: string
  clienteId: string | null
  fechaInicio: string
  fechaFin: string
  estado: (typeof ESTADOS_CITA)[number]['value']
  notas: string | null
  recurso: Recurso
  tipoCita: TipoCita
  cliente: Cliente | null
}

interface CitaEvento {
  id: string
  title: string
  start: Date
  end: Date
  cita: Cita
}

interface FormularioCita {
  id: string | null
  fechaInicio: string
  duracionMinutos: number
  recursoId: string
  tipoCitaId: string
  clienteId: string
  notas: string
  estado: (typeof ESTADOS_CITA)[number]['value']
}

function rangoParaVista(fecha: Date, vista: View): { desde: Date; hasta: Date } {
  if (vista === 'month') {
    return {
      desde: startOfWeek(startOfMonth(fecha), { locale: es }),
      hasta: endOfWeek(endOfMonth(fecha), { locale: es }),
    }
  }
  if (vista === 'week') {
    return { desde: startOfWeek(fecha, { locale: es }), hasta: endOfWeek(fecha, { locale: es }) }
  }
  return { desde: startOfDay(fecha), hasta: endOfDay(fecha) }
}

function aInputLocal(fecha: Date) {
  return format(fecha, "yyyy-MM-dd'T'HH:mm")
}

function mensajeError(error: unknown, fallback: string) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  )
}

export function CitasPage() {
  const [fecha, setFecha] = useState(new Date())
  const [vista, setVista] = useState<View>('month')
  const [citas, setCitas] = useState<Cita[]>([])
  const [recursos, setRecursos] = useState<Recurso[]>([])
  const [tiposCita, setTiposCita] = useState<TipoCita[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [cargando, setCargando] = useState(true)

  const [form, setForm] = useState<FormularioCita | null>(null)
  const [guardando, setGuardando] = useState(false)
  const { confirmar, dialog } = useConfirm()

  useEffect(() => {
    Promise.all([
      axiosInstance.get<Recurso[]>('/recursos'),
      axiosInstance.get<TipoCita[]>('/tipos-cita'),
      axiosInstance.get<Cliente[]>('/clientes'),
    ])
      .then(([r, t, c]) => {
        setRecursos(r.data)
        setTiposCita(t.data)
        setClientes(c.data)
      })
      .catch(() => toast.error('No se pudieron cargar recursos / tipos de cita'))
  }, [])

  const cargarCitas = useCallback(async () => {
    setCargando(true)
    try {
      const { desde, hasta } = rangoParaVista(fecha, vista)
      const { data } = await axiosInstance.get<Cita[]>('/citas', {
        params: { desde: desde.toISOString(), hasta: hasta.toISOString() },
      })
      setCitas(data)
    } catch {
      toast.error('No se pudieron cargar las citas')
    } finally {
      setCargando(false)
    }
  }, [fecha, vista])

  useEffect(() => {
    cargarCitas()
  }, [cargarCitas])

  const eventos: CitaEvento[] = useMemo(
    () =>
      citas.map((cita) => ({
        id: cita.id,
        title: `${cita.tipoCita.nombre} · ${cita.recurso.nombre}${cita.cliente ? ` · ${cita.cliente.nombre}` : ''}`,
        start: new Date(cita.fechaInicio),
        end: new Date(cita.fechaFin),
        cita,
      })),
    [citas],
  )

  const abrirCreacion = (slot: SlotInfo) => {
    if (recursos.length === 0 || tiposCita.length === 0) {
      toast.error('Primero crea al menos un recurso y un tipo de cita')
      return
    }
    const tipoPorDefecto = tiposCita[0]
    // Si el usuario arrastró para seleccionar un rango (en vez de un solo clic),
    // respetamos ese rango como duración inicial, al estilo Outlook/Google Calendar.
    // Si no, usamos la duración por defecto del tipo de cita (siempre editable después).
    const esRangoArrastrado = differenceInMinutes(slot.end, slot.start) > 1
    const duracionMinutos = esRangoArrastrado
      ? differenceInMinutes(slot.end, slot.start)
      : tipoPorDefecto.duracionMinutos

    setForm({
      id: null,
      fechaInicio: aInputLocal(slot.start),
      duracionMinutos,
      recursoId: recursos[0].id,
      tipoCitaId: tipoPorDefecto.id,
      clienteId: '',
      notas: '',
      estado: 'pendiente',
    })
  }

  const abrirEdicion = (cita: Cita) => {
    setForm({
      id: cita.id,
      fechaInicio: aInputLocal(new Date(cita.fechaInicio)),
      duracionMinutos: differenceInMinutes(new Date(cita.fechaFin), new Date(cita.fechaInicio)),
      recursoId: cita.recursoId,
      tipoCitaId: cita.tipoCitaId,
      clienteId: cita.clienteId ?? '',
      notas: cita.notas ?? '',
      estado: cita.estado,
    })
  }

  const moverOReprogramar = async (id: string, start: Date, end: Date) => {
    setCargando(true)
    try {
      await axiosInstance.patch(`/citas/${id}`, {
        fechaInicio: start.toISOString(),
        fechaFin: end.toISOString(),
      })
      toast.success('Cita reprogramada')
      await cargarCitas()
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo reprogramar: revisa que no choque con otra cita'))
      await cargarCitas()
    }
  }

  const guardar = async () => {
    if (!form) return
    setGuardando(true)
    try {
      const fechaInicio = new Date(form.fechaInicio)
      const fechaFin = new Date(fechaInicio.getTime() + form.duracionMinutos * 60000)
      const payload = {
        recursoId: form.recursoId,
        tipoCitaId: form.tipoCitaId,
        clienteId: form.clienteId || undefined,
        fechaInicio: fechaInicio.toISOString(),
        fechaFin: fechaFin.toISOString(),
        notas: form.notas || undefined,
      }

      if (form.id) {
        await axiosInstance.patch(`/citas/${form.id}`, payload)
        if (form.estado !== citas.find((c) => c.id === form.id)?.estado) {
          await axiosInstance.patch(`/citas/${form.id}/estado`, { estado: form.estado })
        }
        toast.success('Cita actualizada')
      } else {
        await axiosInstance.post('/citas', payload)
        toast.success('Cita creada')
      }
      setForm(null)
      await cargarCitas()
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo guardar la cita'))
    } finally {
      setGuardando(false)
    }
  }

  const eliminar = async () => {
    if (!form?.id) return
    const confirmado = await confirmar(
      'Eliminar cita',
      '¿Seguro que quieres eliminar esta cita? Esta acción no se puede deshacer.',
    )
    if (!confirmado) return

    setGuardando(true)
    try {
      await axiosInstance.delete(`/citas/${form.id}`)
      toast.success('Cita eliminada')
      setForm(null)
      await cargarCitas()
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo eliminar la cita'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--color-text)]">Citas</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Arrastra sobre el calendario para elegir la hora de inicio y fin de una nueva cita, arrastra
        una cita existente para moverla o estira su borde inferior para cambiar su duración — igual
        que en Outlook o Google Calendar. Haz clic en una cita para editarla o eliminarla.
      </p>

      <div className="relative mt-4 h-[70vh] rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)] p-2">
        {cargando && (
          <div className="absolute inset-0 z-20 flex items-center justify-center gap-2 rounded bg-[var(--color-bg-card)]/70 text-sm text-[var(--color-text-muted)]">
            <Spinner size={18} />
            Actualizando…
          </div>
        )}
        <DnDCalendar
          localizer={localizer}
          culture="es"
          messages={MENSAJES_CALENDARIO}
          events={eventos}
          date={fecha}
          view={vista}
          onNavigate={setFecha}
          onView={setVista}
          views={['month', 'week', 'day']}
          selectable
          resizable
          onSelectSlot={abrirCreacion}
          onSelectEvent={(evento) => abrirEdicion((evento as CitaEvento).cita)}
          onEventDrop={({ event, start, end }: EventInteractionArgs<CitaEvento>) =>
            moverOReprogramar(event.id, start as Date, end as Date)
          }
          onEventResize={({ event, start, end }: EventInteractionArgs<CitaEvento>) =>
            moverOReprogramar(event.id, start as Date, end as Date)
          }
          eventPropGetter={(evento: CitaEvento) => ({
            style: {
              backgroundColor: evento.cita.tipoCita.color,
              opacity: evento.cita.estado === 'cancelada' ? 0.4 : 1,
              border: 'none',
            },
          })}
          style={{ height: '100%' }}
        />
      </div>

      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-[var(--color-bg-card)] p-6 shadow-lg">
            <h2 className="text-base font-semibold text-[var(--color-text)]">
              {form.id ? 'Editar cita' : 'Nueva cita'}
            </h2>

            <div className="mt-4 flex flex-col gap-3">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                    Inicio
                  </label>
                  <input
                    type="datetime-local"
                    value={form.fechaInicio}
                    onChange={(e) =>
                      setForm((prev) => (prev ? { ...prev, fechaInicio: e.target.value } : prev))
                    }
                    className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                  />
                </div>
                <div className="w-32 shrink-0">
                  <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                    Duración (min)
                  </label>
                  <input
                    type="number"
                    min={5}
                    step={5}
                    value={form.duracionMinutos}
                    onChange={(e) =>
                      setForm((prev) =>
                        prev ? { ...prev, duracionMinutos: Number(e.target.value) } : prev,
                      )
                    }
                    className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                  />
                </div>
              </div>
              <p className="-mt-2 text-xs text-[var(--color-text-faint)]">
                Termina a las{' '}
                {format(
                  new Date(new Date(form.fechaInicio).getTime() + form.duracionMinutos * 60000),
                  'HH:mm',
                )}
              </p>

              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                  Recurso
                </label>
                <select
                  value={form.recursoId}
                  onChange={(e) =>
                    setForm((prev) => (prev ? { ...prev, recursoId: e.target.value } : prev))
                  }
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                >
                  {recursos.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                  Tipo de cita
                </label>
                <select
                  value={form.tipoCitaId}
                  onChange={(e) => {
                    const tipo = tiposCita.find((t) => t.id === e.target.value)
                    setForm((prev) =>
                      prev
                        ? {
                            ...prev,
                            tipoCitaId: e.target.value,
                            duracionMinutos: tipo?.duracionMinutos ?? prev.duracionMinutos,
                          }
                        : prev,
                    )
                  }}
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                >
                  {tiposCita.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre} ({t.duracionMinutos} min)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                  Cliente (opcional)
                </label>
                <select
                  value={form.clienteId}
                  onChange={(e) =>
                    setForm((prev) => (prev ? { ...prev, clienteId: e.target.value } : prev))
                  }
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                >
                  <option value="">Sin cliente asociado</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {form.id && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                    Estado
                  </label>
                  <select
                    value={form.estado}
                    onChange={(e) =>
                      setForm((prev) =>
                        prev ? { ...prev, estado: e.target.value as FormularioCita['estado'] } : prev,
                      )
                    }
                    className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                  >
                    {ESTADOS_CITA.map((estado) => (
                      <option key={estado.value} value={estado.value}>
                        {estado.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                  Notas
                </label>
                <textarea
                  value={form.notas}
                  onChange={(e) =>
                    setForm((prev) => (prev ? { ...prev, notas: e.target.value } : prev))
                  }
                  rows={2}
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-2">
              {form.id ? (
                <button
                  type="button"
                  onClick={eliminar}
                  disabled={guardando}
                  className="flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  {guardando && <Spinner size={14} />}
                  Eliminar
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm(null)}
                  disabled={guardando}
                  className="rounded px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg)] disabled:opacity-50"
                >
                  Cancelar
                </button>
                <PrimaryButton
                  type="button"
                  onClick={guardar}
                  disabled={guardando}
                  className="flex items-center gap-2"
                >
                  {guardando && <Spinner size={14} />}
                  {guardando ? 'Guardando…' : form.id ? 'Guardar cambios' : 'Agendar'}
                </PrimaryButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {dialog}
    </div>
  )
}
