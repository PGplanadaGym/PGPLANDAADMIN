import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CanAccess, useGetIdentity } from '@refinedev/core'
import {
  ArrowLeft,
  Boxes,
  Fingerprint,
  Wallet2,
  Clock,
  Pencil,
  Copy,
  Send,
} from 'lucide-react'
import { axiosInstance } from '../../lib/axios'
import { mensajeError } from '../../lib/errores'
import { tiempoRelativo } from '../../lib/fechas'
import { buildAbility } from '../../ability/ability'
import type { Identity } from '../../lib/identity'
import { Avatar } from '../../components/ui/Avatar'
import { CargandoPantalla } from '../../components/ui/CargandoPantalla'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { Spinner } from '../../components/ui/Spinner'
import { useConfirm } from '../../components/ui/ConfirmDialog'

interface Rol {
  id: string
  nombre: string
}

interface Sucursal {
  id: string
  nombre: string
}

interface Usuario {
  id: string
  nombre: string
  email: string
  fotoUrl: string | null
  telefono: string | null
  cargo: string | null
  bio: string | null
  activo: boolean
  passwordConfigurada: boolean
  creadoEn: string
  sucursal: Sucursal | null
  roles: { rol: Rol }[]
}

interface ActivoAsignado {
  id: string
  fechaAsignacion: string
  activo: { id: string; nombre: string }
}

interface Marcacion {
  id: string
  tipo: string
  creadoEn: string
}

interface PagoNomina {
  id: string
  periodo: string
  totalPagado: string
  fechaPago: string
}

interface PerfilUsuario {
  usuario: Usuario
  activosAsignados: ActivoAsignado[]
  marcaciones: Marcacion[]
  pagosNomina: PagoNomina[]
  ultimoInicioSesion: string | null
}

const ETIQUETA_MARCACION: Record<string, string> = {
  entrada: 'Entrada',
  salida: 'Salida',
  inicio_comida: 'Inicio de comida',
  fin_comida: 'Fin de comida',
}

function Seccion({
  icono: Icono,
  titulo,
  accion,
  children,
}: {
  icono: typeof Boxes
  titulo: string
  accion?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[var(--sombra-sm)]">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
          <Icono size={16} />
          {titulo}
        </h2>
        {accion}
      </div>
      <div className="mt-3 flex flex-col gap-2">{children}</div>
    </div>
  )
}

