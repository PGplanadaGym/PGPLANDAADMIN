import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, PackageCheck, MapPin } from 'lucide-react'
import { axiosInstance } from '../../lib/axios'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { Spinner } from '../../components/ui/Spinner'
import { CargandoPantalla } from '../../components/ui/CargandoPantalla'
import { MapaSeleccionUbicacion } from '../../components/ui/MapaSeleccionUbicacion'
import { MapaMarcaciones } from '../../components/ui/MapaMarcaciones'

interface Proveedor {
  id: string
  nombre: string
  contacto: string | null
  telefono: string | null
  email: string | null
  latitud: number | null
  longitud: number | null
}

interface Producto {
  id: string
  nombre: string
  sku: string | null
}

interface CategoriaMovimiento {
  id: string
  nombre: string
}

interface ItemCarrito {
  productoId: string
  nombre: string
  cantidad: number
  precioUnit: number
}

interface OrdenCompraItem {
  id: string
  cantidad: number
  precioUnit: string
  producto: { id: string; nombre: string; sku: string | null }
}

interface OrdenCompra {
  id: string
  estado: string
  total: string
  fechaRecepcion: string | null
  creadoEn: string
  proveedor: { id: string; nombre: string }
  usuario: { id: string; nombre: string }
  items: OrdenCompraItem[]
}

function mensajeError(error: unknown, fallback: string) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  )
}

