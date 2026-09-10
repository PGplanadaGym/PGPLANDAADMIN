import { useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Users, Boxes, Wrench } from 'lucide-react'
import { axiosInstance } from '../../lib/axios'
import { CargandoPantalla } from '../../components/ui/CargandoPantalla'

interface Sucursal {
  id: string
  nombre: string
  direccion: string | null
  codigoEstablecimiento: string | null
  telefono: string | null
  encargado: { id: string; nombre: string } | null
  horarioAtencion: string | null
  activa: boolean
}

interface UsuarioBasico {
  id: string
  nombre: string
  email: string
  cargo: string | null
  activo: boolean
}

interface RecursoBasico {
  id: string
  nombre: string
  tipo: string
  activo: boolean
}

interface ActivoBasico {
  id: string
  nombre: string
  estado: string
  categoriaActivo: { nombre: string }
}

interface PerfilSucursal {
  sucursal: Sucursal
  usuarios: UsuarioBasico[]
  recursos: RecursoBasico[]
  activos: ActivoBasico[]
}

function Seccion({
  icono: Icono,
  titulo,
  children,
}: {
  icono: typeof Users
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

export function SucursalPerfilPage() {
  const { id } = useParams<{ id: string }>()
  const [perfil, setPerfil] = useState<PerfilSucursal | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (!id) return
    setCargando(true)
    axiosInstance
      .get<PerfilSucursal>(`/sucursales/${id}/perfil`)
      .then(({ data }) => setPerfil(data))
      .catch(() => toast.error('No se pudo cargar el perfil de la sucursal'))
      .finally(() => setCargando(false))
  }, [id])

  if (cargando) {
    return <CargandoPantalla minHeight={300} />
  }

  if (!perfil) {
    return (
      <div>
        <p className="text-sm text-[var(--color-text-faint)]">Sucursal no encontrada.</p>
      </div>
    )
  }

  const { sucursal, usuarios, recursos, activos } = perfil

  return (
    <div>
      <Link
        to="/sucursales"
        className="flex items-center gap-1 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      >
        <ArrowLeft size={14} />
        Volver a Sucursales
      </Link>

      <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[var(--sombra-sm)]">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-[var(--color-text)]">{sucursal.nombre}</h1>
          {!sucursal.activa && (
            <span className="rounded bg-[var(--color-bg-muted)] px-1.5 py-0.5 text-xs font-medium text-[var(--color-text-muted)]">
              Inactiva
            </span>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--color-text-muted)]">
          {sucursal.direccion && <span>{sucursal.direccion}</span>}
          {sucursal.codigoEstablecimiento && <span>Cod. SRI: {sucursal.codigoEstablecimiento}</span>}
          {sucursal.telefono && <span>Tel: {sucursal.telefono}</span>}
          {sucursal.encargado && <span>Encargado: {sucursal.encargado.nombre}</span>}
          {sucursal.horarioAtencion && <span>Horario: {sucursal.horarioAtencion}</span>}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Seccion icono={Users} titulo={`Empleados (${usuarios.length})`}>
          {usuarios.map((u) => (
            <div key={u.id} className="text-sm">
              <span className="text-[var(--color-text)]">{u.nombre}</span>{' '}
              <span className="text-[var(--color-text-muted)]">
                · {u.cargo ?? u.email}
                {!u.activo && ' · inactivo'}
              </span>
            </div>
          ))}
          {usuarios.length === 0 && (
            <p className="text-sm text-[var(--color-text-faint)]">Sin empleados asignados</p>
          )}
        </Seccion>

        <Seccion icono={Boxes} titulo={`Recursos (${recursos.length})`}>
          {recursos.map((r) => (
            <div key={r.id} className="text-sm">
              <span className="text-[var(--color-text)]">{r.nombre}</span>{' '}
              <span className="text-[var(--color-text-muted)]">
                · {r.tipo}
                {!r.activo && ' · inactivo'}
              </span>
            </div>
          ))}
          {recursos.length === 0 && (
            <p className="text-sm text-[var(--color-text-faint)]">Sin recursos asignados</p>
          )}
        </Seccion>

        <Seccion icono={Wrench} titulo={`Activos (${activos.length})`}>
          {activos.map((a) => (
            <div key={a.id} className="text-sm">
              <span className="text-[var(--color-text)]">{a.nombre}</span>{' '}
              <span className="text-[var(--color-text-muted)]">
                · {a.categoriaActivo.nombre} · {a.estado}
              </span>
            </div>
          ))}
          {activos.length === 0 && (
            <p className="text-sm text-[var(--color-text-faint)]">Sin activos asignados</p>
          )}
        </Seccion>
      </div>
    </div>
  )
}
