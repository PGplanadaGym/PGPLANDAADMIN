import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { CanAccess } from '@refinedev/core'
import { Ruler, Plus, Pencil, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { axiosInstance } from '../../lib/axios'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { Spinner } from '../../components/ui/Spinner'
import { CargandoPantalla } from '../../components/ui/CargandoPantalla'
import { useConfirm } from '../../components/ui/ConfirmDialog'

interface Calculos {
  imc: number
  clasificacionImc: string
  pesoIdealMin: number
  pesoIdealMax: number
  sobrepesoKg: number
  porcentajeGrasa: number | null
}

interface Medicion {
  id: string
  fecha: string
  peso: string
  talla: string
  perimetroCuello: string | null
  perimetroCintura: string | null
  perimetroCadera: string | null
  perimetroPecho: string | null
  masaMuscular: string | null
  notas: string | null
  calculos: Calculos
}

interface FormularioMedicion {
  id: string | null
  fecha: string
  peso: string
  talla: string
  perimetroCuello: string
  perimetroCintura: string
  perimetroCadera: string
  perimetroPecho: string
  masaMuscular: string
  notas: string
}

const FORMULARIO_VACIO: FormularioMedicion = {
  id: null,
  fecha: new Date().toISOString().slice(0, 10),
  peso: '',
  talla: '',
  perimetroCuello: '',
  perimetroCintura: '',
  perimetroCadera: '',
  perimetroPecho: '',
  masaMuscular: '',
  notas: '',
}

function mensajeError(error: unknown, fallback: string) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  )
}

/** Mismo método naval de EE.UU. que usa el backend — solo para dar una vista previa
 * en vivo mientras se llena el formulario, antes de guardar. */
function calcularGrasaPreview(
  sexo: string | null,
  cuello: string,
  cintura: string,
  cadera: string,
  talla: string,
): number | null {
  const t = Number(talla)
  const c = Number(cuello)
  const ci = Number(cintura)
  if (!sexo || !t || !c || !ci) return null

  if (sexo === 'M') {
    const diferencia = ci - c
    if (diferencia <= 0) return null
    const valor = 495 / (1.0324 - 0.19077 * Math.log10(diferencia) + 0.15456 * Math.log10(t)) - 450
    return Math.round(valor * 10) / 10
  }

  const ca = Number(cadera)
  if (!ca) return null
  const suma = ci + ca - c
  if (suma <= 0) return null
  const valor = 495 / (1.29579 - 0.35004 * Math.log10(suma) + 0.221 * Math.log10(t)) - 450
  return Math.round(valor * 10) / 10
}

function claseClasificacion(clasificacion: string) {
  if (clasificacion === 'Normal') return 'bg-emerald-100 text-emerald-700'
  if (clasificacion === 'Bajo peso') return 'bg-sky-100 text-sky-700'
  if (clasificacion === 'Sobrepeso') return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-700'
}

