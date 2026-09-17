import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft,
  CalendarDays,
  ShoppingBag,
  Wallet,
  Boxes,
  Pencil,
  ArchiveRestore,
  Archive,
  MapPin,
} from 'lucide-react'
import { CanAccess } from '@refinedev/core'
import { axiosInstance } from '../../lib/axios'
import { CargandoPantalla } from '../../components/ui/CargandoPantalla'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { Spinner } from '../../components/ui/Spinner'
import { useConfirm } from '../../components/ui/ConfirmDialog'
import { MapaSeleccionUbicacion } from '../../components/ui/MapaSeleccionUbicacion'
import { MapaMarcaciones } from '../../components/ui/MapaMarcaciones'
import { SeguimientoFisico } from './SeguimientoFisico'

interface Cliente {
  id: string
  nombre: string
  email: string | null
  telefono: string | null
  notas: string | null
  etiqueta: string | null
  latitud: number | null
  longitud: number | null
  activo: boolean
  sexo: string | null
}

function mensajeError(error: unknown, fallback: string) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  )
}

interface Cita {
  id: string
  fechaInicio: string
  estado: string
  tipoCita: { nombre: string }
  recurso: { nombre: string }
}

interface OrdenItem {
  cantidad: number
  producto: { nombre: string }
}

interface Orden {
  id: string
  total: string
  creadoEn: string
  items: OrdenItem[]
}

interface MovimientoCuenta {
  id: string
  tipo: string
  monto: string
  fecha: string
  descripcion: string | null
  categoria: { nombre: string }
}

interface ActivoAsignado {
  id: string
  fechaAsignacion: string
  activo: { id: string; nombre: string }
}

interface Perfil {
  cliente: Cliente
  citas: Cita[]
  ordenes: Orden[]
  movimientosCuenta: MovimientoCuenta[]
  activosAsignados: ActivoAsignado[]
  resumen: { totalCitas: number; totalGastado: number; activosEnPosesion: number }
}

function Seccion({
  icono: Icono,
  titulo,
  children,
}: {
  icono: typeof CalendarDays
  titulo: string
  children: ReactNode
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[var(--sombra-sm)]">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
        <Icono size={16} />
        {titulo}
      </h2>
      <div className="mt-3 flex flex-col gap-2">{children}</div>
    </div>
  )
}

