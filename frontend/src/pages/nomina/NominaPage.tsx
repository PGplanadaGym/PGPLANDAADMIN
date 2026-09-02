import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import { axiosInstance } from '../../lib/axios'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { Spinner } from '../../components/ui/Spinner'

interface UsuarioBasico {
  id: string
  nombre: string
  cargo: string | null
}

interface CategoriaMovimiento {
  id: string
  nombre: string
}

interface PagoNomina {
  id: string
  periodo: string
  sueldoBase: string
  bonos: string
  descuentos: string
  totalPagado: string
  fechaPago: string
  notas: string | null
  empleado: UsuarioBasico
  registradoPor: { id: string; nombre: string }
}

function mesActual() {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
}

function mensajeError(error: unknown, fallback: string) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  )
}

export function NominaPage() {
  const [usuarios, setUsuarios] = useState<UsuarioBasico[]>([])
  const [categoriasEgreso, setCategoriasEgreso] = useState<CategoriaMovimiento[]>([])
  const [pagos, setPagos] = useState<PagoNomina[]>([])
  const [cargando, setCargando] = useState(true)

  const [filtroPeriodo, setFiltroPeriodo] = useState(mesActual())

  const [empleadoId, setEmpleadoId] = useState('')
  const [periodo, setPeriodo] = useState(mesActual())
  const [sueldoBase, setSueldoBase] = useState(0)
  const [bonos, setBonos] = useState(0)
  const [descuentos, setDescuentos] = useState(0)
  const [notas, setNotas] = useState('')
  const [categoriaEgresoId, setCategoriaEgresoId] = useState('')
  const [registrando, setRegistrando] = useState(false)

  const cargarPagos = (periodoFiltro: string) =>
    axiosInstance
      .get<PagoNomina[]>('/nomina', { params: periodoFiltro ? { periodo: periodoFiltro } : {} })
      .then(({ data }) => setPagos(data))

  useEffect(() => {
    Promise.all([
      axiosInstance.get<UsuarioBasico[]>('/usuarios').then(({ data }) => setUsuarios(data)),
      axiosInstance
        .get<CategoriaMovimiento[]>('/categorias-movimiento', { params: { tipo: 'egreso' } })
        .then(({ data }) => setCategoriasEgreso(data))
        .catch(() => {
          /* módulo Cuentas puede no estar activo */
        }),
    ]).catch(() => toast.error('No se pudo cargar la información'))
  }, [])

  useEffect(() => {
    setCargando(true)
    cargarPagos(filtroPeriodo)
      .catch(() => toast.error('No se pudieron cargar los pagos'))
      .finally(() => setCargando(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroPeriodo])

  const total = sueldoBase + bonos - descuentos

  const limpiarForm = () => {
    setEmpleadoId('')
    setSueldoBase(0)
    setBonos(0)
    setDescuentos(0)
    setNotas('')
    setCategoriaEgresoId('')
  }

  const registrarPago = async () => {
    if (!empleadoId || !periodo || sueldoBase <= 0) return
    setRegistrando(true)
    try {
      await axiosInstance.post('/nomina', {
        empleadoId,
        periodo,
        sueldoBase,
        bonos: bonos || undefined,
        descuentos: descuentos || undefined,
        notas: notas || undefined,
        categoriaEgresoId: categoriaEgresoId || undefined,
      })
      toast.success('Pago registrado')
      limpiarForm()
      await cargarPagos(filtroPeriodo)
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo registrar el pago'))
    } finally {
      setRegistrando(false)
    }
  }

  const eliminarPago = async (pago: PagoNomina) => {
    const confirmado = window.confirm(
      `¿Eliminar el pago de $${Number(pago.totalPagado).toFixed(2)} a ${pago.empleado.nombre}?`,
    )
    if (!confirmado) return
    try {
      await axiosInstance.delete(`/nomina/${pago.id}`)
      toast.success('Pago eliminado')
      await cargarPagos(filtroPeriodo)
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo eliminar el pago'))
    }
  }

  const totalPeriodo = pagos.reduce((suma, p) => suma + Number(p.totalPagado), 0)

  if (cargando) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
        <Spinner size={16} />
        Cargando…
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--color-text)]">Nómina</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Registro simple de pagos a empleados por periodo. No calcula automáticamente IESS,
        décimos ni fondos de reserva — tú defines los montos.
      </p>

      <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[var(--sombra-sm)]">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">Registrar pago</h2>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-text)]">
              Empleado
            </label>
            <select
              value={empleadoId}
              onChange={(e) => setEmpleadoId(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
            >
              <option value="">Selecciona…</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                  {u.cargo ? ` · ${u.cargo}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-text)]">
              Periodo
            </label>
            <input
              type="month"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-text)]">
              Sueldo base ($)
            </label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={sueldoBase}
              onChange={(e) => setSueldoBase(Number(e.target.value))}
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-text)]">
              Bonos ($)
            </label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={bonos}
              onChange={(e) => setBonos(Number(e.target.value))}
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-text)]">
              Descuentos ($)
            </label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={descuentos}
              onChange={(e) => setDescuentos(Number(e.target.value))}
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
            />
          </div>

          {categoriasEgreso.length > 0 && (
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-text)]">
                Registrar como egreso en Cuentas (opcional)
              </label>
              <select
                value={categoriaEgresoId}
                onChange={(e) => setCategoriaEgresoId(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
              >
                <option value="">No registrar</option>
                {categoriasEgreso.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="sm:col-span-2 lg:col-span-3">
            <label className="mb-1 block text-xs font-medium text-[var(--color-text)]">
              Notas (opcional)
            </label>
            <input
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-[var(--color-text)]">
            Total a pagar: ${total.toFixed(2)}
          </span>
          <PrimaryButton
            type="button"
            onClick={registrarPago}
            disabled={registrando || !empleadoId || !periodo || sueldoBase <= 0}
            className="flex items-center gap-2"
          >
            {registrando && <Spinner size={14} />}
            Registrar pago
          </PrimaryButton>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-base font-semibold text-[var(--color-text)]">Pagos registrados</h2>
        <div className="flex items-center gap-2">
          <label className="text-xs text-[var(--color-text-muted)]">Periodo:</label>
          <input
            type="month"
            value={filtroPeriodo}
            onChange={(e) => setFiltroPeriodo(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm focus:border-[var(--color-primario)] focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setFiltroPeriodo('')}
            className="text-xs text-[var(--color-primario-legible)] hover:underline"
          >
            Ver todos
          </button>
        </div>
      </div>

      {filtroPeriodo && (
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Total pagado en {filtroPeriodo}: <strong>${totalPeriodo.toFixed(2)}</strong>
        </p>
      )}

      <div className="mt-3 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-2">Empleado</th>
              <th className="px-4 py-2">Periodo</th>
              <th className="px-4 py-2">Sueldo base</th>
              <th className="px-4 py-2">Bonos</th>
              <th className="px-4 py-2">Descuentos</th>
              <th className="px-4 py-2">Total</th>
              <th className="px-4 py-2">Fecha de pago</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {pagos.map((pago) => (
              <tr key={pago.id} className="border-t border-[var(--color-border)]">
                <td className="px-4 py-2">{pago.empleado.nombre}</td>
                <td className="px-4 py-2">{pago.periodo}</td>
                <td className="px-4 py-2 text-[var(--color-text-muted)]">
                  ${Number(pago.sueldoBase).toFixed(2)}
                </td>
                <td className="px-4 py-2 text-[var(--color-text-muted)]">
                  ${Number(pago.bonos).toFixed(2)}
                </td>
                <td className="px-4 py-2 text-[var(--color-text-muted)]">
                  ${Number(pago.descuentos).toFixed(2)}
                </td>
                <td className="px-4 py-2 font-medium">${Number(pago.totalPagado).toFixed(2)}</td>
                <td className="px-4 py-2 text-[var(--color-text-muted)]">
                  {new Date(pago.fechaPago).toLocaleDateString()}
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => eliminarPago(pago)}
                    className="rounded p-1.5 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {pagos.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-[var(--color-text-faint)]">
                  Sin pagos registrados en este periodo
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
