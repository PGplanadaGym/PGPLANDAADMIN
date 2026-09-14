import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Trash2, Pencil, AlertTriangle, Receipt } from 'lucide-react'
import { CanAccess, useGetIdentity } from '@refinedev/core'
import { axiosInstance } from '../../lib/axios'
import type { Identity } from '../../lib/identity'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { Spinner } from '../../components/ui/Spinner'
import { CargandoPantalla } from '../../components/ui/CargandoPantalla'
import { SearchInput } from '../../components/ui/SearchInput'
import { ExportarCSVButton } from '../../components/ui/ExportarCSVButton'
import { ComprobanteUploadField } from '../../components/ui/ComprobanteUploadField'
import { useConfirm } from '../../components/ui/ConfirmDialog'

const METODOS_PAGO = ['efectivo', 'transferencia', 'tarjeta', 'deuna', 'otro']
const TASA_IESS_PERSONAL = 0.0945

function rangoDelPeriodo(periodo: string) {
  const [anio, mes] = periodo.split('-').map(Number)
  const desde = new Date(anio, mes - 1, 1)
  const hasta = new Date(anio, mes, 0)
  return { desde: desde.toISOString().slice(0, 10), hasta: hasta.toISOString().slice(0, 10) }
}

interface UsuarioBasico {
  id: string
  nombre: string
  cargo: string | null
  activo: boolean
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
  movimientosCuenta: { id: string; metodoPago: string | null; numeroComprobante: string | null }[]
}

interface Marcacion {
  id: string
  tipo: string
  creadoEn: string
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
  const { confirmar, dialog } = useConfirm()
  const { data: identity } = useGetIdentity<Identity>()

  const [usuarios, setUsuarios] = useState<UsuarioBasico[]>([])
  const [categoriasEgreso, setCategoriasEgreso] = useState<CategoriaMovimiento[]>([])
  const [pagos, setPagos] = useState<PagoNomina[]>([])
  const [cargando, setCargando] = useState(true)
  const [cargandoPagos, setCargandoPagos] = useState(false)

  const [filtroPeriodo, setFiltroPeriodo] = useState(mesActual())
  const [busqueda, setBusqueda] = useState('')

  const [empleadoId, setEmpleadoId] = useState('')
  const [periodo, setPeriodo] = useState(mesActual())
  const [sueldoBase, setSueldoBase] = useState(0)
  const [bonos, setBonos] = useState(0)
  const [descuentos, setDescuentos] = useState(0)
  const [notas, setNotas] = useState('')
  const [categoriaEgresoId, setCategoriaEgresoId] = useState('')
  const [metodoPago, setMetodoPago] = useState(METODOS_PAGO[0])
  const [numeroComprobante, setNumeroComprobante] = useState('')
  const [comprobanteUrl, setComprobanteUrl] = useState('')
  const [registrando, setRegistrando] = useState(false)
  const [asistenciaResumen, setAsistenciaResumen] = useState<{
    diasTrabajados: number
    totalMarcaciones: number
  } | null>(null)
  const [cargandoAsistencia, setCargandoAsistencia] = useState(false)

  const [pagoEdit, setPagoEdit] = useState<PagoNomina | null>(null)
  const [sueldoBaseEdit, setSueldoBaseEdit] = useState(0)
  const [bonosEdit, setBonosEdit] = useState(0)
  const [descuentosEdit, setDescuentosEdit] = useState(0)
  const [notasEdit, setNotasEdit] = useState('')
  const [guardandoEdit, setGuardandoEdit] = useState(false)

  const cargarPagos = (periodoFiltro: string) =>
    axiosInstance
      .get<PagoNomina[]>('/nomina', { params: periodoFiltro ? { periodo: periodoFiltro } : {} })
      .then(({ data }) => setPagos(data))

  useEffect(() => {
    setCargando(true)
    Promise.all([
      axiosInstance.get<UsuarioBasico[]>('/usuarios').then(({ data }) => setUsuarios(data)),
      axiosInstance
        .get<CategoriaMovimiento[]>('/categorias-movimiento', { params: { tipo: 'egreso' } })
        .then(({ data }) => setCategoriasEgreso(data))
        .catch(() => {
          /* módulo Cuentas puede no estar activo */
        }),
    ])
      .catch(() => toast.error('No se pudo cargar la información'))
      .finally(() => setCargando(false))
  }, [])

