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
  addDays,
} from 'date-fns'
import { es } from 'date-fns/locale/es'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import { CanAccess, useGetIdentity } from '@refinedev/core'
import { axiosInstance } from '../../lib/axios'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { useConfirm } from '../../components/ui/ConfirmDialog'
import { Spinner } from '../../components/ui/Spinner'
import { SelectorCliente } from '../../components/ui/SelectorCliente'
import { buildAbility } from '../../ability/ability'
import type { Identity } from '../../lib/identity'

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

interface HorarioAtencion {
  diaSemana: number
  horaInicio: string
  horaFin: string
}

interface BloqueoDisponibilidad {
  fecha: string
  horaInicio: string | null
  horaFin: string | null
}

interface Recurso {
  id: string
  nombre: string
  tiposCita: { id: string }[]
  horarios: HorarioAtencion[]
  bloqueos: BloqueoDisponibilidad[]
}

interface TipoCita {
  id: string
  nombre: string
  duracionMinutos: number
  color: string
  precio: string | null
}

interface CategoriaMovimiento {
  id: string
  nombre: string
}

interface Cliente {
  id: string
  nombre: string
  email?: string | null
  telefono?: string | null
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
  movimientosCuenta: { id: string; monto: string }[]
}

interface CitaEvento {
  id: string
  title: string
  start: Date
  end: Date
  cita: Cita
  fueraDeHorario: boolean
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
  categoriaIngresoId: string
  montoCobro: string
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
  if (vista === 'agenda') {
    // react-big-calendar muestra 30 días desde la fecha activa en su vista Agenda por defecto.
    return { desde: startOfDay(fecha), hasta: endOfDay(addDays(fecha, 30)) }
  }
  return { desde: startOfDay(fecha), hasta: endOfDay(fecha) }
}

function aInputLocal(fecha: Date) {
  return format(fecha, "yyyy-MM-dd'T'HH:mm")
}

// react-big-calendar pinta el texto de las citas en blanco fijo (color:#fff) sin importar el
// tema. Si usáramos el color del tipo de cita como fondo sólido, un color oscuro (como el valor
// por defecto #0F172A) se funde con el fondo del calendario en modo oscuro y solo queda visible
// el texto blanco flotando. Por eso solo usamos el color como una franja + un tinte translúcido,
// y el texto siempre lo pinta el tema (var(--color-text)), nunca el color de fondo.
function hexATintaDeFondo(hex: string, alpha: number) {
  const limpio = hex.replace('#', '')
  const normalizado =
    limpio.length === 3
      ? limpio
          .split('')
          .map((c) => c + c)
          .join('')
      : limpio
  const bigint = parseInt(normalizado, 16)
  if (Number.isNaN(bigint)) return `rgba(148, 163, 184, ${alpha})`
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function mensajeError(error: unknown, fallback: string) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  )
}

const CANTIDAD_COLORES_RECURSO = 8

// Asigna a cada recurso un color estable de la misma paleta categórica que usa el resto de la
// app (var(--color-cat-1)…var(--color-cat-8), ya definida para claro/oscuro en index.css),
// derivado de su id — así el mismo recurso siempre se ve del mismo color entre recargas, sin
// necesidad de guardar un color por recurso en la base de datos.
function colorDeRecurso(recursoId: string) {
  let hash = 0
  for (let i = 0; i < recursoId.length; i++) {
    hash = (hash * 31 + recursoId.charCodeAt(i)) >>> 0
  }
  const indice = (hash % CANTIDAD_COLORES_RECURSO) + 1
  return `var(--color-cat-${indice})`
}

