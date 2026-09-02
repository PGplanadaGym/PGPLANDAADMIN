import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Trash2, ShoppingCart, Plus, Minus } from 'lucide-react'
import { axiosInstance } from '../../lib/axios'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { Spinner } from '../../components/ui/Spinner'

interface Producto {
  id: string
  nombre: string
  sku: string | null
  precio: string
  stock: number | null
  unidadMedida: string
}

interface ClienteBasico {
  id: string
  nombre: string
}

interface CategoriaMovimiento {
  id: string
  nombre: string
}

interface ItemCarrito {
  productoId: string
  nombre: string
  precio: number
  cantidad: number
  stockDisponible: number | null
}

interface OrdenItem {
  id: string
  cantidad: number
  precioUnit: string
  producto: { id: string; nombre: string; sku: string | null }
}

interface Orden {
  id: string
  total: string
  notas: string | null
  creadoEn: string
  cliente: ClienteBasico | null
  usuario: { id: string; nombre: string }
  items: OrdenItem[]
}

function mensajeError(error: unknown, fallback: string) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  )
}

export function VentasPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [clientes, setClientes] = useState<ClienteBasico[]>([])
  const [categoriasIngreso, setCategoriasIngreso] = useState<CategoriaMovimiento[]>([])
  const [ventas, setVentas] = useState<Orden[]>([])
  const [cargando, setCargando] = useState(true)

  const [busqueda, setBusqueda] = useState('')
  const [carrito, setCarrito] = useState<ItemCarrito[]>([])
  const [clienteId, setClienteId] = useState('')
  const [categoriaIngresoId, setCategoriaIngresoId] = useState('')
  const [notas, setNotas] = useState('')
  const [registrando, setRegistrando] = useState(false)

  const cargarVentas = () =>
    axiosInstance.get<Orden[]>('/ventas').then(({ data }) => setVentas(data))

  const cargarProductos = () =>
    axiosInstance.get<Producto[]>('/productos').then(({ data }) => setProductos(data))

  useEffect(() => {
    setCargando(true)
    Promise.all([
      cargarProductos(),
      axiosInstance.get<ClienteBasico[]>('/clientes').then(({ data }) => setClientes(data)),
      axiosInstance
        .get<CategoriaMovimiento[]>('/categorias-movimiento', { params: { tipo: 'ingreso' } })
        .then(({ data }) => setCategoriasIngreso(data))
        .catch(() => {
          /* módulo Cuentas puede no estar activo */
        }),
      cargarVentas(),
    ])
      .catch(() => toast.error('No se pudo cargar la información'))
      .finally(() => setCargando(false))
  }, [])

  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return productos
    return productos.filter(
      (p) => p.nombre.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q),
    )
  }, [busqueda, productos])

  const agregarAlCarrito = (producto: Producto) => {
    setCarrito((prev) => {
      const existente = prev.find((item) => item.productoId === producto.id)
      if (existente) {
        if (existente.stockDisponible != null && existente.cantidad >= existente.stockDisponible) {
          toast.error('No hay más stock disponible de este producto')
          return prev
        }
        return prev.map((item) =>
          item.productoId === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item,
        )
      }
      return [
        ...prev,
        {
          productoId: producto.id,
          nombre: producto.nombre,
          precio: Number(producto.precio),
          cantidad: 1,
          stockDisponible: producto.stock,
        },
      ]
    })
  }

  const cambiarCantidad = (productoId: string, delta: number) => {
    setCarrito((prev) =>
      prev
        .map((item) => {
          if (item.productoId !== productoId) return item
          const nuevaCantidad = item.cantidad + delta
          if (item.stockDisponible != null && nuevaCantidad > item.stockDisponible) {
            toast.error('No hay más stock disponible de este producto')
            return item
          }
          return { ...item, cantidad: nuevaCantidad }
        })
        .filter((item) => item.cantidad > 0),
    )
  }

  const quitarDelCarrito = (productoId: string) => {
    setCarrito((prev) => prev.filter((item) => item.productoId !== productoId))
  }

  const total = carrito.reduce((suma, item) => suma + item.precio * item.cantidad, 0)

  const limpiarVenta = () => {
    setCarrito([])
    setClienteId('')
    setCategoriaIngresoId('')
    setNotas('')
  }

  const registrarVenta = async () => {
    if (carrito.length === 0) return
    setRegistrando(true)
    try {
      await axiosInstance.post('/ventas', {
        clienteId: clienteId || undefined,
        notas: notas || undefined,
        categoriaIngresoId: categoriaIngresoId || undefined,
        items: carrito.map((item) => ({ productoId: item.productoId, cantidad: item.cantidad })),
      })
      toast.success('Venta registrada')
      limpiarVenta()
      await Promise.all([cargarProductos(), cargarVentas()])
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo registrar la venta'))
    } finally {
      setRegistrando(false)
    }
  }

  const eliminarVenta = async (orden: Orden) => {
    const confirmado = window.confirm(
      `¿Eliminar esta venta de $${Number(orden.total).toFixed(2)}? Se revertirá el stock descontado.`,
    )
    if (!confirmado) return
    try {
      await axiosInstance.delete(`/ventas/${orden.id}`)
      toast.success('Venta eliminada y stock revertido')
      await Promise.all([cargarProductos(), cargarVentas()])
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo eliminar la venta'))
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
    <div>
      <h1 className="text-xl font-bold text-[var(--color-text)]">Ventas</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Punto de venta: agrega productos al carrito, confirma y el stock se descuenta
        automáticamente.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar producto por nombre o SKU…"
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
          />

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {productosFiltrados.map((producto) => {
              const sinStock = (producto.stock ?? 0) <= 0
              return (
                <button
                  key={producto.id}
                  type="button"
                  disabled={sinStock}
                  onClick={() => agregarAlCarrito(producto)}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3 text-left shadow-[var(--sombra-sm)] transition hover:border-[var(--color-primario)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <p className="text-sm font-medium text-[var(--color-text)]">{producto.nombre}</p>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    ${Number(producto.precio).toFixed(2)} · stock {producto.stock ?? 0}{' '}
                    {producto.unidadMedida}
                  </p>
                </button>
              )
            })}
            {productosFiltrados.length === 0 && (
              <p className="col-span-full py-6 text-center text-sm text-[var(--color-text-faint)]">
                Sin productos
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[var(--sombra-sm)]">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
            <ShoppingCart size={16} />
            Carrito
          </h2>

          <div className="mt-3 flex flex-col gap-2">
            {carrito.length === 0 && (
              <p className="py-4 text-center text-sm text-[var(--color-text-faint)]">
                Agrega productos desde la izquierda
              </p>
            )}
            {carrito.map((item) => (
              <div
                key={item.productoId}
                className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] pb-2 text-sm last:border-b-0"
              >
                <div>
                  <p className="font-medium text-[var(--color-text)]">{item.nombre}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    ${item.precio.toFixed(2)} c/u
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => cambiarCantidad(item.productoId, -1)}
                    className="rounded border border-[var(--color-border)] p-1 hover:bg-[var(--color-bg-subtle)]"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-6 text-center">{item.cantidad}</span>
                  <button
                    type="button"
                    onClick={() => cambiarCantidad(item.productoId, 1)}
                    className="rounded border border-[var(--color-border)] p-1 hover:bg-[var(--color-bg-subtle)]"
                  >
                    <Plus size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => quitarDelCarrito(item.productoId)}
                    className="ml-1 rounded p-1 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {clientes.length > 0 && (
            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-[var(--color-text)]">
                Cliente (opcional)
              </label>
              <select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm focus:border-[var(--color-primario)] focus:outline-none"
              >
                <option value="">Sin cliente</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          {categoriasIngreso.length > 0 && (
            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-[var(--color-text)]">
                Registrar como ingreso en Cuentas (opcional)
              </label>
              <select
                value={categoriaIngresoId}
                onChange={(e) => setCategoriaIngresoId(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm focus:border-[var(--color-primario)] focus:outline-none"
              >
                <option value="">No registrar</option>
                {categoriasIngreso.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-[var(--color-text)]">
              Notas (opcional)
            </label>
            <input
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm focus:border-[var(--color-primario)] focus:outline-none"
            />
          </div>

          <div className="mt-4 flex items-center justify-between text-sm font-semibold text-[var(--color-text)]">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>

          <PrimaryButton
            type="button"
            onClick={registrarVenta}
            disabled={registrando || carrito.length === 0}
            className="mt-3 flex w-full items-center justify-center gap-2"
          >
            {registrando && <Spinner size={14} />}
            {registrando ? 'Registrando…' : 'Registrar venta'}
          </PrimaryButton>
        </div>
      </div>

      <h2 className="mt-8 text-base font-semibold text-[var(--color-text)]">Ventas recientes</h2>
      <div className="mt-3 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-2">Fecha</th>
              <th className="px-4 py-2">Cliente</th>
              <th className="px-4 py-2">Items</th>
              <th className="px-4 py-2">Vendedor</th>
              <th className="px-4 py-2">Total</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {ventas.map((orden) => (
              <tr key={orden.id} className="border-t border-[var(--color-border)]">
                <td className="px-4 py-2">{new Date(orden.creadoEn).toLocaleString()}</td>
                <td className="px-4 py-2">{orden.cliente?.nombre ?? '—'}</td>
                <td className="px-4 py-2 text-[var(--color-text-muted)]">
                  {orden.items.map((item) => `${item.cantidad}× ${item.producto.nombre}`).join(', ')}
                </td>
                <td className="px-4 py-2 text-[var(--color-text-muted)]">{orden.usuario.nombre}</td>
                <td className="px-4 py-2 font-medium">${Number(orden.total).toFixed(2)}</td>
                <td className="px-4 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => eliminarVenta(orden)}
                    className="rounded p-1.5 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {ventas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-[var(--color-text-faint)]">
                  Sin ventas todavía
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