export function ClientePerfilPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { confirmar, dialog } = useConfirm()
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [cargando, setCargando] = useState(true)
  const [cambiandoActivo, setCambiandoActivo] = useState(false)

  const [modalUbicacion, setModalUbicacion] = useState(false)
  const [ubicacionSeleccionada, setUbicacionSeleccionada] = useState<{
    lat: number
    lng: number
  } | null>(null)
  const [guardandoUbicacion, setGuardandoUbicacion] = useState(false)

  const cargarPerfil = () =>
    axiosInstance
      .get<Perfil>(`/clientes/${id}/perfil`)
      .then(({ data }) => setPerfil(data))
      .catch(() => toast.error('No se pudo cargar el perfil del cliente'))

  useEffect(() => {
    if (!id) return
    cargarPerfil().finally(() => setCargando(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const alternarActivo = async () => {
    if (!perfil) return
    const { cliente } = perfil
    if (cliente.activo) {
      const confirmado = await confirmar(
        `Archivar a «${cliente.nombre}»`,
        'Dejará de aparecer en la lista de clientes, pero su historial se conserva y puedes reactivarlo cuando quieras.',
        'Archivar',
      )
      if (!confirmado) return
    }
    setCambiandoActivo(true)
    try {
      await axiosInstance.patch(`/clientes/${cliente.id}`, { activo: !cliente.activo })
      toast.success(cliente.activo ? 'Cliente archivado' : 'Cliente reactivado')
      await cargarPerfil()
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo actualizar el cliente'))
    } finally {
      setCambiandoActivo(false)
    }
  }

  const abrirModalUbicacion = () => {
    if (!perfil) return
    const { cliente } = perfil
    setUbicacionSeleccionada(
      cliente.latitud != null && cliente.longitud != null
        ? { lat: cliente.latitud, lng: cliente.longitud }
        : null,
    )
    setModalUbicacion(true)
  }

  const guardarUbicacion = async () => {
    if (!perfil || !ubicacionSeleccionada) return
    setGuardandoUbicacion(true)
    try {
      await axiosInstance.patch(`/clientes/${perfil.cliente.id}`, {
        latitud: ubicacionSeleccionada.lat,
        longitud: ubicacionSeleccionada.lng,
      })
      toast.success('Ubicación guardada')
      setModalUbicacion(false)
      await cargarPerfil()
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo guardar la ubicación'))
    } finally {
      setGuardandoUbicacion(false)
    }
  }

  if (cargando) {
    return <CargandoPantalla minHeight={300} />
  }

  if (!perfil) {
    return <p className="text-sm text-[var(--color-text-muted)]">Cliente no encontrado</p>
  }

  const { cliente, citas, ordenes, movimientosCuenta, activosAsignados, resumen } = perfil

  return (
    <div>
      {dialog}

      <Link
        to="/clientes"
        className="inline-flex items-center gap-1 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      >
        <ArrowLeft size={14} />
        Volver a clientes
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-[var(--color-text)]">{cliente.nombre}</h1>
            {cliente.etiqueta && (
              <span className="rounded bg-[var(--color-bg-muted)] px-1.5 py-0.5 text-xs font-medium text-[var(--color-text-muted)]">
                {cliente.etiqueta}
              </span>
            )}
            {!cliente.activo && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                Archivado
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {cliente.email ?? 'Sin email'} · {cliente.telefono ?? 'Sin teléfono'}
          </p>
          {cliente.notas && (
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">{cliente.notas}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <CanAccess resource="clientes" action="edit">
            <button
              type="button"
              onClick={() => navigate(`/clientes/${cliente.id}/editar`)}
              title="Editar cliente"
              className="rounded-lg p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)]"
            >
              <Pencil size={16} />
            </button>
            <button
              type="button"
              onClick={alternarActivo}
              disabled={cambiandoActivo}
              title={cliente.activo ? 'Archivar cliente' : 'Reactivar cliente'}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-50"
            >
              {cambiandoActivo ? (
                <Spinner size={14} />
              ) : cliente.activo ? (
                <Archive size={16} />
              ) : (
                <ArchiveRestore size={16} />
              )}
              {cambiandoActivo ? 'Actualizando…' : cliente.activo ? 'Archivar' : 'Reactivar'}
            </button>
          </CanAccess>
        </div>
      </div>

      {modalUbicacion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-[var(--color-bg-card)] p-6 shadow-[var(--sombra-lg)]">
            <h2 className="text-base font-semibold text-[var(--color-text)]">
              Ubicación de «{cliente.nombre}»
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
                onClick={() => setModalUbicacion(false)}
                className="rounded px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]"
              >
                Cancelar
              </button>
              <PrimaryButton
                type="button"
                onClick={guardarUbicacion}
                disabled={guardandoUbicacion || !ubicacionSeleccionada}
                className="flex items-center gap-2"
              >
                {guardandoUbicacion && <Spinner size={14} />}
                Guardar ubicación
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[var(--sombra-sm)]">
          <p className="text-xs text-[var(--color-text-muted)]">Total gastado</p>
          <p className="text-lg font-bold text-[var(--color-text)]">
            ${resumen.totalGastado.toFixed(2)}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[var(--sombra-sm)]">
          <p className="text-xs text-[var(--color-text-muted)]">Citas totales</p>
          <p className="text-lg font-bold text-[var(--color-text)]">{resumen.totalCitas}</p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[var(--sombra-sm)]">
          <p className="text-xs text-[var(--color-text-muted)]">Activos en su poder</p>
          <p className="text-lg font-bold text-[var(--color-text)]">{resumen.activosEnPosesion}</p>
        </div>
      </div>

      <SeguimientoFisico clienteId={cliente.id} tieneSexo={!!cliente.sexo} />

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {citas.length > 0 && (
          <Seccion icono={CalendarDays} titulo="Citas recientes">
            {citas.map((cita) => (
              <div key={cita.id} className="text-sm">
                <span className="text-[var(--color-text)]">{cita.tipoCita.nombre}</span>{' '}
                <span className="text-[var(--color-text-muted)]">
                  · {new Date(cita.fechaInicio).toLocaleString()} · {cita.estado}
                </span>
              </div>
            ))}
          </Seccion>
        )}

        {ordenes.length > 0 && (
          <Seccion icono={ShoppingBag} titulo="Ventas recientes">
            {ordenes.map((orden) => (
              <div key={orden.id} className="text-sm">
                <span className="font-medium text-[var(--color-text)]">
                  ${Number(orden.total).toFixed(2)}
                </span>{' '}
                <span className="text-[var(--color-text-muted)]">
                  · {new Date(orden.creadoEn).toLocaleDateString()} ·{' '}
                  {orden.items.map((i) => `${i.cantidad}× ${i.producto.nombre}`).join(', ')}
                </span>
              </div>
            ))}
          </Seccion>
        )}

        {movimientosCuenta.length > 0 && (
          <Seccion icono={Wallet} titulo="Movimientos en Cuentas">
            {movimientosCuenta.map((mov) => (
              <div key={mov.id} className="text-sm">
                <span
                  className={mov.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}
                >
                  {mov.tipo === 'ingreso' ? '+' : '-'}${Number(mov.monto).toFixed(2)}
                </span>{' '}
                <span className="text-[var(--color-text-muted)]">
                  · {mov.categoria.nombre} · {new Date(mov.fecha).toLocaleDateString()}
                </span>
              </div>
            ))}
          </Seccion>
        )}

        {activosAsignados.length > 0 && (
          <Seccion icono={Boxes} titulo="Activos en su poder">
            {activosAsignados.map((asignacion) => (
              <div key={asignacion.id} className="text-sm">
                <span className="text-[var(--color-text)]">{asignacion.activo.nombre}</span>{' '}
                <span className="text-[var(--color-text-muted)]">
                  · desde {new Date(asignacion.fechaAsignacion).toLocaleDateString()}
                </span>
              </div>
            ))}
          </Seccion>
        )}
      </div>

      {citas.length === 0 &&
        ordenes.length === 0 &&
        movimientosCuenta.length === 0 &&
        activosAsignados.length === 0 && (
          <p className="mt-6 text-sm text-[var(--color-text-faint)]">
            Este cliente todavía no tiene actividad registrada.
          </p>
        )}

      <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[var(--sombra-sm)]">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
            <MapPin size={16} />
            Ubicación
          </h2>
          <CanAccess resource="clientes" action="edit">
            <button
              type="button"
              onClick={abrirModalUbicacion}
              className="text-xs text-[var(--color-primario-legible)] hover:underline"
            >
              {cliente.latitud != null ? 'Editar ubicación' : 'Agregar ubicación'}
            </button>
          </CanAccess>
        </div>

        {cliente.latitud != null && cliente.longitud != null ? (
          <div className="mt-3">
            <MapaMarcaciones
              puntos={[{ id: cliente.id, lat: cliente.latitud, lng: cliente.longitud, titulo: cliente.nombre }]}
            />
          </div>
        ) : (
          <p className="mt-2 text-sm text-[var(--color-text-faint)]">
            Este cliente todavía no tiene una ubicación registrada.
          </p>
        )}
      </div>
    </div>
  )
}