function fechaLocalStr(fecha: Date) {
  const anio = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

function minutosDesdeMedianoche(fecha: Date) {
  return fecha.getHours() * 60 + fecha.getMinutes()
}

// Refleja del lado del cliente la misma validación que hace el backend al crear/editar una
// cita (horarios de atención + bloqueos de disponibilidad), para poder marcar en el calendario
// citas que YA existían y que un cambio posterior de horario/bloqueo dejó "fuera de horario" —
// el backend nunca las toca solo, así que sin esto el conflicto pasaría desapercibido hasta
// que alguien intente volver a guardar esa cita.
function citaFueraDeHorario(cita: Cita, recurso: Recurso | undefined): boolean {
  if (!recurso) return false

  const inicio = new Date(cita.fechaInicio)
  const fin = new Date(cita.fechaFin)
  const inicioMin = minutosDesdeMedianoche(inicio)
  const finMin = minutosDesdeMedianoche(fin)

  const fechaStr = fechaLocalStr(inicio)
  const hayBloqueo = recurso.bloqueos.some((b) => {
    if (b.fecha.slice(0, 10) !== fechaStr) return false
    if (!b.horaInicio || !b.horaFin) return true
    const [bIniH, bIniM] = b.horaInicio.split(':').map(Number)
    const [bFinH, bFinM] = b.horaFin.split(':').map(Number)
    return inicioMin < bFinH * 60 + bFinM && bIniH * 60 + bIniM < finMin
  })
  if (hayBloqueo) return true

  if (recurso.horarios.length === 0) return false
  if (inicio.getDay() !== fin.getDay()) return true

  const dentroDeAlgunHorario = recurso.horarios
    .filter((h) => h.diaSemana === inicio.getDay())
    .some((h) => {
      const [hIniH, hIniM] = h.horaInicio.split(':').map(Number)
      const [hFinH, hFinM] = h.horaFin.split(':').map(Number)
      return inicioMin >= hIniH * 60 + hIniM && finMin <= hFinH * 60 + hFinM
    })
  return !dentroDeAlgunHorario
}

export function CitasPage() {
  const [fecha, setFecha] = useState(new Date())
  const [vista, setVista] = useState<View>('month')
  const [citas, setCitas] = useState<Cita[]>([])
  const [recursos, setRecursos] = useState<Recurso[]>([])
  const [tiposCita, setTiposCita] = useState<TipoCita[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [categoriasIngreso, setCategoriasIngreso] = useState<CategoriaMovimiento[]>([])
  const [cargando, setCargando] = useState(true)

  const [form, setForm] = useState<FormularioCita | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [filtroRecursoId, setFiltroRecursoId] = useState('')
  const { confirmar, dialog } = useConfirm()

  const { data: identity } = useGetIdentity<Identity>()
  const ability = useMemo(() => buildAbility(identity?.permisos ?? []), [identity?.permisos])
  const puedeCrear = ability.can('citas.crear', 'all')
  const puedeEditar = ability.can('citas.actualizar', 'all')

  useEffect(() => {
    // Se cargan por separado (no con Promise.all) porque son 3 permisos independientes
    // (recursos.leer, tipos-cita.leer, clientes.leer): un rol puede tener citas.leer sin
    // tener los otros tres, y en ese caso simplemente no se pueden mostrar esos datos —
    // no es un error real, así que no se le muestra un toast de error por eso.
    const esErrorDePermiso = (error: unknown) =>
      (error as { response?: { status?: number } })?.response?.status === 403

    axiosInstance
      .get<Recurso[]>('/recursos')
      .then(({ data }) => setRecursos(data))
      .catch((error) => {
        if (!esErrorDePermiso(error)) toast.error('No se pudieron cargar los recursos')
      })

    axiosInstance
      .get<TipoCita[]>('/tipos-cita')
      .then(({ data }) => setTiposCita(data))
      .catch((error) => {
        if (!esErrorDePermiso(error)) toast.error('No se pudieron cargar los tipos de cita')
      })

    axiosInstance
      .get<Cliente[]>('/clientes')
      .then(({ data }) => setClientes(data))
      .catch((error) => {
        if (!esErrorDePermiso(error)) toast.error('No se pudieron cargar los clientes')
      })

    axiosInstance
      .get<CategoriaMovimiento[]>('/categorias-movimiento', { params: { tipo: 'ingreso' } })
      .then(({ data }) => setCategoriasIngreso(data))
      .catch(() => {
        /* módulo Cuentas puede no estar activo: simplemente no se puede registrar el cobro */
      })
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
      citas
        .filter((cita) => !filtroRecursoId || cita.recursoId === filtroRecursoId)
        .map((cita) => {
          const fueraDeHorario =
            cita.estado !== 'cancelada' &&
            citaFueraDeHorario(cita, recursos.find((r) => r.id === cita.recursoId))
          return {
            id: cita.id,
            title: `${fueraDeHorario ? '⚠ ' : ''}${cita.tipoCita.nombre} · ${cita.recurso.nombre}${cita.cliente ? ` · ${cita.cliente.nombre}` : ''}`,
            start: new Date(cita.fechaInicio),
            end: new Date(cita.fechaFin),
            cita,
            fueraDeHorario,
          }
        }),
    [citas, filtroRecursoId, recursos],
  )

  const tiposCitaPermitidos = useCallback(
    (recursoId: string) => {
      const recurso = recursos.find((r) => r.id === recursoId)
      if (!recurso || recurso.tiposCita.length === 0) return tiposCita
      const idsPermitidos = new Set(recurso.tiposCita.map((t) => t.id))
      return tiposCita.filter((t) => idsPermitidos.has(t.id))
    },
    [recursos, tiposCita],
  )

  const abrirCreacion = (slot: SlotInfo) => {
    if (recursos.length === 0 || tiposCita.length === 0) {
      toast.error('Primero crea al menos un recurso y un tipo de cita')
      return
    }
    const tiposCitaDelRecurso = tiposCitaPermitidos(recursos[0].id)
    if (tiposCitaDelRecurso.length === 0) {
      toast.error('El primer recurso no tiene servicios configurados')
      return
    }
    const tipoPorDefecto = tiposCitaDelRecurso[0]
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
      categoriaIngresoId: '',
      montoCobro: '',
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
      categoriaIngresoId: '',
      montoCobro: cita.tipoCita.precio ?? '',
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
        const citaActual = citas.find((c) => c.id === form.id)
        if (form.estado !== citaActual?.estado || form.categoriaIngresoId) {
          await axiosInstance.patch(`/citas/${form.id}/estado`, {
            estado: form.estado,
            categoriaIngresoId: form.categoriaIngresoId || undefined,
            monto: form.categoriaIngresoId && form.montoCobro ? Number(form.montoCobro) : undefined,
          })
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

  const citaEnEdicion = form?.id ? citas.find((c) => c.id === form.id) : undefined
  const citaYaCobrada = (citaEnEdicion?.movimientosCuenta.length ?? 0) > 0

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--color-text)]">Citas</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Arrastra sobre el calendario para elegir la hora de inicio y fin de una nueva cita, arrastra
        una cita existente para moverla o estira su borde inferior para cambiar su duración — igual
        que en Outlook o Google Calendar. Haz clic en una cita para editarla o eliminarla.
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {recursos.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-[var(--color-text)]">Recurso:</label>
            <select
              value={filtroRecursoId}
              onChange={(e) => setFiltroRecursoId(e.target.value)}
              className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm focus:border-[var(--color-primario)] focus:outline-none"
            >
              <option value="">Todos</option>
              {recursos.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

        {tiposCita.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {tiposCita.map((t) => (
              <span key={t.id} className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full border border-[var(--color-border)]"
                  style={{ backgroundColor: t.color }}
                />
                {t.nombre}
              </span>
            ))}
          </div>
        )}

        {!filtroRecursoId && recursos.length > 1 && (
          <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-xs text-[var(--color-text-faint)]">Recurso (borde):</span>
            {recursos.map((r) => (
              <span key={r.id} className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: colorDeRecurso(r.id) }}
                />
                {r.nombre}
              </span>
            ))}
          </div>
        )}

        {eventos.some((e) => e.fueraDeHorario) && (
          <div className="flex w-full items-center gap-1.5 text-xs text-amber-700">
            <span className="inline-block h-2.5 w-2.5 rounded-sm border-2 border-dashed border-amber-600" />
            ⚠ Marcadas así: quedaron fuera del horario o de un bloqueo agregado después de crearlas
          </div>
        )}
      </div>

      <div className="relative mt-3 h-[70vh] rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)] p-2">
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
          views={['month', 'week', 'day', 'agenda']}
          selectable={puedeCrear}
          resizable={puedeEditar}
          draggableAccessor={() => puedeEditar}
          onSelectSlot={abrirCreacion}
          onSelectEvent={(evento) => abrirEdicion((evento as CitaEvento).cita)}
          onEventDrop={({ event, start, end }: EventInteractionArgs<CitaEvento>) =>
            moverOReprogramar(event.id, start as Date, end as Date)
          }
          onEventResize={({ event, start, end }: EventInteractionArgs<CitaEvento>) =>
            moverOReprogramar(event.id, start as Date, end as Date)
          }
          eventPropGetter={(evento: CitaEvento) => {
            const color = evento.cita.tipoCita.color
            const cancelada = evento.cita.estado === 'cancelada'
            // El borde derecho por recurso solo aporta cuando se ven todos los recursos
            // mezclados; si ya se filtró a uno solo, todos tendrían el mismo color y estorba.
            const bordeRecurso = !filtroRecursoId
              ? `3px solid ${colorDeRecurso(evento.cita.recursoId)}`
              : 'none'
            return {
              style: {
                backgroundColor: hexATintaDeFondo(color, cancelada ? 0.12 : 0.22),
                borderLeft: `3px solid ${color}`,
                borderTop: evento.fueraDeHorario ? '2px dashed #d97706' : 'none',
                borderRight: bordeRecurso,
                borderBottom: evento.fueraDeHorario ? '2px dashed #d97706' : 'none',
                color: cancelada ? 'var(--color-text-faint)' : 'var(--color-text)',
                textDecoration: cancelada ? 'line-through' : 'none',
              },
              title: evento.fueraDeHorario
                ? 'Esta cita quedó fuera del horario/bloqueos actuales del recurso'
                : undefined,
            }
          }}
          style={{ height: '100%' }}
        />
      </div>

      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-lg bg-[var(--color-bg-card)] p-6 shadow-lg">
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
                  onChange={(e) => {
                    const nuevoRecursoId = e.target.value
                    const permitidos = tiposCitaPermitidos(nuevoRecursoId)
                    setForm((prev) => {
                      if (!prev) return prev
                      const tipoSigueValido = permitidos.some((t) => t.id === prev.tipoCitaId)
                      const nuevoTipo = tipoSigueValido ? undefined : permitidos[0]
                      return {
                        ...prev,
                        recursoId: nuevoRecursoId,
                        tipoCitaId: nuevoTipo?.id ?? prev.tipoCitaId,
                        duracionMinutos: nuevoTipo?.duracionMinutos ?? prev.duracionMinutos,
                      }
                    })
                  }}
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
                  {tiposCitaPermitidos(form.recursoId).map((t) => (
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
                <SelectorCliente
                  clientes={clientes}
                  value={form.clienteId}
                  onChange={(id) =>
                    setForm((prev) => (prev ? { ...prev, clienteId: id } : prev))
                  }
                  opcionSinCliente="Sin cliente asociado"
                />
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

              {form.id && form.estado === 'completada' && (
                <div>
                  {citaYaCobrada ? (
                    <p className="rounded-lg bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-muted)]">
                      Ya se registró un cobro de $
                      {Number(citaEnEdicion!.movimientosCuenta[0].monto).toFixed(2)} para esta
                      cita.
                    </p>
                  ) : (
                    categoriasIngreso.length > 0 && (
                      <>
                        <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                          Registrar cobro en Cuentas (opcional)
                        </label>
                        <div className="flex gap-2">
                          <select
                            value={form.categoriaIngresoId}
                            onChange={(e) =>
                              setForm((prev) =>
                                prev ? { ...prev, categoriaIngresoId: e.target.value } : prev,
                              )
                            }
                            className="flex-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                          >
                            <option value="">No registrar</option>
                            {categoriasIngreso.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.nombre}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={form.montoCobro}
                            onChange={(e) =>
                              setForm((prev) =>
                                prev ? { ...prev, montoCobro: e.target.value } : prev,
                              )
                            }
                            placeholder="$"
                            className="w-24 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                          />
                        </div>
                      </>
                    )
                  )}
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
                <CanAccess resource="citas" action="delete">
                  <button
                    type="button"
                    onClick={eliminar}
                    disabled={guardando}
                    className="flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {guardando && <Spinner size={14} />}
                    Eliminar
                  </button>
                </CanAccess>
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
                <CanAccess resource="citas" action={form.id ? 'edit' : 'create'}>
                  <PrimaryButton
                    type="button"
                    onClick={guardar}
                    disabled={guardando}
                    className="flex items-center gap-2"
                  >
                    {guardando && <Spinner size={14} />}
                    {guardando ? 'Guardando…' : form.id ? 'Guardar cambios' : 'Agendar'}
                  </PrimaryButton>
                </CanAccess>
              </div>
            </div>
          </div>
        </div>
      )}

      {dialog}
    </div>
  )
}