  useEffect(() => {
    setCargandoPagos(true)
    cargarPagos(filtroPeriodo)
      .catch(() => toast.error('No se pudieron cargar los pagos'))
      .finally(() => setCargandoPagos(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroPeriodo])

  useEffect(() => {
    if (!empleadoId || !periodo) {
      setAsistenciaResumen(null)
      return
    }
    const { desde, hasta } = rangoDelPeriodo(periodo)
    setCargandoAsistencia(true)
    axiosInstance
      .get<Marcacion[]>('/asistencia', { params: { usuarioId: empleadoId, desde, hasta } })
      .then(({ data }) => {
        const diasTrabajados = new Set(
          data.filter((m) => m.tipo === 'entrada').map((m) => m.creadoEn.slice(0, 10)),
        ).size
        setAsistenciaResumen({ diasTrabajados, totalMarcaciones: data.length })
      })
      .catch(() => {
        // Módulo Asistencia puede no estar activo, o el usuario no tiene permiso — no es
        // bloqueante, la asistencia es solo una referencia informativa.
        setAsistenciaResumen(null)
      })
      .finally(() => setCargandoAsistencia(false))
  }, [empleadoId, periodo])

  const total = sueldoBase + bonos - descuentos

  const limpiarForm = () => {
    setEmpleadoId('')
    setSueldoBase(0)
    setBonos(0)
    setDescuentos(0)
    setNotas('')
    setCategoriaEgresoId('')
    setMetodoPago(METODOS_PAGO[0])
    setNumeroComprobante('')
    setComprobanteUrl('')
  }

  const registrarPago = async () => {
    if (!empleadoId || !periodo || sueldoBase <= 0) return

    const yaPagado = pagos.some((p) => p.empleado.id === empleadoId && p.periodo === periodo)
    if (yaPagado) {
      const empleadoNombre = usuarios.find((u) => u.id === empleadoId)?.nombre ?? 'este empleado'
      const confirmado = await confirmar(
        'Pago posiblemente duplicado',
        `Ya existe un pago registrado a ${empleadoNombre} en el periodo ${periodo}. ¿Registrar otro de todas formas?`,
        'Registrar de todas formas',
      )
      if (!confirmado) return
    }

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
        metodoPago: categoriaEgresoId ? metodoPago : undefined,
        numeroComprobante: categoriaEgresoId ? numeroComprobante || undefined : undefined,
        comprobanteUrl: categoriaEgresoId ? comprobanteUrl || undefined : undefined,
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

  const abrirEdicion = (pago: PagoNomina) => {
    setPagoEdit(pago)
    setSueldoBaseEdit(Number(pago.sueldoBase))
    setBonosEdit(Number(pago.bonos))
    setDescuentosEdit(Number(pago.descuentos))
    setNotasEdit(pago.notas ?? '')
  }

  const guardarEdicion = async () => {
    if (!pagoEdit || sueldoBaseEdit <= 0) return
    setGuardandoEdit(true)
    try {
      await axiosInstance.patch(`/nomina/${pagoEdit.id}`, {
        sueldoBase: sueldoBaseEdit,
        bonos: bonosEdit,
        descuentos: descuentosEdit,
        notas: notasEdit || undefined,
      })
      toast.success('Pago actualizado')
      setPagoEdit(null)
      await cargarPagos(filtroPeriodo)
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo actualizar el pago'))
    } finally {
      setGuardandoEdit(false)
    }
  }

  const eliminarPago = async (pago: PagoNomina) => {
    const confirmado = await confirmar(
      'Eliminar pago',
      `¿Eliminar el pago de $${Number(pago.totalPagado).toFixed(2)} a ${pago.empleado.nombre}?`,
      'Eliminar',
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

  const imprimirRecibo = (pago: PagoNomina) => {
    const ventana = window.open('', '_blank', 'width=380,height=600')
    if (!ventana) return
    const metodoPagoPago = pago.movimientosCuenta[0]?.metodoPago
    const empresa = identity?.empresa
    ventana.document.write(`<!doctype html>
<html><head><title>Rol de pago</title><style>
  body { font-family: monospace; padding: 16px; color: #111; }
  h1 { font-size: 16px; margin: 0 0 4px; }
  p { margin: 2px 0; font-size: 12px; }
  .encabezado { border-bottom: 1px dashed #111; padding-bottom: 8px; margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
  td { padding: 3px 0; }
  .total { border-top: 1px dashed #111; margin-top: 8px; padding-top: 6px; font-weight: bold; display: flex; justify-content: space-between; }
</style></head><body>
  ${
    empresa
      ? `<div class="encabezado">
    <h1>${empresa.razonSocial || empresa.nombre}</h1>
    ${empresa.ruc ? `<p>RUC: ${empresa.ruc}</p>` : ''}
    ${empresa.direccion ? `<p>${empresa.direccion}</p>` : ''}
    ${empresa.telefono ? `<p>Tel: ${empresa.telefono}</p>` : ''}
  </div>`
      : '<h1>Rol de pago</h1>'
  }
  <p>Periodo: ${pago.periodo}</p>
  <p>Empleado: ${pago.empleado.nombre}${pago.empleado.cargo ? ` (${pago.empleado.cargo})` : ''}</p>
  <p>Fecha de pago: ${new Date(pago.fechaPago).toLocaleDateString()}</p>
  ${metodoPagoPago ? `<p>Método de pago: ${metodoPagoPago}</p>` : ''}
  <table>
    <tr><td>Sueldo base</td><td style="text-align:right">$${Number(pago.sueldoBase).toFixed(2)}</td></tr>
    <tr><td>Bonos</td><td style="text-align:right">$${Number(pago.bonos).toFixed(2)}</td></tr>
    <tr><td>Descuentos</td><td style="text-align:right">-$${Number(pago.descuentos).toFixed(2)}</td></tr>
  </table>
  <div class="total"><span>Total pagado</span><span>$${Number(pago.totalPagado).toFixed(2)}</span></div>
  ${pago.notas ? `<p style="margin-top:8px">Notas: ${pago.notas}</p>` : ''}
</body></html>`)
    ventana.document.close()
    ventana.focus()
    ventana.print()
  }

  const registrarPagoRapido = (empleado: UsuarioBasico) => {
    setEmpleadoId(empleado.id)
    setPeriodo(filtroPeriodo || mesActual())
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const pagosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return pagos
    return pagos.filter((p) => p.empleado.nombre.toLowerCase().includes(q))
  }, [busqueda, pagos])

  const empleadosSinPago = useMemo(() => {
    if (!filtroPeriodo) return []
    return usuarios.filter(
      (u) => u.activo && !pagos.some((p) => p.empleado.id === u.id && p.periodo === filtroPeriodo),
    )
  }, [usuarios, pagos, filtroPeriodo])

  const filasExportar = pagosFiltrados.map((p) => ({
    empleado: p.empleado.nombre,
    cargo: p.empleado.cargo ?? '',
    periodo: p.periodo,
    sueldoBase: p.sueldoBase,
    bonos: p.bonos,
    descuentos: p.descuentos,
    totalPagado: p.totalPagado,
    fechaPago: new Date(p.fechaPago).toLocaleDateString(),
    metodoPago: p.movimientosCuenta[0]?.metodoPago ?? '',
    notas: p.notas ?? '',
  }))

  const totalPeriodo = pagos.reduce((suma, p) => suma + Number(p.totalPagado), 0)

  if (cargando) {
    return <CargandoPantalla minHeight={300} />
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
            {sueldoBase > 0 && (
              <button
                type="button"
                onClick={() => setDescuentos(Math.round(sueldoBase * TASA_IESS_PERSONAL * 100) / 100)}
                className="mt-1 text-xs text-[var(--color-primario-legible)] hover:underline"
              >
                Usar aporte IESS sugerido (9.45%): ${(sueldoBase * TASA_IESS_PERSONAL).toFixed(2)}
              </button>
            )}
          </div>

          {(asistenciaResumen || cargandoAsistencia) && (
            <div className="sm:col-span-2 lg:col-span-3 rounded-lg bg-[var(--color-bg-subtle)] px-3 py-2 text-xs text-[var(--color-text-muted)]">
              {cargandoAsistencia
                ? 'Consultando asistencia…'
                : asistenciaResumen &&
                  `Asistencia de referencia en ${periodo}: ${asistenciaResumen.diasTrabajados} día(s) con entrada registrada (${asistenciaResumen.totalMarcaciones} marcaciones en total). No afecta el cálculo del pago.`}
            </div>
          )}

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

          {categoriaEgresoId && (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--color-text)]">
                  Método de pago
                </label>
                <select
                  value={metodoPago}
                  onChange={(e) => setMetodoPago(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                >
                  {METODOS_PAGO.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--color-text)]">
                  N° de comprobante (opcional)
                </label>
                <input
                  value={numeroComprobante}
                  onChange={(e) => setNumeroComprobante(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <ComprobanteUploadField value={comprobanteUrl} onChange={setComprobanteUrl} />
              </div>
            </>
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
          <CanAccess resource="nomina" action="create">
            <PrimaryButton
              type="button"
              onClick={registrarPago}
              disabled={registrando || !empleadoId || !periodo || sueldoBase <= 0}
              className="flex items-center gap-2"
            >
              {registrando && <Spinner size={14} />}
              Registrar pago
            </PrimaryButton>
          </CanAccess>
        </div>
      </div>

      {empleadosSinPago.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-800">
            <AlertTriangle size={16} />
            {empleadosSinPago.length} empleado(s) sin pago registrado en {filtroPeriodo}
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {empleadosSinPago.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => registrarPagoRapido(u)}
                className="rounded-lg border border-amber-300 bg-white px-2 py-1 text-xs text-amber-800 hover:bg-amber-100"
              >
                {u.nombre}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-[var(--color-text)]">Pagos registrados</h2>
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput value={busqueda} onChange={setBusqueda} placeholder="Buscar por empleado…" />
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
          <ExportarCSVButton nombreArchivo="nomina.csv" filas={filasExportar} />
        </div>
      </div>

      {filtroPeriodo && (
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Total pagado en {filtroPeriodo}: <strong>${totalPeriodo.toFixed(2)}</strong>
        </p>
      )}

      <div className="relative mt-3 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)]">
        {cargandoPagos && (
          <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-xl bg-[var(--color-bg-card)]/70 text-sm text-[var(--color-text-muted)]">
            <Spinner size={18} />
            Actualizando…
          </div>
        )}
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
            {pagosFiltrados.map((pago) => (
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
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => imprimirRecibo(pago)}
                      title="Imprimir rol de pago"
                      className="rounded p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)]"
                    >
                      <Receipt size={14} />
                    </button>
                    <CanAccess resource="nomina" action="edit">
                      <button
                        type="button"
                        onClick={() => abrirEdicion(pago)}
                        title="Editar"
                        className="rounded p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)]"
                      >
                        <Pencil size={14} />
                      </button>
                    </CanAccess>
                    <CanAccess resource="nomina" action="delete">
                      <button
                        type="button"
                        onClick={() => eliminarPago(pago)}
                        className="rounded p-1.5 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </CanAccess>
                  </div>
                </td>
              </tr>
            ))}
            {pagosFiltrados.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-[var(--color-text-faint)]">
                  {cargandoPagos ? (
                    <CargandoPantalla minHeight={80} />
                  ) : busqueda ? (
                    'Sin resultados para tu búsqueda'
                  ) : (
                    'Sin pagos registrados en este periodo'
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pagoEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-xl bg-[var(--color-bg-card)] p-6 shadow-[var(--sombra-lg)]">
            <h2 className="text-base font-semibold text-[var(--color-text)]">
              Editar pago de «{pagoEdit.empleado.nombre}»
            </h2>
            <p className="mt-1 text-xs text-[var(--color-text-faint)]">
              Periodo {pagoEdit.periodo} — el empleado y el periodo no se pueden cambiar aquí;
              elimina el pago y regístralo de nuevo si te equivocaste en eso.
            </p>

            <div className="mt-4 flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                  Sueldo base ($)
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={sueldoBaseEdit}
                  onChange={(e) => setSueldoBaseEdit(Number(e.target.value))}
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                    Bonos ($)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={bonosEdit}
                    onChange={(e) => setBonosEdit(Number(e.target.value))}
                    className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                    Descuentos ($)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={descuentosEdit}
                    onChange={(e) => setDescuentosEdit(Number(e.target.value))}
                    className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                  Notas
                </label>
                <input
                  value={notasEdit}
                  onChange={(e) => setNotasEdit(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                />
              </div>
              <div className="text-sm font-semibold text-[var(--color-text)]">
                Total: ${(sueldoBaseEdit + bonosEdit - descuentosEdit).toFixed(2)}
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPagoEdit(null)}
                className="rounded px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]"
              >
                Cancelar
              </button>
              <PrimaryButton
                type="button"
                onClick={guardarEdicion}
                disabled={guardandoEdit || sueldoBaseEdit <= 0}
                className="flex items-center gap-2"
              >
                {guardandoEdit && <Spinner size={14} />}
                {guardandoEdit ? 'Guardando…' : 'Guardar cambios'}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {dialog}
    </div>
  )
}
