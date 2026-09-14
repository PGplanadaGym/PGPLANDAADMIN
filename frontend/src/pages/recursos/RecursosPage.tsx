import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Pencil, Archive, ArchiveRestore, Trash2 } from 'lucide-react'
import { CanAccess } from '@refinedev/core'
import { axiosInstance } from '../../lib/axios'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { Spinner } from '../../components/ui/Spinner'
import { CargandoPantalla } from '../../components/ui/CargandoPantalla'
import { SearchInput } from '../../components/ui/SearchInput'

function mensajeError(error: unknown, fallback: string) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  )
}

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

interface UsuarioBasico {
  id: string
  nombre: string
}

interface TipoCitaBasico {
  id: string
  nombre: string
}

interface Bloqueo {
  id: string
  fecha: string
  horaInicio: string | null
  horaFin: string | null
  motivo: string | null
}

interface Recurso {
  id: string
  nombre: string
  tipo: string
  activo: boolean
  horarios: HorarioAtencion[]
  sucursal: Sucursal | null
  usuario: UsuarioBasico | null
  tiposCita: TipoCitaBasico[]
  bloqueos: Bloqueo[]
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
  const [usuarios, setUsuarios] = useState<UsuarioBasico[]>([])
  const [tiposCitaCatalogo, setTiposCitaCatalogo] = useState<TipoCitaBasico[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<(typeof TIPOS_RECURSO)[number]['value']>('persona')
  const [sucursalId, setSucursalId] = useState('')
  const [usuarioId, setUsuarioId] = useState('')
  const [creando, setCreando] = useState(false)
  const [recursoHorario, setRecursoHorario] = useState<Recurso | null>(null)
  const [formHorario, setFormHorario] = useState<DiaHorarioForm[]>([])
  const [guardandoHorario, setGuardandoHorario] = useState(false)

  const [recursoEdit, setRecursoEdit] = useState<Recurso | null>(null)
  const [nombreEdit, setNombreEdit] = useState('')
  const [tipoEdit, setTipoEdit] = useState<(typeof TIPOS_RECURSO)[number]['value']>('persona')
  const [sucursalIdEdit, setSucursalIdEdit] = useState('')
  const [usuarioIdEdit, setUsuarioIdEdit] = useState('')
  const [guardandoEdit, setGuardandoEdit] = useState(false)
  const [cambiandoActivoId, setCambiandoActivoId] = useState<string | null>(null)
  const [mostrarArchivados, setMostrarArchivados] = useState(false)

  const [recursoServicios, setRecursoServicios] = useState<Recurso | null>(null)
  const [tiposCitaSeleccionados, setTiposCitaSeleccionados] = useState<Set<string>>(new Set())
  const [guardandoServicios, setGuardandoServicios] = useState(false)

  const [recursoBloqueos, setRecursoBloqueos] = useState<Recurso | null>(null)
  const [bloqueoFecha, setBloqueoFecha] = useState('')
  const [bloqueoHoraInicio, setBloqueoHoraInicio] = useState('')
  const [bloqueoHoraFin, setBloqueoHoraFin] = useState('')
  const [bloqueoMotivo, setBloqueoMotivo] = useState('')
  const [agregandoBloqueo, setAgregandoBloqueo] = useState(false)
  const [eliminandoBloqueoId, setEliminandoBloqueoId] = useState<string | null>(null)

  const cargar = async () => {
    setLoading(true)
    try {
      const { data } = await axiosInstance.get<Recurso[]>('/recursos', {
        params: mostrarArchivados ? { incluirInactivos: 'true' } : {},
      })
      setRecursos(data)
    } catch {
      toast.error('No se pudieron cargar los recursos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mostrarArchivados])

  useEffect(() => {
    axiosInstance
      .get<UsuarioBasico[]>('/usuarios')
      .then(({ data }) => setUsuarios(data))
      .catch(() => {
        /* sin permiso para ver usuarios: simplemente no se puede vincular un empleado */
      })
    axiosInstance
      .get<Sucursal[]>('/sucursales')
      .then(({ data }) => setSucursales(data))
      .catch(() => {
        /* módulo Sucursales puede no estar activo */
      })
    axiosInstance
      .get<TipoCitaBasico[]>('/tipos-cita')
      .then(({ data }) => setTiposCitaCatalogo(data))
      .catch(() => {
        /* sin permiso para ver tipos de cita: no se puede configurar qué ofrece cada recurso */
      })
  }, [])

  const crear = async () => {
    if (!nombre.trim()) return
    setCreando(true)
    try {
      await axiosInstance.post('/recursos', {
        nombre,
        tipo,
        sucursalId: sucursalId || undefined,
        usuarioId: usuarioId || undefined,
      })
      setNombre('')
      setSucursalId('')
      setUsuarioId('')
      toast.success('Recurso creado')
      await cargar()
    } catch {
      toast.error('No se pudo crear el recurso')
    } finally {
      setCreando(false)
    }
  }

  const abrirEdicion = (recurso: Recurso) => {
    setRecursoEdit(recurso)
    setNombreEdit(recurso.nombre)
    setTipoEdit(recurso.tipo as (typeof TIPOS_RECURSO)[number]['value'])
    setSucursalIdEdit(recurso.sucursal?.id ?? '')
    setUsuarioIdEdit(recurso.usuario?.id ?? '')
  }

  const guardarEdicion = async () => {
    if (!recursoEdit || !nombreEdit.trim()) return
    setGuardandoEdit(true)
    try {
      await axiosInstance.patch(`/recursos/${recursoEdit.id}`, {
        nombre: nombreEdit,
        tipo: tipoEdit,
        sucursalId: sucursalIdEdit || null,
        usuarioId: usuarioIdEdit || null,
      })
      toast.success('Recurso actualizado')
      setRecursoEdit(null)
      await cargar()
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo actualizar el recurso'))
    } finally {
      setGuardandoEdit(false)
    }
  }

  const alternarActivo = async (recurso: Recurso) => {
    setCambiandoActivoId(recurso.id)
    try {
      await axiosInstance.patch(`/recursos/${recurso.id}`, { activo: !recurso.activo })
      toast.success(recurso.activo ? 'Recurso archivado' : 'Recurso reactivado')
      await cargar()
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo actualizar el recurso'))
    } finally {
      setCambiandoActivoId(null)
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

  const abrirServicios = (recurso: Recurso) => {
    setRecursoServicios(recurso)
    setTiposCitaSeleccionados(new Set(recurso.tiposCita.map((t) => t.id)))
  }

  const alternarTipoCita = (tipoCitaId: string) => {
    setTiposCitaSeleccionados((prev) => {
      const nuevo = new Set(prev)
      if (nuevo.has(tipoCitaId)) nuevo.delete(tipoCitaId)
      else nuevo.add(tipoCitaId)
      return nuevo
    })
  }

  const guardarServicios = async () => {
    if (!recursoServicios) return
    setGuardandoServicios(true)
    try {
      await axiosInstance.post(`/recursos/${recursoServicios.id}/tipos-cita`, {
        tipoCitaIds: [...tiposCitaSeleccionados],
      })
      toast.success('Servicios actualizados')
      setRecursoServicios(null)
      await cargar()
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudieron guardar los servicios'))
    } finally {
      setGuardandoServicios(false)
    }
  }

  const abrirBloqueos = (recurso: Recurso) => {
    setRecursoBloqueos(recurso)
    setBloqueoFecha('')
    setBloqueoHoraInicio('')
    setBloqueoHoraFin('')
    setBloqueoMotivo('')
  }

  const agregarBloqueo = async () => {
    if (!recursoBloqueos || !bloqueoFecha) return
    if ((bloqueoHoraInicio && !bloqueoHoraFin) || (!bloqueoHoraInicio && bloqueoHoraFin)) {
      toast.error('Si defines una hora de inicio, también debes definir la hora de fin')
      return
    }
    setAgregandoBloqueo(true)
    try {
      const { data } = await axiosInstance.post<Recurso>(
        `/recursos/${recursoBloqueos.id}/bloqueos`,
        {
          fecha: bloqueoFecha,
          horaInicio: bloqueoHoraInicio || undefined,
          horaFin: bloqueoHoraFin || undefined,
          motivo: bloqueoMotivo || undefined,
        },
      )
      toast.success('Bloqueo agregado')
      setRecursoBloqueos(data)
      setBloqueoFecha('')
      setBloqueoHoraInicio('')
      setBloqueoHoraFin('')
      setBloqueoMotivo('')
      await cargar()
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo agregar el bloqueo'))
    } finally {
      setAgregandoBloqueo(false)
    }
  }

  const quitarBloqueo = async (bloqueoId: string) => {
    if (!recursoBloqueos) return
    setEliminandoBloqueoId(bloqueoId)
    try {
      const { data } = await axiosInstance.delete<Recurso>(
        `/recursos/${recursoBloqueos.id}/bloqueos/${bloqueoId}`,
      )
      toast.success('Bloqueo eliminado')
      setRecursoBloqueos(data)
      await cargar()
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo eliminar el bloqueo'))
    } finally {
      setEliminandoBloqueoId(null)
    }
  }

  const recursosFiltrados = recursos.filter((r) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    const etiquetaTipo = TIPOS_RECURSO.find((t) => t.value === r.tipo)?.label ?? r.tipo
    return (
      r.nombre.toLowerCase().includes(q) ||
      etiquetaTipo.toLowerCase().includes(q) ||
      (r.sucursal?.nombre.toLowerCase().includes(q) ?? false) ||
      (r.usuario?.nombre.toLowerCase().includes(q) ?? false)
    )
  })

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
              onChange={(e) => {
                const nuevoTipo = e.target.value as typeof tipo
                setTipo(nuevoTipo)
                if (nuevoTipo !== 'persona') setUsuarioId('')
              }}
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
          {usuarios.length > 0 && tipo === 'persona' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                Empleado vinculado
              </label>
              <select
                value={usuarioId}
                onChange={(e) => setUsuarioId(e.target.value)}
                className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
              >
                <option value="">Sin vincular</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre}
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

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Buscar por nombre, tipo, sucursal o empleado…"
        />
        <label className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
          <input
            type="checkbox"
            checked={mostrarArchivados}
            onChange={(e) => setMostrarArchivados(e.target.checked)}
          />
          Mostrar archivados
          {loading && <Spinner size={13} />}
        </label>
      </div>

      <div className="relative mt-2 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)]">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-xl bg-[var(--color-bg-card)]/70 text-sm text-[var(--color-text-muted)]">
            <Spinner size={18} />
            Actualizando…
          </div>
        )}
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
            {recursosFiltrados.map((recurso) => (
              <tr key={recurso.id} className="border-t border-[var(--color-border)]">
                <td className="px-4 py-2">
                  {recurso.nombre}
                  {!recurso.activo && (
                    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                      Archivado
                    </span>
                  )}
                  {recurso.usuario && (
                    <p className="text-xs text-[var(--color-text-faint)]">
                      {recurso.usuario.nombre}
                    </p>
                  )}
                </td>
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
                  <div className="flex justify-end gap-1">
                    <CanAccess resource="recursos" action="edit">
                      <button
                        type="button"
                        onClick={() => abrirHorario(recurso)}
                        className="rounded px-2 py-1 text-sm text-[var(--color-primario-legible)] hover:bg-[var(--color-bg-subtle)]"
                      >
                        Horario
                      </button>
                      <button
                        type="button"
                        onClick={() => abrirServicios(recurso)}
                        className="rounded px-2 py-1 text-sm text-[var(--color-primario-legible)] hover:bg-[var(--color-bg-subtle)]"
                      >
                        Servicios
                      </button>
                      <button
                        type="button"
                        onClick={() => abrirBloqueos(recurso)}
                        className="rounded px-2 py-1 text-sm text-[var(--color-primario-legible)] hover:bg-[var(--color-bg-subtle)]"
                      >
                        Bloqueos{recurso.bloqueos.length > 0 ? ` (${recurso.bloqueos.length})` : ''}
                      </button>
                      <button
                        type="button"
                        onClick={() => abrirEdicion(recurso)}
                        title="Editar recurso"
                        className="rounded p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)]"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => alternarActivo(recurso)}
                        disabled={cambiandoActivoId === recurso.id}
                        title={recurso.activo ? 'Archivar recurso' : 'Reactivar recurso'}
                        className="rounded p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-50"
                      >
                        {cambiandoActivoId === recurso.id ? (
                          <Spinner size={14} />
                        ) : recurso.activo ? (
                          <Archive size={14} />
                        ) : (
                          <ArchiveRestore size={14} />
                        )}
                      </button>
                    </CanAccess>
                  </div>
                </td>
              </tr>
            ))}
            {recursosFiltrados.length === 0 && (
              <tr>
                <td
                  colSpan={sucursales.length > 0 ? 5 : 4}
                  className="px-4 py-6 text-center text-[var(--color-text-faint)]"
                >
                  {loading ? (
                    <CargandoPantalla minHeight={80} />
                  ) : query ? (
                    'Sin resultados para tu búsqueda'
                  ) : (
                    'Sin recursos todavía'
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {recursoHorario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-lg bg-[var(--color-bg-card)] p-6 shadow-lg">
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
              <CanAccess resource="recursos" action="edit">
                <PrimaryButton type="button" onClick={guardarHorario} disabled={guardandoHorario}>
                  {guardandoHorario ? 'Guardando…' : 'Guardar'}
                </PrimaryButton>
              </CanAccess>
            </div>
          </div>
        </div>
      )}

      {recursoEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-lg bg-[var(--color-bg-card)] p-6 shadow-lg">
            <h2 className="text-base font-semibold text-[var(--color-text)]">
              Editar recurso
            </h2>
            <div className="mt-4 flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                  Nombre
                </label>
                <input
                  value={nombreEdit}
                  onChange={(e) => setNombreEdit(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                  Tipo
                </label>
                <select
                  value={tipoEdit}
                  onChange={(e) => {
                    const nuevoTipo = e.target.value as typeof tipoEdit
                    setTipoEdit(nuevoTipo)
                    if (nuevoTipo !== 'persona') setUsuarioIdEdit('')
                  }}
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
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
                    value={sucursalIdEdit}
                    onChange={(e) => setSucursalIdEdit(e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
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
              {usuarios.length > 0 && tipoEdit === 'persona' && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                    Empleado vinculado
                  </label>
                  <select
                    value={usuarioIdEdit}
                    onChange={(e) => setUsuarioIdEdit(e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                  >
                    <option value="">Sin vincular</option>
                    {usuarios.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nombre}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-[var(--color-text-faint)]">
                    Si vinculas un empleado, le llegará una notificación cada vez que se le
                    asigne una cita.
                  </p>
                </div>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRecursoEdit(null)}
                className="rounded px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]"
              >
                Cancelar
              </button>
              <PrimaryButton
                type="button"
                onClick={guardarEdicion}
                disabled={guardandoEdit || !nombreEdit.trim()}
                className="flex items-center gap-2"
              >
                {guardandoEdit && <Spinner size={14} />}
                {guardandoEdit ? 'Guardando…' : 'Guardar cambios'}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {recursoServicios && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-lg bg-[var(--color-bg-card)] p-6 shadow-lg">
            <h2 className="text-base font-semibold text-[var(--color-text)]">
              Servicios de {recursoServicios.nombre}
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              Qué tipos de cita puede realizar este recurso. Si no marcas ninguno, se puede
              agendar para cualquiera.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {tiposCitaCatalogo.length === 0 && (
                <p className="text-sm text-[var(--color-text-faint)]">
                  Sin tipos de cita configurados todavía.
                </p>
              )}
              {tiposCitaCatalogo.map((t) => (
                <label key={t.id} className="flex items-center gap-2 text-sm text-[var(--color-text)]">
                  <input
                    type="checkbox"
                    checked={tiposCitaSeleccionados.has(t.id)}
                    onChange={() => alternarTipoCita(t.id)}
                  />
                  {t.nombre}
                </label>
              ))}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRecursoServicios(null)}
                className="rounded px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]"
              >
                Cancelar
              </button>
              <CanAccess resource="recursos" action="edit">
                <PrimaryButton
                  type="button"
                  onClick={guardarServicios}
                  disabled={guardandoServicios}
                  className="flex items-center gap-2"
                >
                  {guardandoServicios && <Spinner size={14} />}
                  {guardandoServicios ? 'Guardando…' : 'Guardar'}
                </PrimaryButton>
              </CanAccess>
            </div>
          </div>
        </div>
      )}

      {recursoBloqueos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-lg bg-[var(--color-bg-card)] p-6 shadow-lg">
            <h2 className="text-base font-semibold text-[var(--color-text)]">
              Bloqueos de {recursoBloqueos.nombre}
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              Fechas puntuales en las que este recurso no está disponible (vacaciones, día
              libre…), sin tocar su horario semanal.
            </p>

            <div className="mt-3 flex flex-col gap-2">
              {recursoBloqueos.bloqueos.length === 0 && (
                <p className="text-sm text-[var(--color-text-faint)]">Sin bloqueos próximos</p>
              )}
              {recursoBloqueos.bloqueos.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
                >
                  <div>
                    <span className="text-[var(--color-text)]">
                      {new Date(`${b.fecha.slice(0, 10)}T00:00:00`).toLocaleDateString('es-EC')}
                    </span>{' '}
                    <span className="text-[var(--color-text-muted)]">
                      {b.horaInicio && b.horaFin ? `· ${b.horaInicio} a ${b.horaFin}` : '· Todo el día'}
                      {b.motivo ? ` · ${b.motivo}` : ''}
                    </span>
                  </div>
                  <CanAccess resource="recursos" action="edit">
                    <button
                      type="button"
                      onClick={() => quitarBloqueo(b.id)}
                      disabled={eliminandoBloqueoId === b.id}
                      className="shrink-0 rounded p-1 text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {eliminandoBloqueoId === b.id ? <Spinner size={13} /> : <Trash2 size={13} />}
                    </button>
                  </CanAccess>
                </div>
              ))}
            </div>

            <CanAccess resource="recursos" action="edit">
            <div className="mt-4 border-t border-[var(--color-border)] pt-4">
              <p className="mb-2 text-sm font-medium text-[var(--color-text)]">Agregar bloqueo</p>
              <div className="flex flex-wrap items-end gap-2">
                <div>
                  <label className="mb-1 block text-xs text-[var(--color-text-muted)]">Fecha</label>
                  <input
                    type="date"
                    value={bloqueoFecha}
                    onChange={(e) => setBloqueoFecha(e.target.value)}
                    className="rounded-lg border border-[var(--color-border)] px-2 py-1.5 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[var(--color-text-muted)]">
                    Desde (opcional)
                  </label>
                  <input
                    type="time"
                    value={bloqueoHoraInicio}
                    onChange={(e) => setBloqueoHoraInicio(e.target.value)}
                    className="rounded-lg border border-[var(--color-border)] px-2 py-1.5 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[var(--color-text-muted)]">
                    Hasta (opcional)
                  </label>
                  <input
                    type="time"
                    value={bloqueoHoraFin}
                    onChange={(e) => setBloqueoHoraFin(e.target.value)}
                    className="rounded-lg border border-[var(--color-border)] px-2 py-1.5 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                  />
                </div>
              </div>
              <div className="mt-2">
                <label className="mb-1 block text-xs text-[var(--color-text-muted)]">
                  Motivo (opcional)
                </label>
                <input
                  value={bloqueoMotivo}
                  onChange={(e) => setBloqueoMotivo(e.target.value)}
                  placeholder="Ej: Vacaciones"
                  className="w-full rounded-lg border border-[var(--color-border)] px-2 py-1.5 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                />
              </div>
              <PrimaryButton
                type="button"
                onClick={agregarBloqueo}
                disabled={agregandoBloqueo || !bloqueoFecha}
                className="mt-3 flex items-center gap-2"
              >
                {agregandoBloqueo && <Spinner size={14} />}
                {agregandoBloqueo ? 'Agregando…' : 'Agregar bloqueo'}
              </PrimaryButton>
            </div>
            </CanAccess>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setRecursoBloqueos(null)}
                className="rounded px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
