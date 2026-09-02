import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { axiosInstance } from '../../lib/axios'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { Spinner } from '../../components/ui/Spinner'
import { useConfirm } from '../../components/ui/ConfirmDialog'

interface Material {
  id: string
  nombre: string
  calidad: string | null
  unidadMedida: string
  precioUnitario: string
}

interface ClienteBasico {
  id: string
  nombre: string
}

interface CategoriaMovimiento {
  id: string
  nombre: string
}

interface LineaForm {
  key: string
  materialId: string
  cantidad: number
  precioUnitarioSnapshot: number
}

interface ParteForm {
  key: string
  nombre: string
  horas: number
  materiales: LineaForm[]
}

interface DatosVenta {
  estado: string
  precioVenta: number | null
  costoTotalSnapshot: number | null
  fechaVenta: string | null
  gananciaReal: number | null
}

function idLocal() {
  return Math.random().toString(36).slice(2)
}

function formatoMoneda(n: number) {
  return `$${n.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function etiquetaMaterial(m: Material) {
  const calidad = m.calidad ? ` – ${m.calidad}` : ''
  return `${m.nombre}${calidad} (${m.unidadMedida}) · $${Number(m.precioUnitario).toFixed(2)}`
}

function mensajeError(error: unknown, fallback: string) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  )
}

export function CosteoEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const esNuevo = !id

  const [materiales, setMateriales] = useState<Material[]>([])
  const [clientes, setClientes] = useState<ClienteBasico[]>([])
  const [categoriasIngreso, setCategoriasIngreso] = useState<CategoriaMovimiento[]>([])
  const [cargando, setCargando] = useState(!esNuevo)
  const [guardando, setGuardando] = useState(false)
  const { confirmar, dialog } = useConfirm()

  const [nombre, setNombre] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [tarifaHora, setTarifaHora] = useState(20)
  const [margenPorcentaje, setMargenPorcentaje] = useState(30)
  const [otrosCostos, setOtrosCostos] = useState(0)
  const [notas, setNotas] = useState('')
  const [partes, setPartes] = useState<ParteForm[]>([])
  const [datosVenta, setDatosVenta] = useState<DatosVenta | null>(null)

  const [modalVenderAbierto, setModalVenderAbierto] = useState(false)
  const [precioVentaForm, setPrecioVentaForm] = useState(0)
  const [categoriaVentaId, setCategoriaVentaId] = useState('')
  const [nombreNuevaCategoria, setNombreNuevaCategoria] = useState('')
  const [creandoCategoria, setCreandoCategoria] = useState(false)
  const [categoriasEgreso, setCategoriasEgreso] = useState<CategoriaMovimiento[]>([])
  const [categoriaEgresoId, setCategoriaEgresoId] = useState('')
  const [nombreNuevaCategoriaEgreso, setNombreNuevaCategoriaEgreso] = useState('')
  const [creandoCategoriaEgreso, setCreandoCategoriaEgreso] = useState(false)
  const [vendiendo, setVendiendo] = useState(false)

  const bloqueado = datosVenta?.estado === 'vendido'

  const cargarCategoriasIngreso = () => {
    axiosInstance
      .get<CategoriaMovimiento[]>('/categorias-movimiento', { params: { tipo: 'ingreso' } })
      .then(({ data }) => {
        setCategoriasIngreso(data)
        setCategoriaVentaId((prev) => prev || data[0]?.id || '')
      })
      .catch(() => {
        /* si el módulo Cuentas no está activo, simplemente no se puede vender */
      })
  }

  const cargarCategoriasEgreso = () => {
    axiosInstance
      .get<CategoriaMovimiento[]>('/categorias-movimiento', { params: { tipo: 'egreso' } })
      .then(({ data }) => {
        setCategoriasEgreso(data)
        setCategoriaEgresoId((prev) => prev || data[0]?.id || '')
      })
      .catch(() => {
        /* si falla, simplemente no se podrá vender un costeo con costo real hasta crear una */
      })
  }

  useEffect(() => {
    Promise.all([
      axiosInstance.get<Material[]>('/materiales'),
      axiosInstance.get<ClienteBasico[]>('/clientes'),
    ])
      .then(([m, c]) => {
        setMateriales(m.data)
        setClientes(c.data)
      })
      .catch(() => toast.error('No se pudieron cargar materiales/clientes'))
    cargarCategoriasIngreso()
    cargarCategoriasEgreso()
  }, [])

  useEffect(() => {
    if (esNuevo) return
    setCargando(true)
    axiosInstance
      .get(`/costeos/${id}`)
      .then(({ data }) => {
        setNombre(data.nombre)
        setClienteId(data.clienteId ?? '')
        setTarifaHora(Number(data.tarifaHora))
        setMargenPorcentaje(Number(data.margenPorcentaje))
        setOtrosCostos(Number(data.otrosCostos))
        setNotas(data.notas ?? '')
        setDatosVenta({
          estado: data.estado,
          precioVenta: data.precioVenta != null ? Number(data.precioVenta) : null,
          costoTotalSnapshot: data.costoTotalSnapshot != null ? Number(data.costoTotalSnapshot) : null,
          fechaVenta: data.fechaVenta,
          gananciaReal: data.totales.gananciaReal,
        })
        setPartes(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data.partes.map((p: any) => ({
            key: idLocal(),
            nombre: p.nombre,
            horas: Number(p.horas),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            materiales: p.materiales.map((l: any) => ({
              key: idLocal(),
              materialId: l.materialId,
              cantidad: Number(l.cantidad),
              precioUnitarioSnapshot: Number(l.precioUnitarioSnapshot),
            })),
          })),
        )
      })
      .catch(() => toast.error('No se pudo cargar el costeo'))
      .finally(() => setCargando(false))
  }, [id, esNuevo])

  const agregarParte = () => {
    setPartes((prev) => [...prev, { key: idLocal(), nombre: '', horas: 0, materiales: [] }])
  }

  const quitarParte = (key: string) => {
    setPartes((prev) => prev.filter((p) => p.key !== key))
  }

  const actualizarParte = (key: string, cambios: Partial<ParteForm>) => {
    setPartes((prev) => prev.map((p) => (p.key === key ? { ...p, ...cambios } : p)))
  }

  const agregarMaterial = (parteKey: string) => {
    const primero = materiales[0]
    if (!primero) {
      toast.error('Primero crea un material en el catálogo')
      return
    }
    setPartes((prev) =>
      prev.map((p) =>
        p.key === parteKey
          ? {
              ...p,
              materiales: [
                ...p.materiales,
                {
                  key: idLocal(),
                  materialId: primero.id,
                  cantidad: 1,
                  precioUnitarioSnapshot: Number(primero.precioUnitario),
                },
              ],
            }
          : p,
      ),
    )
  }

  const quitarMaterial = (parteKey: string, lineaKey: string) => {
    setPartes((prev) =>
      prev.map((p) =>
        p.key === parteKey
          ? { ...p, materiales: p.materiales.filter((l) => l.key !== lineaKey) }
          : p,
      ),
    )
  }

  const actualizarMaterial = (parteKey: string, lineaKey: string, cambios: Partial<LineaForm>) => {
    setPartes((prev) =>
      prev.map((p) =>
        p.key === parteKey
          ? {
              ...p,
              materiales: p.materiales.map((l) => (l.key === lineaKey ? { ...l, ...cambios } : l)),
            }
          : p,
      ),
    )
  }

  const cambiarMaterialDeLinea = (parteKey: string, lineaKey: string, materialId: string) => {
    const material = materiales.find((m) => m.id === materialId)
    actualizarMaterial(parteKey, lineaKey, {
      materialId,
      precioUnitarioSnapshot: material ? Number(material.precioUnitario) : 0,
    })
  }

  const totales = useMemo(() => {
    let costoMateriales = 0
    let costoManoObra = 0
    for (const parte of partes) {
      for (const linea of parte.materiales) {
        costoMateriales += linea.cantidad * linea.precioUnitarioSnapshot
      }
      costoManoObra += parte.horas * tarifaHora
    }
    const costoTotal = costoMateriales + costoManoObra + otrosCostos
    const precioSugerido = costoTotal * (1 + margenPorcentaje / 100)
    // El egreso real (dinero que de verdad sale del bolsillo) es solo materiales +
    // otros costos — la mano de obra no se cuenta porque no es un movimiento de dinero.
    const montoEgreso = costoMateriales + otrosCostos
    return { costoMateriales, costoManoObra, costoTotal, precioSugerido, montoEgreso }
  }, [partes, tarifaHora, otrosCostos, margenPorcentaje])

  const guardar = async () => {
    if (!nombre.trim() || partes.length === 0) {
      toast.error('Agrega un nombre y al menos una parte')
      return
    }
    setGuardando(true)
    try {
      const payload = {
        nombre,
        clienteId: clienteId || undefined,
        tarifaHora,
        margenPorcentaje,
        otrosCostos,
        notas: notas || undefined,
        partes: partes.map((p) => ({
          nombre: p.nombre,
          horas: p.horas,
          materiales: p.materiales.map((l) => ({
            materialId: l.materialId,
            cantidad: l.cantidad,
            precioUnitarioSnapshot: l.precioUnitarioSnapshot,
          })),
        })),
      }

      if (esNuevo) {
        const { data } = await axiosInstance.post('/costeos', payload)
        toast.success('Costeo creado')
        navigate(`/costeos/${data.id}`)
      } else {
        await axiosInstance.patch(`/costeos/${id}`, payload)
        toast.success('Costeo actualizado')
      }
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo guardar el costeo'))
    } finally {
      setGuardando(false)
    }
  }

  const eliminar = async () => {
    if (esNuevo || !id) return
    const confirmado = await confirmar(
      'Eliminar costeo',
      bloqueado
        ? 'Esto también eliminará el ingreso/egreso relacionado en Cuentas. Esta acción no se puede deshacer.'
        : '¿Seguro que quieres eliminarlo? Esta acción no se puede deshacer.',
    )
    if (!confirmado) return

    try {
      await axiosInstance.delete(`/costeos/${id}`)
      toast.success('Costeo eliminado')
      navigate('/costeos')
    } catch {
      toast.error('No se pudo eliminar el costeo')
    }
  }

  const deshacerVenta = async () => {
    if (!id) return
    const confirmado = await confirmar(
      'Deshacer venta',
      'Se eliminará el ingreso/egreso creados en Cuentas y el costeo volverá a borrador. La receta (partes y materiales) no se pierde.',
    )
    if (!confirmado) return

    setGuardando(true)
    try {
      const { data } = await axiosInstance.post(`/costeos/${id}/deshacer-venta`)
      setDatosVenta({
        estado: data.estado,
        precioVenta: null,
        costoTotalSnapshot: null,
        fechaVenta: null,
        gananciaReal: null,
      })
      toast.success('Venta deshecha — el costeo vuelve a ser editable')
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo deshacer la venta'))
    } finally {
      setGuardando(false)
    }
  }

  const abrirModalVender = () => {
    setPrecioVentaForm(Number(totales.precioSugerido.toFixed(2)))
    setModalVenderAbierto(true)
  }

  const crearCategoriaVentaRapida = async () => {
    if (!nombreNuevaCategoria.trim()) return
    setCreandoCategoria(true)
    try {
      const { data } = await axiosInstance.post<CategoriaMovimiento>('/categorias-movimiento', {
        tipo: 'ingreso',
        nombre: nombreNuevaCategoria,
      })
      setNombreNuevaCategoria('')
      cargarCategoriasIngreso()
      setCategoriaVentaId(data.id)
      toast.success('Categoría creada')
    } catch {
      toast.error('No se pudo crear la categoría')
    } finally {
      setCreandoCategoria(false)
    }
  }

  const crearCategoriaEgresoRapida = async () => {
    if (!nombreNuevaCategoriaEgreso.trim()) return
    setCreandoCategoriaEgreso(true)
    try {
      const { data } = await axiosInstance.post<CategoriaMovimiento>('/categorias-movimiento', {
        tipo: 'egreso',
        nombre: nombreNuevaCategoriaEgreso,
      })
      setNombreNuevaCategoriaEgreso('')
      cargarCategoriasEgreso()
      setCategoriaEgresoId(data.id)
      toast.success('Categoría creada')
    } catch {
      toast.error('No se pudo crear la categoría')
    } finally {
      setCreandoCategoriaEgreso(false)
    }
  }

  const confirmarVenta = async () => {
    if (!id || precioVentaForm <= 0 || !categoriaVentaId) return
    if (totales.montoEgreso > 0 && !categoriaEgresoId) {
      toast.error('Selecciona una categoría de egreso para el costo de materiales')
      return
    }
    setVendiendo(true)
    try {
      const { data } = await axiosInstance.post(`/costeos/${id}/vender`, {
        precioVenta: precioVentaForm,
        categoriaId: categoriaVentaId,
        categoriaEgresoId: totales.montoEgreso > 0 ? categoriaEgresoId : undefined,
      })
      setDatosVenta({
        estado: data.estado,
        precioVenta: Number(data.precioVenta),
        costoTotalSnapshot: Number(data.costoTotalSnapshot),
        fechaVenta: data.fechaVenta,
        gananciaReal: data.totales.gananciaReal,
      })
      setModalVenderAbierto(false)
      toast.success('Venta registrada — ya se creó el ingreso en Cuentas')
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo registrar la venta'))
    } finally {
      setVendiendo(false)
    }
  }

  if (cargando) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
        <Spinner size={16} />
        Cargando…
      </div>
    )
  }

  return (
    <div className="pb-24">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-[var(--color-text)]">
          {esNuevo ? 'Nuevo costeo' : nombre || 'Editar costeo'}
        </h1>
        {bloqueado && (
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
            Vendido
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        {bloqueado
          ? 'Este costeo ya fue vendido y queda como registro histórico — no se puede editar.'
          : 'Agrega las partes del cosplay y los materiales que lleva cada una. Los totales se recalculan al instante.'}
      </p>

      {bloqueado && datosVenta && (
        <div className="mt-4 flex flex-wrap gap-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950">
          <span>
            Vendido en{' '}
            <span className="font-semibold text-[var(--color-text)]">
              {formatoMoneda(datosVenta.precioVenta ?? 0)}
            </span>
          </span>
          <span>
            Costo real:{' '}
            <span className="font-semibold text-[var(--color-text)]">
              {formatoMoneda(datosVenta.costoTotalSnapshot ?? 0)}
            </span>
          </span>
          <span>
            Ganancia:{' '}
            <span className="font-semibold text-emerald-700">
              {formatoMoneda(datosVenta.gananciaReal ?? 0)}
            </span>
          </span>
          {datosVenta.fechaVenta && (
            <span className="text-[var(--color-text-muted)]">
              {new Date(datosVenta.fechaVenta).toLocaleDateString()}
            </span>
          )}
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)] p-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">Nombre</label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            disabled={bloqueado}
            placeholder="Ej: Cosplay Raiden Shogun"
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none disabled:opacity-60"
          />
        </div>
        {clientes.length > 0 && (
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
              Cliente (opcional)
            </label>
            <select
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              disabled={bloqueado}
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none disabled:opacity-60"
            >
              <option value="">Sin cliente asociado</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
            Tarifa por hora ($)
          </label>
          <input
            type="number"
            min={0}
            step={0.5}
            value={tarifaHora}
            onChange={(e) => setTarifaHora(Number(e.target.value))}
            disabled={bloqueado}
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none disabled:opacity-60"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
            Margen de ganancia (%)
          </label>
          <input
            type="number"
            min={0}
            step={1}
            value={margenPorcentaje}
            onChange={(e) => setMargenPorcentaje(Number(e.target.value))}
            disabled={bloqueado}
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none disabled:opacity-60"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
            Otros costos ($)
          </label>
          <input
            type="number"
            min={0}
            step={0.5}
            value={otrosCostos}
            onChange={(e) => setOtrosCostos(Number(e.target.value))}
            disabled={bloqueado}
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none disabled:opacity-60"
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">Notas</label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            disabled={bloqueado}
            rows={2}
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none disabled:opacity-60"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {partes.map((parte) => {
          const costoMaterialesParte = parte.materiales.reduce(
            (sum, l) => sum + l.cantidad * l.precioUnitarioSnapshot,
            0,
          )
          const costoManoObraParte = parte.horas * tarifaHora

          return (
            <div
              key={parte.key}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)] p-4"
            >
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                    Parte
                  </label>
                  <input
                    value={parte.nombre}
                    onChange={(e) => actualizarParte(parte.key, { nombre: e.target.value })}
                    disabled={bloqueado}
                    placeholder="Ej: Casco, Peto, Guantes…"
                    className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none disabled:opacity-60"
                  />
                </div>
                <div className="w-32">
                  <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                    Horas
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={parte.horas}
                    onChange={(e) => actualizarParte(parte.key, { horas: Number(e.target.value) })}
                    disabled={bloqueado}
                    className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none disabled:opacity-60"
                  />
                </div>
                {!bloqueado && (
                  <button
                    type="button"
                    onClick={() => quitarParte(parte.key)}
                    className="rounded px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Quitar parte
                  </button>
                )}
              </div>

              <div className="mt-3 flex flex-col gap-2">
                {parte.materiales.map((linea) => (
                  <div key={linea.key} className="flex flex-wrap items-center gap-2">
                    <select
                      value={linea.materialId}
                      onChange={(e) => cambiarMaterialDeLinea(parte.key, linea.key, e.target.value)}
                      disabled={bloqueado}
                      className="min-w-[220px] flex-1 rounded-lg border border-[var(--color-border)] px-2 py-1.5 text-sm focus:border-[var(--color-primario)] focus:outline-none disabled:opacity-60"
                    >
                      {materiales.map((m) => (
                        <option key={m.id} value={m.id}>
                          {etiquetaMaterial(m)}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={linea.cantidad}
                      onChange={(e) =>
                        actualizarMaterial(parte.key, linea.key, { cantidad: Number(e.target.value) })
                      }
                      disabled={bloqueado}
                      className="w-20 rounded-lg border border-[var(--color-border)] px-2 py-1.5 text-sm focus:border-[var(--color-primario)] focus:outline-none disabled:opacity-60"
                    />
                    <span className="w-24 text-right text-sm text-[var(--color-text-muted)]">
                      {formatoMoneda(linea.cantidad * linea.precioUnitarioSnapshot)}
                    </span>
                    {!bloqueado && (
                      <button
                        type="button"
                        onClick={() => quitarMaterial(parte.key, linea.key)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                ))}

                {!bloqueado && (
                  <button
                    type="button"
                    onClick={() => agregarMaterial(parte.key)}
                    className="self-start rounded-lg border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]"
                  >
                    + Agregar material
                  </button>
                )}
              </div>

              <div className="mt-3 flex justify-end gap-4 text-xs text-[var(--color-text-faint)]">
                <span>Materiales: {formatoMoneda(costoMaterialesParte)}</span>
                <span>Mano de obra: {formatoMoneda(costoManoObraParte)}</span>
                <span className="font-medium text-[var(--color-text)]">
                  Subtotal: {formatoMoneda(costoMaterialesParte + costoManoObraParte)}
                </span>
              </div>
            </div>
          )
        })}

        {!bloqueado && (
          <button
            type="button"
            onClick={agregarParte}
            className="self-start rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]"
          >
            + Agregar parte
          </button>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-lg">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="text-[var(--color-text-muted)]">
              Materiales: <span className="font-medium text-[var(--color-text)]">{formatoMoneda(totales.costoMateriales)}</span>
            </span>
            <span className="text-[var(--color-text-muted)]">
              Mano de obra: <span className="font-medium text-[var(--color-text)]">{formatoMoneda(totales.costoManoObra)}</span>
            </span>
            <span className="text-[var(--color-text-muted)]">
              Costo total: <span className="font-medium text-[var(--color-text)]">{formatoMoneda(totales.costoTotal)}</span>
            </span>
            <span className="text-base font-bold text-[var(--color-primario-legible)]">
              Precio sugerido: {formatoMoneda(totales.precioSugerido)}
            </span>
          </div>
          <div className="flex gap-2">
            {!esNuevo && (
              <button
                type="button"
                onClick={eliminar}
                disabled={guardando}
                className="rounded px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Eliminar
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/costeos')}
              className="rounded px-3 py-2 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]"
            >
              Volver
            </button>
            {!esNuevo && bloqueado && (
              <button
                type="button"
                onClick={deshacerVenta}
                disabled={guardando}
                className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-50"
              >
                {guardando && <Spinner size={14} />}
                Deshacer venta
              </button>
            )}
            {!esNuevo && !bloqueado && (
              <button
                type="button"
                onClick={abrirModalVender}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:brightness-90"
              >
                Marcar como vendido
              </button>
            )}
            {!bloqueado && (
              <PrimaryButton
                type="button"
                onClick={guardar}
                disabled={guardando}
                className="flex items-center gap-2"
              >
                {guardando && <Spinner size={14} />}
                {guardando ? 'Guardando…' : 'Guardar'}
              </PrimaryButton>
            )}
          </div>
        </div>
      </div>

      {modalVenderAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-[var(--color-bg-card)] p-6 shadow-[var(--sombra-lg)]">
            <h2 className="text-base font-semibold text-[var(--color-text)]">Marcar como vendido</h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              Se creará un ingreso por lo que cobraste{totales.montoEgreso > 0 && ' y un egreso por el costo real en materiales/otros'} — tu tiempo de trabajo no se registra como egreso porque no es dinero que salió de tu bolsillo.
            </p>

            <div className="mt-4 flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                  Precio final de venta ($)
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={precioVentaForm}
                  onChange={(e) => setPrecioVentaForm(Number(e.target.value))}
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                  Categoría de ingreso
                </label>
                <select
                  value={categoriaVentaId}
                  onChange={(e) => setCategoriaVentaId(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                >
                  <option value="">Selecciona…</option>
                  {categoriasIngreso.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
                <div className="mt-2 flex gap-2">
                  <input
                    value={nombreNuevaCategoria}
                    onChange={(e) => setNombreNuevaCategoria(e.target.value)}
                    placeholder="Nueva categoría de ingreso…"
                    className="w-full rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs focus:border-[var(--color-primario)] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={crearCategoriaVentaRapida}
                    disabled={creandoCategoria || !nombreNuevaCategoria.trim()}
                    className="shrink-0 rounded-lg border border-[var(--color-border)] px-2 py-1.5 text-xs text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-50"
                  >
                    Agregar
                  </button>
                </div>
              </div>

              {totales.montoEgreso > 0 && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                    Categoría de egreso (costo de materiales)
                  </label>
                  <select
                    value={categoriaEgresoId}
                    onChange={(e) => setCategoriaEgresoId(e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                  >
                    <option value="">Selecciona…</option>
                    {categoriasEgreso.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={nombreNuevaCategoriaEgreso}
                      onChange={(e) => setNombreNuevaCategoriaEgreso(e.target.value)}
                      placeholder="Nueva categoría de egreso…"
                      className="w-full rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs focus:border-[var(--color-primario)] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={crearCategoriaEgresoRapida}
                      disabled={creandoCategoriaEgreso || !nombreNuevaCategoriaEgreso.trim()}
                      className="shrink-0 rounded-lg border border-[var(--color-border)] px-2 py-1.5 text-xs text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-50"
                    >
                      Agregar
                    </button>
                  </div>
                </div>
              )}

              <div className="rounded-lg bg-[var(--color-bg-subtle)] p-3 text-sm">
                {totales.montoEgreso > 0 && (
                  <p className="text-[var(--color-text-muted)]">
                    Egreso real (materiales/otros): {formatoMoneda(totales.montoEgreso)}
                  </p>
                )}
                <p className="text-[var(--color-text-muted)]">
                  Costo total con tu tiempo: {formatoMoneda(totales.costoTotal)}
                </p>
                <p className="mt-1 font-medium">
                  Ganancia estimada:{' '}
                  <span className="text-emerald-600">
                    {formatoMoneda(precioVentaForm - totales.costoTotal)}
                  </span>
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalVenderAbierto(false)}
                className="rounded px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]"
              >
                Cancelar
              </button>
              <PrimaryButton
                type="button"
                onClick={confirmarVenta}
                disabled={
                  vendiendo ||
                  precioVentaForm <= 0 ||
                  !categoriaVentaId ||
                  (totales.montoEgreso > 0 && !categoriaEgresoId)
                }
                className="flex items-center gap-2"
              >
                {vendiendo && <Spinner size={14} />}
                {vendiendo ? 'Registrando…' : 'Confirmar venta'}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {dialog}
    </div>
  )
}