export function SeguimientoFisico({
  clienteId,
  sexo,
}: {
  clienteId: string
  sexo: string | null
}) {
  const tieneSexo = !!sexo
  const { confirmar, dialog } = useConfirm()
  const [mediciones, setMediciones] = useState<Medicion[] | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [form, setForm] = useState<FormularioMedicion>(FORMULARIO_VACIO)
  const [guardando, setGuardando] = useState(false)
  const [mostrarPerimetros, setMostrarPerimetros] = useState(false)

  const cargar = () =>
    axiosInstance
      .get<Medicion[]>('/mediciones', { params: { clienteId } })
      .then(({ data }) => setMediciones(data))
      .catch(() => toast.error('No se pudo cargar el seguimiento físico'))

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId])

  const abrirNueva = () => {
    setForm(FORMULARIO_VACIO)
    setModalAbierto(true)
  }

  const abrirEditar = (m: Medicion) => {
    setForm({
      id: m.id,
      fecha: m.fecha.slice(0, 10),
      peso: m.peso,
      talla: m.talla,
      perimetroCuello: m.perimetroCuello ?? '',
      perimetroCintura: m.perimetroCintura ?? '',
      perimetroCadera: m.perimetroCadera ?? '',
      perimetroPecho: m.perimetroPecho ?? '',
      masaMuscular: m.masaMuscular ?? '',
      notas: m.notas ?? '',
    })
    setModalAbierto(true)
  }

  const eliminar = async (m: Medicion) => {
    const confirmado = await confirmar(
      'Eliminar medición',
      `Se eliminará la medición del ${new Date(m.fecha).toLocaleDateString()}. Esta acción no se puede deshacer.`,
      'Eliminar',
    )
    if (!confirmado) return
    try {
      await axiosInstance.delete(`/mediciones/${m.id}`)
      toast.success('Medición eliminada')
      cargar()
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo eliminar la medición'))
    }
  }

  const guardar = async () => {
    if (!form.peso || !form.talla) {
      toast.error('Peso y talla son obligatorios')
      return
    }
    setGuardando(true)
    const payload = {
      clienteId,
      fecha: form.fecha,
      peso: Number(form.peso),
      talla: Number(form.talla),
      perimetroCuello: form.perimetroCuello ? Number(form.perimetroCuello) : undefined,
      perimetroCintura: form.perimetroCintura ? Number(form.perimetroCintura) : undefined,
      perimetroCadera: form.perimetroCadera ? Number(form.perimetroCadera) : undefined,
      perimetroPecho: form.perimetroPecho ? Number(form.perimetroPecho) : undefined,
      masaMuscular: form.masaMuscular ? Number(form.masaMuscular) : undefined,
      notas: form.notas || undefined,
    }
    try {
      if (form.id) {
        await axiosInstance.patch(`/mediciones/${form.id}`, payload)
        toast.success('Medición actualizada')
      } else {
        await axiosInstance.post('/mediciones', payload)
        toast.success('Medición registrada')
      }
      setModalAbierto(false)
      cargar()
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo guardar la medición'))
    } finally {
      setGuardando(false)
    }
  }

  if (mediciones === null) {
    return <CargandoPantalla minHeight={200} />
  }

  const ultima = mediciones[mediciones.length - 1] ?? null
  const primera = mediciones[0] ?? null
  const diferenciaKg = ultima && primera ? Number(ultima.peso) - Number(primera.peso) : null

  const datosGrafica = mediciones.map((m) => ({
    fecha: new Date(m.fecha).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' }),
    peso: Number(m.peso),
    grasa: m.calculos.porcentajeGrasa,
  }))
  const hayDatosGrasa = datosGrafica.some((d) => d.grasa != null)

  return (
    <div>
      {dialog}
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
          <Ruler size={16} />
          Seguimiento físico
        </h2>
        <CanAccess resource="mediciones" action="create">
          <button
            type="button"
            onClick={abrirNueva}
            className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]"
          >
            <Plus size={14} />
            Nueva medición
          </button>
        </CanAccess>
      </div>

      {!tieneSexo && (
        <p className="mt-2 text-xs text-[var(--color-text-faint)]">
          Este cliente no tiene el sexo registrado — el % de grasa corporal no se puede calcular
          hasta que lo edites en su ficha.
        </p>
      )}

      {mediciones.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--color-text-faint)]">
          Todavía no hay mediciones registradas para este cliente.
        </p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-3">
              <p className="text-xs text-[var(--color-text-muted)]">Peso actual</p>
              <p className="text-lg font-bold text-[var(--color-text)]">
                {Number(ultima!.peso).toFixed(1)} kg
              </p>
              {diferenciaKg != null && diferenciaKg !== 0 && (
                <p
                  className={`text-xs font-medium ${diferenciaKg < 0 ? 'text-emerald-600' : 'text-amber-600'}`}
                >
                  {diferenciaKg < 0 ? '▼' : '▲'} {Math.abs(diferenciaKg).toFixed(1)} kg desde la
                  primera medición
                </p>
              )}
            </div>
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-3">
              <p className="text-xs text-[var(--color-text-muted)]">IMC</p>
              <p className="text-lg font-bold text-[var(--color-text)]">{ultima!.calculos.imc}</p>
              <span
                className={`inline-block rounded-full px-1.5 py-0.5 text-xs font-medium ${claseClasificacion(ultima!.calculos.clasificacionImc)}`}
              >
                {ultima!.calculos.clasificacionImc}
              </span>
            </div>
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-3">
              <p className="text-xs text-[var(--color-text-muted)]">Peso ideal</p>
              <p className="text-lg font-bold text-[var(--color-text)]">
                {ultima!.calculos.pesoIdealMin}–{ultima!.calculos.pesoIdealMax} kg
              </p>
              {ultima!.calculos.sobrepesoKg > 0 && (
                <p className="text-xs font-medium text-amber-600">
                  {ultima!.calculos.sobrepesoKg} kg sobre el rango ideal
                </p>
              )}
            </div>
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-3">
              <p className="text-xs text-[var(--color-text-muted)]">% Grasa corporal (est.)</p>
              <p className="text-lg font-bold text-[var(--color-text)]">
                {ultima!.calculos.porcentajeGrasa != null
                  ? `${ultima!.calculos.porcentajeGrasa}%`
                  : '—'}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-3">
              <p className="text-xs text-[var(--color-text-muted)]">% Masa muscular</p>
              <p className="text-lg font-bold text-[var(--color-text)]">
                {ultima!.masaMuscular != null ? `${Number(ultima!.masaMuscular).toFixed(1)}%` : '—'}
              </p>
              {ultima!.masaMuscular == null && (
                <p className="text-xs text-[var(--color-text-faint)]">Dato manual, no registrado</p>
              )}
            </div>
          </div>

          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={datosGrafica}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <ReferenceArea
                  y1={ultima!.calculos.pesoIdealMin}
                  y2={ultima!.calculos.pesoIdealMax}
                  fill="var(--color-primario)"
                  fillOpacity={0.08}
                  ifOverflow="extendDomain"
                />
                <XAxis
                  dataKey="fecha"
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                  axisLine={{ stroke: 'var(--color-border)' }}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="peso"
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                  axisLine={{ stroke: 'var(--color-border)' }}
                  tickLine={false}
                  width={40}
                  domain={['auto', 'auto']}
                />
                {hayDatosGrasa && (
                  <YAxis
                    yAxisId="grasa"
                    orientation="right"
                    tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                    axisLine={{ stroke: 'var(--color-border)' }}
                    tickLine={false}
                    width={40}
                    domain={['auto', 'auto']}
                  />
                )}
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 6,
                    color: 'var(--color-text)',
                  }}
                />
                <Line
                  yAxisId="peso"
                  type="monotone"
                  dataKey="peso"
                  name="Peso (kg)"
                  stroke="var(--color-primario)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                {hayDatosGrasa && (
                  <Line
                    yAxisId="grasa"
                    type="monotone"
                    dataKey="grasa"
                    name="% Grasa"
                    stroke="var(--color-serie-grasa)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--color-text-muted)]">
                  <th className="pb-1 pr-3 font-medium">Fecha</th>
                  <th className="pb-1 pr-3 font-medium">Peso</th>
                  <th className="pb-1 pr-3 font-medium">IMC</th>
                  <th className="pb-1 pr-3 font-medium">% Grasa</th>
                  <th className="pb-1 pr-3 font-medium">% Músculo</th>
                  <th className="pb-1 pr-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {[...mediciones].reverse().map((m) => (
                  <tr key={m.id} className="border-t border-[var(--color-border)]">
                    <td className="py-1.5 pr-3 text-[var(--color-text-muted)]">
                      {new Date(m.fecha).toLocaleDateString()}
                    </td>
                    <td className="py-1.5 pr-3 font-medium text-[var(--color-text)]">
                      {Number(m.peso).toFixed(1)} kg
                    </td>
                    <td className="py-1.5 pr-3 text-[var(--color-text-muted)]">
                      {m.calculos.imc} · {m.calculos.clasificacionImc}
                    </td>
                    <td className="py-1.5 pr-3 text-[var(--color-text-muted)]">
                      {m.calculos.porcentajeGrasa != null ? `${m.calculos.porcentajeGrasa}%` : '—'}
                    </td>
                    <td className="py-1.5 pr-3 text-[var(--color-text-muted)]">
                      {m.masaMuscular != null ? `${Number(m.masaMuscular).toFixed(1)}%` : '—'}
                    </td>
                    <td className="py-1.5 pr-3">
                      <CanAccess resource="mediciones" action="edit">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => abrirEditar(m)}
                            className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)]"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => eliminar(m)}
                            className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)]"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </CanAccess>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 rounded-xl border border-[var(--color-border)]">
            <button
              type="button"
              onClick={() => setMostrarPerimetros((v) => !v)}
              className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-[var(--color-text)]"
            >
              Perímetros corporales
              {mostrarPerimetros ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {mostrarPerimetros && (
              <div className="overflow-x-auto border-t border-[var(--color-border)] p-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-[var(--color-text-muted)]">
                      <th className="pb-1 pr-3 font-medium">Fecha</th>
                      <th className="pb-1 pr-3 font-medium">Cuello</th>
                      <th className="pb-1 pr-3 font-medium">Cintura</th>
                      <th className="pb-1 pr-3 font-medium">Cadera</th>
                      <th className="pb-1 pr-3 font-medium">Pecho</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...mediciones].reverse().map((m) => (
                      <tr key={m.id} className="border-t border-[var(--color-border)]">
                        <td className="py-1.5 pr-3 text-[var(--color-text-muted)]">
                          {new Date(m.fecha).toLocaleDateString()}
                        </td>
                        <td className="py-1.5 pr-3 text-[var(--color-text)]">
                          {m.perimetroCuello != null ? `${Number(m.perimetroCuello).toFixed(1)} cm` : '—'}
                        </td>
                        <td className="py-1.5 pr-3 text-[var(--color-text)]">
                          {m.perimetroCintura != null ? `${Number(m.perimetroCintura).toFixed(1)} cm` : '—'}
                        </td>
                        <td className="py-1.5 pr-3 text-[var(--color-text)]">
                          {m.perimetroCadera != null ? `${Number(m.perimetroCadera).toFixed(1)} cm` : '—'}
                        </td>
                        <td className="py-1.5 pr-3 text-[var(--color-text)]">
                          {m.perimetroPecho != null ? `${Number(m.perimetroPecho).toFixed(1)} cm` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl bg-[var(--color-bg-card)] p-6 shadow-[var(--sombra-lg)]">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[var(--color-text)]">
                {form.id ? 'Editar medición' : 'Nueva medición'}
              </h2>
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="mb-1 block text-xs text-[var(--color-text-muted)]">Fecha</label>
                <input
                  type="date"
                  value={form.fecha}
                  onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--color-text-muted)]">Peso (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.peso}
                  onChange={(e) => setForm({ ...form, peso: e.target.value })}
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--color-text-muted)]">Talla (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.talla}
                  onChange={(e) => setForm({ ...form, talla: e.target.value })}
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--color-text-muted)]">
                  Cuello (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={form.perimetroCuello}
                  onChange={(e) => setForm({ ...form, perimetroCuello: e.target.value })}
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--color-text-muted)]">
                  Cintura/Abdomen (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={form.perimetroCintura}
                  onChange={(e) => setForm({ ...form, perimetroCintura: e.target.value })}
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                />
              </div>
              {sexo !== 'M' && (
                <div>
                  <label className="mb-1 block text-xs text-[var(--color-text-muted)]">
                    Cadera (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.perimetroCadera}
                    onChange={(e) => setForm({ ...form, perimetroCadera: e.target.value })}
                    className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                  />
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs text-[var(--color-text-muted)]">
                  Pecho (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={form.perimetroPecho}
                  onChange={(e) => setForm({ ...form, perimetroPecho: e.target.value })}
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                />
              </div>

              {(() => {
                const grasaPreview = calcularGrasaPreview(
                  sexo,
                  form.perimetroCuello,
                  form.perimetroCintura,
                  form.perimetroCadera,
                  form.talla,
                )
                return grasaPreview != null ? (
                  <div className="col-span-2 rounded-lg bg-[var(--color-bg-subtle)] px-3 py-2 text-sm">
                    <span className="text-[var(--color-text-muted)]">% de grasa estimado: </span>
                    <span className="font-semibold text-[var(--color-text)]">{grasaPreview}%</span>
                  </div>
                ) : null
              })()}

              <div className="col-span-2">
                <label className="mb-1 block text-xs text-[var(--color-text-muted)]">
                  % Masa muscular (opcional, si tienen báscula de bioimpedancia)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={form.masaMuscular}
                  onChange={(e) => setForm({ ...form, masaMuscular: e.target.value })}
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs text-[var(--color-text-muted)]">
                  Notas (opcional)
                </label>
                <textarea
                  value={form.notas}
                  onChange={(e) => setForm({ ...form, notas: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="rounded px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]"
              >
                Cancelar
              </button>
              <PrimaryButton
                type="button"
                onClick={guardar}
                disabled={guardando}
                className="flex items-center gap-2"
              >
                {guardando && <Spinner size={14} />}
                Guardar
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
