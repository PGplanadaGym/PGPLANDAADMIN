import { useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Boxes, Fingerprint, Wallet2 } from 'lucide-react'
import { axiosInstance } from '../../lib/axios'
import { Avatar } from '../../components/ui/Avatar'
import { CargandoPantalla } from '../../components/ui/CargandoPantalla'

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
  children,
}: {
  icono: typeof Boxes
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

export function UsuarioPerfilPage() {
  const { id } = useParams<{ id: string }>()
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (!id) return
    axiosInstance
      .get<PerfilUsuario>(`/usuarios/${id}/perfil`)
      .then(({ data }) => setPerfil(data))
      .catch(() => toast.error('No se pudo cargar el perfil del usuario'))
      .finally(() => setCargando(false))
  }, [id])

  if (cargando) {
    return <CargandoPantalla minHeight={300} />
  }

  if (!perfil) {
    return <p className="text-sm text-[var(--color-text-muted)]">Usuario no encontrado</p>
  }

  const { usuario, activosAsignados, marcaciones, pagosNomina } = perfil

  return (
    <div>
      <Link
        to="/usuarios"
        className="inline-flex items-center gap-1 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      >
        <ArrowLeft size={14} />
        Volver a usuarios
      </Link>

      <div className="mt-3 flex flex-wrap items-start gap-3">
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
          {usuario.bio && (
            <p className="mt-2 max-w-xl text-sm text-[var(--color-text-muted)]">{usuario.bio}</p>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {activosAsignados.length > 0 && (
          <Seccion icono={Boxes} titulo="Activos asignados">
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

      {activosAsignados.length === 0 && marcaciones.length === 0 && pagosNomina.length === 0 && (
        <p className="mt-6 text-sm text-[var(--color-text-faint)]">
          Este usuario todavía no tiene actividad registrada.
        </p>
      )}
    </div>
  )
}