export function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [categoriasEgreso, setCategoriasEgreso] = useState<CategoriaMovimiento[]>([])
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([])
  const [cargando, setCargando] = useState(true)

  const [nombreProveedor, setNombreProveedor] = useState('')
  const [telefonoProveedor, setTelefonoProveedor] = useState('')
  const [creandoProveedor, setCreandoProveedor] = useState(false)

  const [proveedorId, setProveedorId] = useState('')
  const [productoSeleccionado, setProductoSeleccionado] = useState('')
  const [carrito, setCarrito] = useState<ItemCarrito[]>([])
  const [creandoOrden, setCreandoOrden] = useState(false)

  const [modalRecibir, setModalRecibir] = useState<OrdenCompra | null>(null)
  const [categoriaEgresoId, setCategoriaEgresoId] = useState('')
  const [recibiendo, setRecibiendo] = useState(false)

  const [modalUbicacion, setModalUbicacion] = useState<Proveedor | null>(null)
  const [ubicacionSeleccionada, setUbicacionSeleccionada] = useState<{ lat: number; lng: number } | null>(
    null,
  )
  const [guardandoUbicacion, setGuardandoUbicacion] = useState(false)

  const cargarProveedores = () =>
    axiosInstance.get<Proveedor[]>('/proveedores').then(({ data }) => setProveedores(data))
  const cargarOrdenes = () =>
    axiosInstance.get<OrdenCompra[]>('/ordenes-compra').then(({ data }) => setOrdenes(data))

  useEffect(() => {
    setCargando(true)
    Promise.all([
      cargarProveedores(),
      axiosInstance.get<Producto[]>('/productos').then(({ data }) => setProductos(data)),
      axiosInstance
        .get<CategoriaMovimiento[]>('/categorias-movimiento', { params: { tipo: 'egreso' } })
        .then(({ data }) => setCategoriasEgreso(data))
        .catch(() => {
          /* módulo Cuentas puede no estar activo */
        }),
      cargarOrdenes(),
    ])
      .catch(() => toast.error('No se pudo cargar la información'))
      .finally(() => setCargando(false))
  }, [])

  const crearProveedor = async () => {
    if (!nombreProveedor.trim()) return
    setCreandoProveedor(true)
    try {
      await axiosInstance.post('/proveedores', {
        nombre: nombreProveedor,
        telefono: telefonoProveedor || undefined,
      })
      setNombreProveedor('')
      setTelefonoProveedor('')
      toast.success('Proveedor creado')
      await cargarProveedores()
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo crear el proveedor'))
    } finally {
      setCreandoProveedor(false)
    }
  }

  const abrirModalUbicacion = (proveedor: Proveedor) => {
    setModalUbicacion(proveedor)
    setUbicacionSeleccionada(
      proveedor.latitud != null && proveedor.longitud != null
        ? { lat: proveedor.latitud, lng: proveedor.longitud }
        : null,
    )
  }

  const guardarUbicacion = async () => {
    if (!modalUbicacion || !ubicacionSeleccionada) return
    setGuardandoUbicacion(true)
    try {
      await axiosInstance.patch(`/proveedores/${modalUbicacion.id}`, {
        latitud: ubicacionSeleccionada.lat,
        longitud: ubicacionSeleccionada.lng,
      })
      toast.success('Ubicación guardada')
      setModalUbicacion(null)
      await cargarProveedores()
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo guardar la ubicación'))
    } finally {
      setGuardandoUbicacion(false)
    }
  }

  const agregarItem = () => {
    const producto = productos.find((p) => p.id === productoSeleccionado)
    if (!producto) return
    if (carrito.some((item) => item.productoId === producto.id)) return
    setCarrito((prev) => [...prev, { productoId: producto.id, nombre: producto.nombre, cantidad: 1, precioUnit: 0 }])
    setProductoSeleccionado('')
  }

  const actualizarItem = (productoId: string, campo: 'cantidad' | 'precioUnit', valor: number) => {
    setCarrito((prev) =>
      prev.map((item) => (item.productoId === productoId ? { ...item, [campo]: valor } : item)),
    )
  }

  const quitarItem = (productoId: string) => {
    setCarrito((prev) => prev.filter((item) => item.productoId !== productoId))
  }

  const totalOrden = carrito.reduce((suma, item) => suma + item.cantidad * item.precioUnit, 0)

  const crearOrden = async () => {
    if (!proveedorId || carrito.length === 0) return
    setCreandoOrden(true)
    try {
      await axiosInstance.post('/ordenes-compra', {
        proveedorId,
        items: carrito.map((item) => ({
          productoId: item.productoId,
          cantidad: item.cantidad,
          precioUnit: item.precioUnit,
        })),
      })
      toast.success('Orden de compra creada')
      setProveedorId('')
      setCarrito([])
      await cargarOrdenes()
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo crear la orden de compra'))
    } finally {
      setCreandoOrden(false)
    }
  }

  const confirmarRecepcion = async () => {
    if (!modalRecibir) return
    setRecibiendo(true)
    try {
      await axiosInstance.post(`/ordenes-compra/${modalRecibir.id}/recibir`, {
        categoriaEgresoId: categoriaEgresoId || undefined,
      })
      toast.success('Orden recibida — stock actualizado')
      setModalRecibir(null)
      setCategoriaEgresoId('')
      await Promise.all([cargarOrdenes(), axiosInstance.get<Producto[]>('/productos').then(({ data }) => setProductos(data))])
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo recibir la orden'))
    } finally {
      setRecibiendo(false)
    }
  }

  const eliminarOrden = async (orden: OrdenCompra) => {
    const confirmado = window.confirm(
      orden.estado === 'recibida'
        ? '¿Eliminar esta orden? Se revertirá el stock que había sumado.'
        : '¿Eliminar esta orden de compra?',
    )
    if (!confirmado) return
    try {
      await axiosInstance.delete(`/ordenes-compra/${orden.id}`)
      toast.success('Orden eliminada')
      await cargarOrdenes()
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo eliminar la orden'))
    }
  }

  if (cargando) {
    return <CargandoPantalla minHeight={300} />
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--color-text)]">Proveedores y compras</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Registra proveedores y crea órdenes de compra. Al marcarlas como recibidas, el stock sube
        automáticamente y se puede registrar el egreso en Cuentas.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[var(--sombra-sm)]">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">Nuevo proveedor</h2>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <input
              value={nombreProveedor}
              onChange={(e) => setNombreProveedor(e.target.value)}
              placeholder="Nombre del proveedor"
              className="flex-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
            />
            <input
              value={telefonoProveedor}
              onChange={(e) => setTelefonoProveedor(e.target.value)}
              placeholder="Teléfono (opcional)"
              className="w-40 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
            />
            <PrimaryButton
              type="button"
              onClick={crearProveedor}
              disabled={creandoProveedor || !nombreProveedor.trim()}
              className="flex items-center gap-2"
            >
              {creandoProveedor && <Spinner size={14} />}
              Agregar
            </PrimaryButton>
          </div>

          <div className="mt-3 flex flex-col gap-1">
            {proveedores.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-[var(--color-text-muted)]">
                  {p.nombre}
                  {p.telefono ? ` · ${p.telefono}` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => abrirModalUbicacion(p)}
                  className={`flex shrink-0 items-center gap-1 rounded px-2 py-1 text-xs hover:bg-[var(--color-bg-subtle)] ${
                    p.latitud != null
                      ? 'text-[var(--color-primario-legible)]'
                      : 'text-[var(--color-text-faint)]'
                  }`}
                >
                  <MapPin size={13} />
                  {p.latitud != null ? 'Ver ubicación' : 'Agregar ubicación'}
                </button>
              </div>
            ))}
            {proveedores.length === 0 && (
              <p className="text-sm text-[var(--color-text-faint)]">Sin proveedores todavía</p>
            )}
          </div>

          {proveedores.some((p) => p.latitud != null) && (
            <div className="mt-3">
              <MapaMarcaciones
                puntos={proveedores
                  .filter((p) => p.latitud != null && p.longitud != null)
                  .map((p) => ({ id: p.id, lat: p.latitud!, lng: p.longitud!, titulo: p.nombre }))}
              />
            </div>
          )}
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[var(--sombra-sm)]">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">Nueva orden de compra</h2>

          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-[var(--color-text)]">
              Proveedor
            </label>
            <select
              value={proveedorId}
              onChange={(e) => setProveedorId(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
            >
              <option value="">Selecciona…</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3 flex gap-2">
            <select
              value={productoSeleccionado}
              onChange={(e) => setProductoSeleccionado(e.target.value)}
              className="flex-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
            >
              <option value="">Selecciona un producto…</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={agregarItem}
              disabled={!productoSeleccionado}
              className="shrink-0 rounded-lg border border-[var(--color-border)] p-2 text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-50"
            >
              <Plus size={16} />
            </button>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            {carrito.map((item) => (
              <div key={item.productoId} className="flex items-center gap-2 text-sm">
                <span className="flex-1 truncate text-[var(--color-text)]">{item.nombre}</span>
                <input
                  type="number"
                  min={1}
                  value={item.cantidad}
                  onChange={(e) => actualizarItem(item.productoId, 'cantidad', Number(e.target.value))}
                  className="w-16 rounded-lg border border-[var(--color-border)] px-2 py-1 text-sm"
                  placeholder="Cant."
                />
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={item.precioUnit}
                  onChange={(e) => actualizarItem(item.productoId, 'precioUnit', Number(e.target.value))}
                  className="w-20 rounded-lg border border-[var(--color-border)] px-2 py-1 text-sm"
                  placeholder="Costo c/u"
                />
                <button
                  type="button"
                  onClick={() => quitarItem(item.productoId)}
                  className="rounded p-1 text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between text-sm font-semibold text-[var(--color-text)]">
            <span>Total</span>
            <span>${totalOrden.toFixed(2)}</span>
          </div>

          <PrimaryButton
            type="button"
            onClick={crearOrden}
            disabled={creandoOrden || !proveedorId || carrito.length === 0}
            className="mt-3 flex w-full items-center justify-center gap-2"
          >
            {creandoOrden && <Spinner size={14} />}
            Crear orden de compra
          </PrimaryButton>
        </div>
      </div>

      <h2 className="mt-8 text-base font-semibold text-[var(--color-text)]">Órdenes de compra</h2>
      <div className="mt-3 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-2">Fecha</th>
              <th className="px-4 py-2">Proveedor</th>
              <th className="px-4 py-2">Items</th>
              <th className="px-4 py-2">Total</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {ordenes.map((orden) => (
              <tr key={orden.id} className="border-t border-[var(--color-border)]">
                <td className="px-4 py-2">{new Date(orden.creadoEn).toLocaleString()}</td>
                <td className="px-4 py-2">{orden.proveedor.nombre}</td>
                <td className="px-4 py-2 text-[var(--color-text-muted)]">
                  {orden.items.map((item) => `${item.cantidad}× ${item.producto.nombre}`).join(', ')}
                </td>
                <td className="px-4 py-2 font-medium">${Number(orden.total).toFixed(2)}</td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      orden.estado === 'recibida'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {orden.estado}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="flex justify-end gap-1">
                    {orden.estado === 'pendiente' && (
                      <button
                        type="button"
                        onClick={() => setModalRecibir(orden)}
                        className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--color-primario-legible)] hover:bg-[var(--color-bg-subtle)]"
                      >
                        <PackageCheck size={14} />
                        Recibir
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => eliminarOrden(orden)}
                      className="rounded p-1.5 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {ordenes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-[var(--color-text-faint)]">
                  Sin órdenes de compra todavía
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalRecibir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-[var(--color-bg-card)] p-6 shadow-[var(--sombra-lg)]">
            <h2 className="text-base font-semibold text-[var(--color-text)]">
              Recibir orden de «{modalRecibir.proveedor.nombre}»
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              Se sumará el stock de cada producto de la orden.
            </p>

            {categoriasEgreso.length > 0 && (
              <div className="mt-4">
                <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
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

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalRecibir(null)}
                className="rounded px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]"
              >
                Cancelar
              </button>
              <PrimaryButton
                type="button"
                onClick={confirmarRecepcion}
                disabled={recibiendo}
                className="flex items-center gap-2"
              >
                {recibiendo && <Spinner size={14} />}
                Confirmar recepción
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {modalUbicacion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-[var(--color-bg-card)] p-6 shadow-[var(--sombra-lg)]">
            <h2 className="text-base font-semibold text-[var(--color-text)]">
              Ubicación de «{modalUbicacion.nombre}»
            </h2>

            <div className="mt-4">
              <MapaSeleccionUbicacion
                valor={ubicacionSeleccionada}
                onCambiar={(lat, lng) => setUbicacionSeleccionada({ lat, lng })}
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalUbicacion(null)}
                className="rounded px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]"
              >
                Cancelar
              </button>
              <PrimaryButton
                type="button"
                onClick={guardarUbicacion}
                disabled={guardandoUbicacion || !ubicacionSeleccionada}
                className="flex items-center gap-2"
              >
                {guardandoUbicacion && <Spinner size={14} />}
                Guardar ubicación
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
