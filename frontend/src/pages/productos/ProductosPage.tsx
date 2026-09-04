import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { axiosInstance } from '../../lib/axios'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { Spinner } from '../../components/ui/Spinner'
import { CargandoPantalla } from '../../components/ui/CargandoPantalla'

const TIPOS_MOVIMIENTO = [
  { value: 'entrada', label: 'Entrada (compra/reposición)' },
  { value: 'salida', label: 'Salida (venta/consumo)' },
  { value: 'ajuste', label: 'Ajuste de conteo físico' },
] as const

interface Producto {
  id: string
  nombre: string
  sku: string | null
  precio: string
  stock: number | null
  stockMinimo: number | null
  unidadMedida: string
}

interface UsuarioBasico {
  id: string
  nombre: string
}

interface Movimiento {
  id: string
  tipo: string
  cantidad: number
  motivo: string | null
  creadoEn: string
  usuario: UsuarioBasico
}

function mensajeError(error: unknown, fallback: string) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  )
}

export function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [cargando, setCargando] = useState(true)

  const [nombre, setNombre] = useState('')
  const [sku, setSku] = useState('')
  const [precio, setPrecio] = useState(0)
  const [unidadMedida, setUnidadMedida] = useState('unidad')
  const [stockMinimo, setStockMinimo] = useState<number | ''>('')
  const [creando, setCreando] = useState(false)

  const [modalMovimiento, setModalMovimiento] = useState<Producto | null>(null)
  const [tipoMovimiento, setTipoMovimiento] = useState<(typeof TIPOS_MOVIMIENTO)[number]['value']>(
    'entrada',
  )
  const [cantidad, setCantidad] = useState(0)
  const [motivo, setMotivo] = useState('')
  const [registrando, setRegistrando] = useState(false)

  const [modalHistorial, setModalHistorial] = useState<Producto | null>(null)
  const [historial, setHistorial] = useState<Movimiento[]>([])
  const [cargandoHistorial, setCargandoHistorial] = useState(false)

  const cargar = async () => {
    setCargando(true)
    try {
      const { data } = await axiosInstance.get<Producto[]>('/productos')
      setProductos(data)
    } catch {
      toast.error('No se pudieron cargar los productos')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  const crearProducto = async () => {
    if (!nombre.trim() || precio <= 0) return
    setCreando(true)
    try {
      await axiosInstance.post('/productos', {
        nombre,
        sku: sku || undefined,
        precio,
        unidadMedida,
        stockMinimo: stockMinimo === '' ? undefined : stockMinimo,
      })
      setNombre('')
      setSku('')
      setPrecio(0)
      setStockMinimo('')
      toast.success('Producto creado')
      await cargar()
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo crear el producto'))
    } finally {
      setCreando(false)
    }
  }

  const abrirMovimiento = (producto: Producto) => {
    setModalMovimiento(producto)
    setTipoMovimiento('entrada')
    setCantidad(0)
    setMotivo('')
  }

  const registrarMovimiento = async () => {
    if (!modalMovimiento) return
    setRegistrando(true)
    try {
      await axiosInstance.post(`/productos/${modalMovimiento.id}/movimientos`, {
        tipo: tipoMovimiento,
        cantidad,
        motivo: motivo || undefined,
      })
      toast.success('Movimiento registrado')
      setModalMovimiento(null)
      await cargar()
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo registrar el movimiento'))
    } finally {
      setRegistrando(false)
    }
  }

  const abrirHistorial = async (producto: Producto) => {
    setModalHistorial(producto)
    setCargandoHistorial(true)
    try {
      const { data } = await axiosInstance.get<Movimiento[]>(`/productos/${producto.id}/movimientos`)
      setHistorial(data)
    } catch {
      toast.error('No se pudo cargar el historial')
    } finally {
      setCargandoHistorial(false)
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--color-text)]">Productos</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Stock de productos por cantidad: registra entradas, salidas y ajustes de conteo. El stock
        actual se calcula automáticamente a partir de los movimientos.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)] p-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
            Nombre
          </label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Papel bond A4"
            className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">SKU</label>
          <input
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            className="w-28 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
            Precio
          </label>
          <input
            type="number"
            min={0}
            step={0.1}
            value={precio}
            onChange={(e) => setPrecio(Number(e.target.value))}
            className="w-24 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
            Unidad
          </label>
          <input
            value={unidadMedida}
            onChange={(e) => setUnidadMedida(e.target.value)}
            className="w-24 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
            Stock mínimo
          </label>
          <input
            type="number"
            min={0}
            value={stockMinimo}
            onChange={(e) => setStockMinimo(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-24 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
          />
        </div>
        <PrimaryButton
          type="button"
          onClick={crearProducto}
          disabled={creando || !nombre.trim() || precio <= 0}
          className="flex items-center gap-2"
        >
          {creando && <Spinner size={14} />}
          {creando ? 'Creando…' : 'Agregar producto'}
        </PrimaryButton>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">SKU</th>
              <th className="px-4 py-2">Stock</th>
              <th className="px-4 py-2">Precio</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {productos.map((producto) => {
              const bajoStock =
                producto.stockMinimo != null && (producto.stock ?? 0) < producto.stockMinimo
              return (
                <tr key={producto.id} className="border-t border-[var(--color-border)]">
                  <td className="px-4 py-2">{producto.nombre}</td>
                  <td className="px-4 py-2 text-[var(--color-text-muted)]">
                    {producto.sku ?? '—'}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={
                        bajoStock ? 'rounded bg-red-100 px-2 py-0.5 font-medium text-red-700' : ''
                      }
                    >
                      {producto.stock ?? 0} {producto.unidadMedida}
                    </span>
                    {bajoStock && (
                      <span className="ml-1 text-xs text-red-600">
                        (mínimo {producto.stockMinimo})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">${Number(producto.precio).toFixed(2)}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => abrirMovimiento(producto)}
                        className="rounded px-2 py-1 text-xs text-[var(--color-primario-legible)] hover:bg-[var(--color-bg-subtle)]"
                      >
                        Registrar movimiento
                      </button>
                      <button
                        type="button"
                        onClick={() => abrirHistorial(producto)}
                        className="rounded px-2 py-1 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)]"
                      >
                        Historial
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {productos.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-[var(--color-text-faint)]">
                  {cargando ? <CargandoPantalla minHeight={80} /> : 'Sin productos todavía'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalMovimiento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-[var(--color-bg-card)] p-6 shadow-lg">
            <h2 className="text-base font-semibold text-[var(--color-text)]">
              Movimiento de «{modalMovimiento.nombre}»
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              Stock actual: {modalMovimiento.stock ?? 0} {modalMovimiento.unidadMedida}
            </p>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                Tipo de movimiento
              </label>
              <select
                value={tipoMovimiento}
                onChange={(e) => setTipoMovimiento(e.target.value as typeof tipoMovimiento)}
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
              >
                {TIPOS_MOVIMIENTO.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                {tipoMovimiento === 'ajuste' ? 'Nuevo stock exacto' : 'Cantidad'}
              </label>
              <input
                type="number"
                min={0}
                value={cantidad}
                onChange={(e) => setCantidad(Number(e.target.value))}
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
              />
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                Motivo
              </label>
              <input
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalMovimiento(null)}
                className="rounded px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]"
              >
                Cancelar
              </button>
              <PrimaryButton
                type="button"
                onClick={registrarMovimiento}
                disabled={registrando}
                className="flex items-center gap-2"
              >
                {registrando && <Spinner size={14} />}
                {registrando ? 'Guardando…' : 'Registrar'}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {modalHistorial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-[var(--color-bg-card)] p-6 shadow-lg">
            <h2 className="text-base font-semibold text-[var(--color-text)]">
              Movimientos de «{modalHistorial.nombre}»
            </h2>

            <div className="mt-4 max-h-96 overflow-y-auto">
              {cargandoHistorial && <CargandoPantalla minHeight={100} />}
              {!cargandoHistorial && historial.length === 0 && (
                <p className="py-4 text-sm text-[var(--color-text-faint)]">Sin movimientos todavía</p>
              )}
              {!cargandoHistorial &&
                historial.map((mov) => (
                  <div
                    key={mov.id}
                    className="border-b border-[var(--color-border)] py-3 text-sm last:border-b-0"
                  >
                    <p className="font-medium text-[var(--color-text)]">
                      {mov.tipo} · {mov.cantidad > 0 ? '+' : ''}
                      {mov.cantidad}
                    </p>
                    <p className="text-[var(--color-text-muted)]">
                      {new Date(mov.creadoEn).toLocaleString()} · {mov.usuario.nombre}
                    </p>
                    {mov.motivo && (
                      <p className="text-[var(--color-text-faint)]">{mov.motivo}</p>
                    )}
                  </div>
                ))}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setModalHistorial(null)}
                className="rounded px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