export function UsuarioPerfilPage() {
  const { id } = useParams<{ id: string }>()
  const { data: identity } = useGetIdentity<Identity>()
  const ability = useMemo(() => buildAbility(identity?.permisos ?? []), [identity?.permisos])
  const puedeAsignarActivos = ability.can('activos.asignar', 'all')

  const { confirmar, dialog } = useConfirm()

  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null)
  const [cargando, setCargando] = useState(true)
  const [devolviendoActivos, setDevolviendoActivos] = useState(false)

  const [roles, setRoles] = useState<Rol[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])

  const [editando, setEditando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [reenviando, setReenviando] = useState(false)
  const [linkInvitacion, setLinkInvitacion] = useState<string | null>(null)

  const [formNombre, setFormNombre] = useState('')
  const [formCargo, setFormCargo] = useState('')
  const [formTelefono, setFormTelefono] = useState('')
  const [formBio, setFormBio] = useState('')
  const [formSucursalId, setFormSucursalId] = useState('')
  const [formRolIds, setFormRolIds] = useState<Set<string>>(new Set())

  const cargarPerfil = () =>
    axiosInstance
      .get<PerfilUsuario>(`/usuarios/${id}/perfil`)
      .then(({ data }) => setPerfil(data))

  const devolverTodosLosActivos = async () => {
    if (!id) return
    const confirmado = await confirmar(
      'Devolver todos los activos',
      '¿Devolver todos los activos asignados a este usuario? Quedarán disponibles en el inventario.',
      'Devolver todos',
    )
    if (!confirmado) return
    setDevolviendoActivos(true)
    try {
      const { data } = await axiosInstance.post<{ cantidad: number }>('/activos/devolver-todos', {
        usuarioId: id,
      })
      toast.success(`${data.cantidad} activo${data.cantidad > 1 ? 's' : ''} devuelto${data.cantidad > 1 ? 's' : ''}`)
      await cargarPerfil()
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudieron devolver los activos'))
    } finally {
      setDevolviendoActivos(false)
    }
  }

  useEffect(() => {
    if (!id) return
    setCargando(true)
    cargarPerfil()
      .catch(() => toast.error('No se pudo cargar el perfil del usuario'))
      .finally(() => setCargando(false))

    axiosInstance
      .get<{ id: string; empresaId: string | null; nombre: string }[]>('/roles')
      .then(({ data }) => setRoles(data.filter((r) => r.empresaId !== null)))
      .catch(() => {
        /* si no tiene permiso para ver roles, simplemente no se puede editar desde aquí */
      })
    axiosInstance
      .get<Sucursal[]>('/sucursales')
      .then(({ data }) => setSucursales(data))
      .catch(() => {
        /* módulo Sucursales puede no estar activo */
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const iniciarEdicion = () => {
    if (!perfil) return
    setFormNombre(perfil.usuario.nombre)
    setFormCargo(perfil.usuario.cargo ?? '')
    setFormTelefono(perfil.usuario.telefono ?? '')
    setFormBio(perfil.usuario.bio ?? '')
    setFormSucursalId(perfil.usuario.sucursal?.id ?? '')
    setFormRolIds(new Set(perfil.usuario.roles.map((r) => r.rol.id)))
    setEditando(true)
  }

  const alternarRolForm = (rolId: string) => {
    setFormRolIds((prev) => {
      const nuevo = new Set(prev)
      if (nuevo.has(rolId)) nuevo.delete(rolId)
      else nuevo.add(rolId)
      return nuevo
    })
  }

  const guardarEdicion = async () => {
    if (!perfil || !id) return
    setGuardando(true)
    try {
      const rolesOriginales = new Set(perfil.usuario.roles.map((r) => r.rol.id))
      const rolesCambiaron =
        rolesOriginales.size !== formRolIds.size ||
        [...rolesOriginales].some((r) => !formRolIds.has(r))
      const sucursalCambio = (perfil.usuario.sucursal?.id ?? '') !== formSucursalId

      await Promise.all([
        axiosInstance.patch(`/usuarios/${id}`, {
          nombre: formNombre,
          cargo: formCargo || undefined,
          telefono: formTelefono || undefined,
          bio: formBio || undefined,
        }),
        rolesCambiaron
          ? axiosInstance.patch(`/usuarios/${id}/roles`, { rolIds: [...formRolIds] })
          : Promise.resolve(),
        sucursalCambio
          ? axiosInstance.patch(`/usuarios/${id}/sucursal`, { sucursalId: formSucursalId || null })
          : Promise.resolve(),
      ])

      toast.success('Perfil actualizado')
      setEditando(false)
      await cargarPerfil()
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo guardar los cambios'))
    } finally {
      setGuardando(false)
    }
  }

  const reenviarInvitacion = async () => {
    if (!id) return
    setReenviando(true)
    try {
      const { data } = await axiosInstance.post<{ activarUrl: string }>(
        `/usuarios/${id}/reenviar-invitacion`,
      )
      setLinkInvitacion(data.activarUrl)
      toast.success('Invitación reenviada por correo')
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo reenviar la invitación'))
    } finally {
      setReenviando(false)
    }
  }

  const copiarLink = async () => {
    if (!linkInvitacion) return
    try {
      await navigator.clipboard.writeText(linkInvitacion)
      toast.success('Link copiado')
    } catch {
      toast.error('No se pudo copiar el link')
    }
  }

  if (cargando) {
    return <CargandoPantalla minHeight={300} />
  }

  if (!perfil) {
    return <p className="text-sm text-[var(--color-text-muted)]">Usuario no encontrado</p>
  }

  const { usuario, activosAsignados, marcaciones, pagosNomina, ultimoInicioSesion } = perfil

  return (
    <div>
      <Link
        to="/usuarios"
        className="inline-flex items-center gap-1 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      >
        <ArrowLeft size={14} />
        Volver a usuarios
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-start gap-3">
          <Avatar nombre={usuario.nombre} fotoUrl={usuario.fotoUrl} size={56} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-[var(--color-text)]">{usuario.nombre}</h1>
              <span
                className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                  usuario.activo
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]'
                }`}
              >
                {usuario.activo ? 'Activo' : 'Inactivo'}
              </span>
              {!usuario.passwordConfigurada && (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                  Invitación pendiente
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              {usuario.cargo ? `${usuario.cargo} · ` : ''}
              {usuario.email}
              {usuario.telefono ? ` · ${usuario.telefono}` : ''}
            </p>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              {usuario.roles.length > 0
                ? usuario.roles.map((r) => r.rol.nombre).join(', ')
                : 'Sin rol'}
              {usuario.sucursal ? ` · ${usuario.sucursal.nombre}` : ''}
            </p>
            <p className="mt-1 flex items-center gap-1 text-xs text-[var(--color-text-faint)]">
              <Clock size={12} />
              {ultimoInicioSesion
                ? `Última sesión ${tiempoRelativo(ultimoInicioSesion)}`
                : 'Nunca ha iniciado sesión'}
            </p>
            {usuario.bio && (
              <p className="mt-2 max-w-xl text-sm text-[var(--color-text-muted)]">{usuario.bio}</p>
            )}
          </div>
        </div>

        <CanAccess resource="usuarios" action="edit">
          <div className="flex shrink-0 flex-wrap gap-2">
            {!usuario.passwordConfigurada && (
              <button
                type="button"
                onClick={reenviarInvitacion}
                disabled={reenviando}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-50"
              >
                {reenviando ? <Spinner size={14} /> : <Send size={14} />}
                Reenviar invitación
              </button>
            )}
            {!editando && (
              <button
                type="button"
                onClick={iniciarEdicion}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]"
              >
                <Pencil size={14} />
                Editar
              </button>
            )}
          </div>
        </CanAccess>
      </div>

      {linkInvitacion && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <span className="min-w-0 flex-1 truncate">{linkInvitacion}</span>
          <button
            type="button"
            onClick={copiarLink}
            className="flex shrink-0 items-center gap-1 rounded-lg bg-amber-100 px-2 py-1 text-xs font-medium hover:bg-amber-200"
          >
            <Copy size={12} />
            Copiar
          </button>
        </div>
      )}

      {editando && (
        <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[var(--sombra-sm)]">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">Editar empleado</h2>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-text)]">
                Nombre
              </label>
              <input
                value={formNombre}
                onChange={(e) => setFormNombre(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-text)]">
                Cargo
              </label>
              <input
                value={formCargo}
                onChange={(e) => setFormCargo(e.target.value)}
                placeholder="Ej: Recepcionista"
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-text)]">
                Teléfono
              </label>
              <input
                value={formTelefono}
                onChange={(e) => setFormTelefono(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
              />
            </div>
            {sucursales.length > 0 && (
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--color-text)]">
                  Sucursal
                </label>
                <select
                  value={formSucursalId}
                  onChange={(e) => setFormSucursalId(e.target.value)}
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
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-[var(--color-text)]">
                Bio
              </label>
              <textarea
                value={formBio}
                onChange={(e) => setFormBio(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
              />
            </div>
          </div>

          {roles.length > 0 && (
            <div className="mt-4">
              <span className="mb-1 block text-xs font-medium text-[var(--color-text)]">
                Roles
              </span>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {roles.map((rol) => (
                  <label
                    key={rol.id}
                    className="flex items-center gap-1.5 text-sm text-[var(--color-text)]"
                  >
                    <input
                      type="checkbox"
                      checked={formRolIds.has(rol.id)}
                      onChange={() => alternarRolForm(rol.id)}
                    />
                    {rol.nombre}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditando(false)}
              className="rounded px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]"
            >
              Cancelar
            </button>
            <PrimaryButton
              type="button"
              onClick={guardarEdicion}
              disabled={guardando || !formNombre.trim()}
              className="flex items-center gap-2"
            >
              {guardando && <Spinner size={14} />}
              Guardar cambios
            </PrimaryButton>
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {activosAsignados.length > 0 && (
          <Seccion
            icono={Boxes}
            titulo="Activos asignados"
            accion={
              puedeAsignarActivos && (
                <button
                  type="button"
                  onClick={devolverTodosLosActivos}
                  disabled={devolviendoActivos}
                  className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-[var(--color-primario-legible)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-50"
                >
                  {devolviendoActivos && <Spinner size={12} />}
                  Devolver todos
                </button>
              )
            }
          >
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

        {marcaciones.length > 0 && (
          <Seccion icono={Fingerprint} titulo="Asistencia reciente">
            {marcaciones.map((marcacion) => (
              <div key={marcacion.id} className="text-sm">
                <span className="text-[var(--color-text)]">
                  {ETIQUETA_MARCACION[marcacion.tipo] ?? marcacion.tipo}
                </span>{' '}
                <span className="text-[var(--color-text-muted)]">
                  · {new Date(marcacion.creadoEn).toLocaleString()}
                </span>
              </div>
            ))}
          </Seccion>
        )}

        {pagosNomina.length > 0 && (
          <Seccion icono={Wallet2} titulo="Nómina reciente">
            {pagosNomina.map((pago) => (
              <div key={pago.id} className="text-sm">
                <span className="font-medium text-[var(--color-text)]">
                  ${Number(pago.totalPagado).toFixed(2)}
                </span>{' '}
                <span className="text-[var(--color-text-muted)]">
                  · {pago.periodo} · {new Date(pago.fechaPago).toLocaleDateString()}
                </span>
              </div>
            ))}
          </Seccion>
        )}

      </div>

      {activosAsignados.length === 0 &&
        marcaciones.length === 0 &&
        pagosNomina.length === 0 && (
          <p className="mt-6 text-sm text-[var(--color-text-faint)]">
            Este usuario todavía no tiene actividad registrada.
          </p>
        )}

      {dialog}
    </div>
  )
}
