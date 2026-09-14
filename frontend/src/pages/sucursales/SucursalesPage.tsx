import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { CanAccess } from '@refinedev/core'
import { Pencil, Trash2, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { axiosInstance } from '../../lib/axios'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { Spinner } from '../../components/ui/Spinner'
import { CargandoPantalla } from '../../components/ui/CargandoPantalla'
import { MapaSeleccionUbicacion } from '../../components/ui/MapaSeleccionUbicacion'
import { MapaMarcaciones } from '../../components/ui/MapaMarcaciones'
import { useConfirm } from '../../components/ui/ConfirmDialog'
import { Avatar } from '../../components/ui/Avatar'
import { ImageUploadField } from '../../components/ui/ImageUploadField'

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function formatearHorario(dias: Set<string>, horaInicio: string, horaFin: string) {
  if (dias.size === 0) return ''
  const grupos: string[][] = []
  for (const dia of DIAS) {
    if (!dias.has(dia)) continue
    const ultimoGrupo = grupos[grupos.length - 1]
    if (ultimoGrupo && DIAS.indexOf(ultimoGrupo[ultimoGrupo.length - 1]) === DIAS.indexOf(dia) - 1) {
      ultimoGrupo.push(dia)
    } else {
      grupos.push([dia])
    }
  }
  const textoDias = grupos.map((g) => (g.length > 1 ? `${g[0]}-${g[g.length - 1]}` : g[0])).join(', ')
  return `${textoDias} ${horaInicio}-${horaFin}`
}

interface HorarioComposerProps {
  dias: Set<string>
  onCambiarDias: (dias: Set<string>) => void
  horaInicio: string
  onCambiarHoraInicio: (valor: string) => void
  horaFin: string
  onCambiarHoraFin: (valor: string) => void
}

function HorarioComposer({
  dias,
  onCambiarDias,
  horaInicio,
  onCambiarHoraInicio,
  horaFin,
  onCambiarHoraFin,
}: HorarioComposerProps) {
  const alternarDia = (dia: string) => {
    const nuevo = new Set(dias)
    if (nuevo.has(dia)) nuevo.delete(dia)
    else nuevo.add(dia)
    onCambiarDias(nuevo)
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
        Horario de atención
      </label>
      <div className="flex flex-wrap gap-1">
        {DIAS.map((dia) => (
          <button
            key={dia}
            type="button"
            onClick={() => alternarDia(dia)}
            className={`rounded-lg border px-2 py-1 text-xs font-medium ${
              dias.has(dia)
                ? 'border-[var(--color-primario)] bg-[var(--color-primario)] text-white'
                : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)]'
            }`}
          >
            {dia}
          </button>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="time"
          value={horaInicio}
          onChange={(e) => onCambiarHoraInicio(e.target.value)}
          className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm focus:border-[var(--color-primario)] focus:outline-none"
        />
        <span className="text-sm text-[var(--color-text-muted)]">a</span>
        <input
          type="time"
          value={horaFin}
          onChange={(e) => onCambiarHoraFin(e.target.value)}
          className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm focus:border-[var(--color-primario)] focus:outline-none"
        />
      </div>
      <p className="mt-1 text-xs text-[var(--color-text-faint)]">
        {dias.size > 0 ? formatearHorario(dias, horaInicio, horaFin) : 'Sin horario definido'}
      </p>
    </div>
  )
}

interface UsuarioBasico {
  id: string
  nombre: string
}

interface Sucursal {
  id: string
  nombre: string
  direccion: string | null
  latitud: number | null
  longitud: number | null
  codigoEstablecimiento: string | null
  telefono: string | null
  encargado: UsuarioBasico | null
  horarioAtencion: string | null
  imagenUrl: string | null
  activa: boolean
  _count: { usuarios: number; recursos: number; activos: number }
}

function mensajeError(error: unknown, fallback: string) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  )
}

export function SucursalesPage() {
  const { confirmar, dialog } = useConfirm()

  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [usuarios, setUsuarios] = useState<UsuarioBasico[]>([])
  const [cargando, setCargando] = useState(true)
  const [mostrarInactivas, setMostrarInactivas] = useState(false)

  const [nombre, setNombre] = useState('')
  const [direccion, setDireccion] = useState('')
  const [codigoEstablecimiento, setCodigoEstablecimiento] = useState('')
  const [telefono, setTelefono] = useState('')
  const [encargadoId, setEncargadoId] = useState('')
  const [horarioDias, setHorarioDias] = useState<Set<string>>(new Set())
  const [horarioInicio, setHorarioInicio] = useState('09:00')
  const [horarioFin, setHorarioFin] = useState('18:00')
  const [creando, setCreando] = useState(false)
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)

  const [sucursalEdit, setSucursalEdit] = useState<Sucursal | null>(null)
  const [nombreEdit, setNombreEdit] = useState('')
  const [direccionEdit, setDireccionEdit] = useState('')
  const [codigoEstablecimientoEdit, setCodigoEstablecimientoEdit] = useState('')
  const [telefonoEdit, setTelefonoEdit] = useState('')
  const [encargadoIdEdit, setEncargadoIdEdit] = useState('')
  const [horarioDiasEdit, setHorarioDiasEdit] = useState<Set<string>>(new Set())
  const [horarioInicioEdit, setHorarioInicioEdit] = useState('09:00')
  const [horarioFinEdit, setHorarioFinEdit] = useState('18:00')
  const [imagenUrlEdit, setImagenUrlEdit] = useState('')
  const [guardandoEdit, setGuardandoEdit] = useState(false)

  const [modalUbicacion, setModalUbicacion] = useState<Sucursal | null>(null)
  const [ubicacionSeleccionada, setUbicacionSeleccionada] = useState<{ lat: number; lng: number } | null>(
    null,
  )
  const [guardandoUbicacion, setGuardandoUbicacion] = useState(false)

  const cargar = (incluirInactivas: boolean) => {
    setCargando(true)
    axiosInstance
      .get<Sucursal[]>('/sucursales', { params: incluirInactivas ? { incluirInactivas: 'true' } : {} })
      .then(({ data }) => setSucursales(data))
      .catch(() => toast.error('No se pudieron cargar las sucursales'))
      .finally(() => setCargando(false))
  }

  useEffect(() => {
    cargar(mostrarInactivas)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mostrarInactivas])

  useEffect(() => {
    axiosInstance
      .get<UsuarioBasico[]>('/usuarios')
      .then(({ data }) => setUsuarios(data))
      .catch(() => {
        /* si no tiene permiso para ver usuarios, simplemente no se puede elegir encargado */
      })
  }, [])

  const crear = async () => {
    if (!nombre.trim()) return
    setCreando(true)
    try {
      await axiosInstance.post('/sucursales', {
        nombre,
        direccion: direccion || undefined,
        codigoEstablecimiento: codigoEstablecimiento || undefined,
        telefono: telefono || undefined,
        encargadoId: encargadoId || undefined,
        horarioAtencion: formatearHorario(horarioDias, horarioInicio, horarioFin) || undefined,
      })
      setNombre('')
      setDireccion('')
      setCodigoEstablecimiento('')
      setTelefono('')
      setEncargadoId('')
      setHorarioDias(new Set())
      setHorarioInicio('09:00')
      setHorarioFin('18:00')
      toast.success('Sucursal creada')
      cargar(mostrarInactivas)
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo crear la sucursal'))
    } finally {
      setCreando(false)
    }
  }

  const alternarActiva = async (sucursal: Sucursal) => {
    try {
      await axiosInstance.patch(`/sucursales/${sucursal.id}`, { activa: !sucursal.activa })
      cargar(mostrarInactivas)
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo actualizar la sucursal'))
    }
  }

  const abrirEdicion = (sucursal: Sucursal) => {
    setSucursalEdit(sucursal)
    setNombreEdit(sucursal.nombre)
    setDireccionEdit(sucursal.direccion ?? '')
    setCodigoEstablecimientoEdit(sucursal.codigoEstablecimiento ?? '')
    setTelefonoEdit(sucursal.telefono ?? '')
    setEncargadoIdEdit(sucursal.encargado?.id ?? '')
    setHorarioDiasEdit(new Set())
    setHorarioInicioEdit('09:00')
    setHorarioFinEdit('18:00')
    setImagenUrlEdit(sucursal.imagenUrl ?? '')
  }

  const guardarEdicion = async () => {
    if (!sucursalEdit || !nombreEdit.trim()) return
    setGuardandoEdit(true)
    try {
      const horarioCompuesto = formatearHorario(horarioDiasEdit, horarioInicioEdit, horarioFinEdit)
      await axiosInstance.patch(`/sucursales/${sucursalEdit.id}`, {
        nombre: nombreEdit,
        direccion: direccionEdit || null,
        codigoEstablecimiento: codigoEstablecimientoEdit || null,
        telefono: telefonoEdit || null,
        encargadoId: encargadoIdEdit || '',
        // Si no tocaste los días del horario, se conserva el que ya tenía guardado.
        horarioAtencion: horarioDiasEdit.size > 0 ? horarioCompuesto : sucursalEdit.horarioAtencion,
        imagenUrl: imagenUrlEdit || null,
      })
      toast.success('Sucursal actualizada')
      setSucursalEdit(null)
      cargar(mostrarInactivas)
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo actualizar la sucursal'))
    } finally {
      setGuardandoEdit(false)
    }
  }

  const abrirModalUbicacion = (sucursal: Sucursal) => {
    setModalUbicacion(sucursal)
    setUbicacionSeleccionada(
      sucursal.latitud != null && sucursal.longitud != null
        ? { lat: sucursal.latitud, lng: sucursal.longitud }
        : null,
    )
  }

  const guardarUbicacion = async () => {
    if (!modalUbicacion || !ubicacionSeleccionada) return
    setGuardandoUbicacion(true)
    try {
      await axiosInstance.patch(`/sucursales/${modalUbicacion.id}`, {
        latitud: ubicacionSeleccionada.lat,
        longitud: ubicacionSeleccionada.lng,
      })
      toast.success('Ubicación guardada')
      setModalUbicacion(null)
      cargar(mostrarInactivas)
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo guardar la ubicación'))
    } finally {
      setGuardandoUbicacion(false)
    }
  }

  const eliminar = async (sucursal: Sucursal) => {
    const enUso =
      sucursal._count.usuarios > 0 || sucursal._count.recursos > 0 || sucursal._count.activos > 0
    if (enUso) {
      toast.error('Esta sucursal tiene empleados, recursos o activos asignados — desactívala en su lugar')
      return
    }
    const confirmado = await confirmar(
      'Eliminar sucursal',
      `¿Eliminar «${sucursal.nombre}»? Esta acción no se puede deshacer.`,
      'Eliminar',
    )
    if (!confirmado) return
    setEliminandoId(sucursal.id)
    try {
      await axiosInstance.delete(`/sucursales/${sucursal.id}`)
      toast.success('Sucursal eliminada')
      cargar(mostrarInactivas)
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo eliminar la sucursal'))
    } finally {
      setEliminandoId(null)
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--color-text)]">Sucursales</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Registra tus locales. Luego puedes asignar empleados, recursos y activos a cada uno.
      </p>

      <CanAccess resource="sucursales" action="create">
        <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)] p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                Nombre
              </label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Sucursal Norte"
                className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                Dirección
              </label>
              <input
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                className="w-64 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                Código SRI (opcional)
              </label>
              <input
                value={codigoEstablecimiento}
                onChange={(e) => setCodigoEstablecimiento(e.target.value)}
                placeholder="001"
                maxLength={3}
                className="w-24 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                Teléfono
              </label>
              <input
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="w-36 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
              />
            </div>
            {usuarios.length > 0 && (
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                  Encargado
                </label>
                <select
                  value={encargadoId}
                  onChange={(e) => setEncargadoId(e.target.value)}
                  className="w-44 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                >
                  <option value="">Sin asignar</option>
                  {usuarios.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="mt-3">
            <HorarioComposer
              dias={horarioDias}
              onCambiarDias={setHorarioDias}
              horaInicio={horarioInicio}
              onCambiarHoraInicio={setHorarioInicio}
              horaFin={horarioFin}
              onCambiarHoraFin={setHorarioFin}
            />
          </div>

          <PrimaryButton
            type="button"
            onClick={crear}
            disabled={creando || !nombre.trim()}
            className="mt-3 flex items-center gap-2"
          >
            {creando && <Spinner size={14} />}
            Agregar sucursal
          </PrimaryButton>
        </div>
      </CanAccess>

      <div className="mt-4 flex items-center justify-end">
        <label className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
          <input
            type="checkbox"
            checked={mostrarInactivas}
            onChange={(e) => setMostrarInactivas(e.target.checked)}
          />
          Mostrar inactivas
        </label>
      </div>

      <div className="relative mt-2 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)]">
        {cargando && (
          <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-xl bg-[var(--color-bg-card)]/70 text-sm text-[var(--color-text-muted)]">
            <Spinner size={18} />
            Actualizando…
          </div>
        )}
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Dirección</th>
              <th className="px-4 py-2">Encargado</th>
              <th className="px-4 py-2">Asignado</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {sucursales.map((sucursal) => {
              const enUso =
                sucursal._count.usuarios > 0 ||
                sucursal._count.recursos > 0 ||
                sucursal._count.activos > 0
              return (
                <tr key={sucursal.id} className="border-t border-[var(--color-border)]">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <Avatar nombre={sucursal.nombre} fotoUrl={sucursal.imagenUrl} size={24} />
                      <Link
                        to={`/sucursales/${sucursal.id}`}
                        className="text-[var(--color-primario-legible)] hover:underline"
                      >
                        {sucursal.nombre}
                      </Link>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-[var(--color-text-muted)]">
                    {sucursal.direccion ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-[var(--color-text-muted)]">
                    {sucursal.encargado?.nombre ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-[var(--color-text-muted)]">
                    {enUso ? (
                      <>
                        {sucursal._count.usuarios > 0 && `${sucursal._count.usuarios} empleado(s)`}
                        {sucursal._count.usuarios > 0 &&
                          (sucursal._count.recursos > 0 || sucursal._count.activos > 0) &&
                          ' · '}
                        {sucursal._count.recursos > 0 && `${sucursal._count.recursos} recurso(s)`}
                        {sucursal._count.recursos > 0 && sucursal._count.activos > 0 && ' · '}
                        {sucursal._count.activos > 0 && `${sucursal._count.activos} activo(s)`}
                      </>
                    ) : (
                      <span className="text-[var(--color-text-faint)]">Sin uso</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        sucursal.activa
                          ? 'bg-green-100 text-green-700'
                          : 'bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]'
                      }`}
                    >
                      {sucursal.activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <CanAccess resource="sucursales" action="edit">
                        <button
                          type="button"
                          onClick={() => abrirEdicion(sucursal)}
                          title="Editar"
                          className="rounded p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)]"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => abrirModalUbicacion(sucursal)}
                          title={sucursal.latitud != null ? 'Ver ubicación' : 'Agregar ubicación'}
                          className={`rounded p-1.5 hover:bg-[var(--color-bg-subtle)] ${
                            sucursal.latitud != null
                              ? 'text-[var(--color-primario-legible)]'
                              : 'text-[var(--color-text-faint)]'
                          }`}
                        >
                          <MapPin size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => alternarActiva(sucursal)}
                          className="rounded px-2 py-1 text-xs text-[var(--color-primario-legible)] hover:bg-[var(--color-bg-subtle)]"
                        >
                          {sucursal.activa ? 'Desactivar' : 'Activar'}
                        </button>
                        {enUso ? (
                          <button
                            type="button"
                            disabled
                            title="Tiene empleados, recursos o activos asignados — desactívala en su lugar"
                            className="rounded p-1.5 text-[var(--color-text-faint)] opacity-40"
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => eliminar(sucursal)}
                            disabled={eliminandoId === sucursal.id}
                            title="Eliminar (sin uso)"
                            className="rounded p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            {eliminandoId === sucursal.id ? <Spinner size={14} /> : <Trash2 size={14} />}
                          </button>
                        )}
                      </CanAccess>
                    </div>
                  </td>
                </tr>
              )
            })}
            {sucursales.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-[var(--color-text-faint)]">
                  {cargando ? <CargandoPantalla minHeight={80} /> : 'Sin sucursales todavía'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {sucursales.some((s) => s.latitud != null) && (
        <div className="mt-4">
          <MapaMarcaciones
            puntos={sucursales
              .filter((s) => s.latitud != null && s.longitud != null)
              .map((s) => ({ id: s.id, lat: s.latitud!, lng: s.longitud!, titulo: s.nombre }))}
          />
        </div>
      )}

      {sucursalEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-xl bg-[var(--color-bg-card)] p-6 shadow-[var(--sombra-lg)]">
            <h2 className="text-base font-semibold text-[var(--color-text)]">Editar sucursal</h2>
            <div className="mt-4 flex flex-col gap-3">
              <ImageUploadField label="Foto (opcional)" value={imagenUrlEdit} onChange={setImagenUrlEdit} rounded />

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
                  Dirección
                </label>
                <input
                  value={direccionEdit}
                  onChange={(e) => setDireccionEdit(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                    Código SRI
                  </label>
                  <input
                    value={codigoEstablecimientoEdit}
                    onChange={(e) => setCodigoEstablecimientoEdit(e.target.value)}
                    placeholder="001"
                    maxLength={3}
                    className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                    Teléfono
                  </label>
                  <input
                    value={telefonoEdit}
                    onChange={(e) => setTelefonoEdit(e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                  />
                </div>
              </div>
              {usuarios.length > 0 && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                    Encargado
                  </label>
                  <select
                    value={encargadoIdEdit}
                    onChange={(e) => setEncargadoIdEdit(e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                  >
                    <option value="">Sin asignar</option>
                    {usuarios.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                {sucursalEdit.horarioAtencion && (
                  <p className="mb-1 text-xs text-[var(--color-text-faint)]">
                    Actual: {sucursalEdit.horarioAtencion} — marca los días abajo para reemplazarlo.
                  </p>
                )}
                <HorarioComposer
                  dias={horarioDiasEdit}
                  onCambiarDias={setHorarioDiasEdit}
                  horaInicio={horarioInicioEdit}
                  onCambiarHoraInicio={setHorarioInicioEdit}
                  horaFin={horarioFinEdit}
                  onCambiarHoraFin={setHorarioFinEdit}
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSucursalEdit(null)}
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

      {modalUbicacion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-[var(--color-bg-card)] p-6 shadow-[var(--sombra-lg)]">
            <h2 className="text-base font-semibold text-[var(--color-text)]">
              Ubicación de «{modalUbicacion.nombre}»
            </h2>

            <div className="mt-4">
              <MapaSeleccionUbicacion
                valor={ubicacionSeleccionada}
                onCambiar={(lat, lng) => setUbicacionSeleccionada({ lat, lng })}
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalUbicacion(null)}
                className="rounded px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]"
              >
                Cancelar
              </button>
              <CanAccess resource="sucursales" action="edit">
                <PrimaryButton
                  type="button"
                  onClick={guardarUbicacion}
                  disabled={guardandoUbicacion || !ubicacionSeleccionada}
                  className="flex items-center gap-2"
                >
                  {guardandoUbicacion && <Spinner size={14} />}
                  Guardar ubicación
                </PrimaryButton>
              </CanAccess>
            </div>
          </div>
        </div>
      )}

      {dialog}
    </div>
  )
}
