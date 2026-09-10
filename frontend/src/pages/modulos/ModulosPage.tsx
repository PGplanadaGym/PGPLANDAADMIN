import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { CanAccess, useGetIdentity } from '@refinedev/core'
import {
  Banknote,
  Boxes,
  Building2,
  Calculator,
  CalendarClock,
  Fingerprint,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { axiosInstance } from '../../lib/axios'
import { useModulos } from '../../providers/modulosContext'
import { CargandoPantalla } from '../../components/ui/CargandoPantalla'
import { useConfirm } from '../../components/ui/ConfirmDialog'
import { buildAbility } from '../../ability/ability'
import { mensajeError } from '../../lib/errores'
import type { Identity } from '../../lib/identity'

interface ModuloDetalle {
  id: string
  clave: string
  nombre: string
  descripcion?: string | null
  precioMensual: string | null
  activo: boolean
  usoCount: number
  dependeDe: string[]
  requeridoPor: string[]
}

interface Plantilla {
  clave: string
  nombre: string
  descripcion: string
  modulos: string[]
}

const ICONO_POR_CLAVE: Record<string, LucideIcon> = {
  clientes: Users,
  citas: CalendarClock,
  inventario: Boxes,
  asistencia: Fingerprint,
  cuentas: Wallet,
  costeo: Calculator,
  ventas: ShoppingCart,
  compras: Truck,
  sucursales: Building2,
  nomina: Banknote,
}

export function ModulosPage() {
  const { modulos, loading, refetch } = useModulos()
  const { data: identity } = useGetIdentity<Identity>()
  const { confirmar, dialog } = useConfirm()
  const [actualizando, setActualizando] = useState<string | null>(null)
  const [detalle, setDetalle] = useState<ModuloDetalle[]>([])
  const [plantillas, setPlantillas] = useState<Plantilla[]>([])
  const [aplicando, setAplicando] = useState<string | null>(null)

  const ability = useMemo(() => buildAbility(identity?.permisos ?? []), [identity?.permisos])
  const puedeEditar = ability.can('modulos.actualizar', 'all')

  const cargarDetalle = () =>
    axiosInstance
      .get<ModuloDetalle[]>('/modulos/detalle')
      .then(({ data }) => setDetalle(data))
      .catch(() => setDetalle([]))

  useEffect(() => {
    if (!puedeEditar) return
    cargarDetalle()
    axiosInstance
      .get<Plantilla[]>('/modulos/plantillas')
      .then(({ data }) => setPlantillas(data))
      .catch(() => setPlantillas([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puedeEditar])

  const detallePorClave = useMemo(
    () => new Map(detalle.map((d) => [d.clave, d])),
    [detalle],
  )

  const nombrePorClave = useMemo(
    () => new Map(modulos.map((m) => [m.clave, m.nombre])),
    [modulos],
  )

  const totalMensual = useMemo(
    () => detalle.filter((d) => d.activo).reduce((acc, d) => acc + Number(d.precioMensual ?? 0), 0),
    [detalle],
  )

  const aplicarPlantilla = async (plantilla: Plantilla) => {
    const confirmado = await confirmar(
      `¿Aplicar "${plantilla.nombre}"?`,
      `Se activarán estos módulos: ${plantilla.modulos.map((c) => nombrePorClave.get(c) ?? c).join(', ')}. Los que ya tengas activos no cambian.`,
      'Aplicar',
    )
    if (!confirmado) return

    setAplicando(plantilla.clave)
    try {
      const { data } = await axiosInstance.post<{ activados: string[] }>(
        `/modulos/plantillas/${plantilla.clave}/aplicar`,
      )
      await refetch()
      await cargarDetalle()
      if (data.activados.length === 0) {
        toast.success('Ya tenías todos esos módulos activos')
      } else {
        toast.success(`Activado: ${data.activados.join(', ')}`)
      }
    } catch (error) {
      toast.error(mensajeError(error, `No se pudo aplicar "${plantilla.nombre}"`))
    } finally {
      setAplicando(null)
    }
  }

  const toggle = async (clave: string, nombre: string, activo: boolean) => {
    if (activo) {
      const info = detallePorClave.get(clave)
      const partes = [`Se ocultará "${nombre}" del menú para todos los usuarios.`]
      if (info && info.usoCount > 0) {
        partes.push(
          `Tiene ${info.usoCount} registro${info.usoCount === 1 ? '' : 's'} guardado${info.usoCount === 1 ? '' : 's'}; no se eliminarán, solo se dejarán de mostrar.`,
        )
      }
      const confirmado = await confirmar(
        `¿Desactivar "${nombre}"?`,
        partes.join(' '),
        'Desactivar',
      )
      if (!confirmado) return
    }

    setActualizando(clave)
    try {
      const { data } = await axiosInstance.patch<{ dependenciasActivadas?: string[] }>(
        `/modulos/${clave}`,
        { activo: !activo },
      )
      await refetch()
      if (puedeEditar) await cargarDetalle()
      toast.success(`${nombre} ${!activo ? 'activado' : 'desactivado'}`)
      for (const nombreDep of data.dependenciasActivadas ?? []) {
        toast.info(`"${nombreDep}" se activó automáticamente porque "${nombre}" lo necesita.`)
      }
    } catch (error) {
      toast.error(mensajeError(error, `No se pudo actualizar "${nombre}"`))
    } finally {
      setActualizando(null)
    }
  }

  return (
    <div>
      {dialog}
      <h1 className="text-xl font-bold text-[var(--color-text)]">Módulos</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Activa o desactiva los módulos disponibles para esta empresa. Los
        cambios se reflejan de inmediato en el menú, sin reiniciar nada.
      </p>

      {puedeEditar && plantillas.length > 0 && (
        <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[var(--sombra-sm)]">
          <p className="text-sm font-semibold text-[var(--color-text)]">Plantillas por tipo de negocio</p>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            Activa de una vez el set típico de módulos para tu rubro.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {plantillas.map((plantilla) => (
              <div
                key={plantilla.clave}
                className="flex flex-col gap-2 rounded-lg border border-[var(--color-border)] p-3"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--color-text)]">{plantilla.nombre}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{plantilla.descripcion}</p>
                </div>
                <button
                  type="button"
                  onClick={() => aplicarPlantilla(plantilla)}
                  disabled={aplicando === plantilla.clave}
                  className="self-start rounded-lg border border-[var(--color-border)] px-2.5 py-1 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-50"
                >
                  {aplicando === plantilla.clave ? 'Aplicando…' : 'Aplicar'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {puedeEditar && detalle.length > 0 && (
        <p className="mt-3 text-sm text-[var(--color-text-muted)]">
          Total mensual con lo activo hoy: <span className="font-semibold text-[var(--color-text)]">${totalMensual.toFixed(2)}</span>
        </p>
      )}

      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)] p-4">
        {loading && <CargandoPantalla minHeight={80} />}

        {!loading && modulos.length === 0 && (
          <p className="text-sm text-[var(--color-text-faint)]">No hay módulos en el catálogo.</p>
        )}

        {modulos.map((modulo) => {
          const Icono = ICONO_POR_CLAVE[modulo.clave]
          const info = detallePorClave.get(modulo.clave)
          return (
            <div
              key={modulo.id}
              className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] py-3 last:border-b-0"
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                {Icono && (
                  <div className="mt-0.5 shrink-0 rounded-lg bg-[var(--color-bg-muted)] p-2 text-[var(--color-text-muted)]">
                    <Icono size={16} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--color-text)]">{modulo.nombre}</p>
                  {modulo.descripcion && (
                    <p className="truncate text-xs text-[var(--color-text-muted)]">{modulo.descripcion}</p>
                  )}
                  {info && info.dependeDe.length > 0 && (
                    <p className="mt-0.5 text-xs text-[var(--color-text-faint)]">
                      Requiere: {info.dependeDe.map((c) => nombrePorClave.get(c) ?? c).join(', ')}
                    </p>
                  )}
                  {info != null && info.usoCount > 0 && (
                    <p className="mt-0.5 text-xs text-[var(--color-text-faint)]">
                      {info.usoCount} registro{info.usoCount === 1 ? '' : 's'} guardado
                      {info.usoCount === 1 ? '' : 's'}
                    </p>
                  )}
                  {info?.precioMensual != null && (
                    <p className="mt-0.5 text-xs text-[var(--color-text-faint)]">
                      ${Number(info.precioMensual).toFixed(2)}/mes
                    </p>
                  )}
                </div>
              </div>
              <CanAccess
                resource="modulos"
                action="edit"
                fallback={
                  <span
                    className={`shrink-0 rounded px-3 py-1.5 text-sm font-medium ${
                      modulo.activo
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]'
                    }`}
                  >
                    {modulo.activo ? 'Activo' : 'Inactivo'}
                  </span>
                }
              >
                <button
                  type="button"
                  disabled={actualizando === modulo.clave}
                  onClick={() => toggle(modulo.clave, modulo.nombre, modulo.activo)}
                  className={`shrink-0 rounded px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
                    modulo.activo
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                      : 'bg-[var(--color-bg-muted)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)]'
                  }`}
                >
                  {modulo.activo ? 'Activo' : 'Inactivo'}
                </button>
              </CanAccess>
            </div>
          )
        })}
      </div>
    </div>
  )
}
