import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, PackageCheck, MapPin, Pencil, Archive, ArchiveRestore, Ban } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { CanAccess } from '@refinedev/core'
import { axiosInstance } from '../../lib/axios'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { Spinner } from '../../components/ui/Spinner'
import { CargandoPantalla } from '../../components/ui/CargandoPantalla'
import { SearchInput } from '../../components/ui/SearchInput'
import { MapaSeleccionUbicacion } from '../../components/ui/MapaSeleccionUbicacion'
import { MapaMarcaciones } from '../../components/ui/MapaMarcaciones'
import { useConfirm } from '../../components/ui/ConfirmDialog'
import { Avatar } from '../../components/ui/Avatar'
import { ImageUploadField } from '../../components/ui/ImageUploadField'

function fechaHaceDias(dias: number) {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() - dias)
  return fecha.toISOString().slice(0, 10)
}

interface Proveedor {
  id: string
  nombre: string
  ruc: string | null
  contacto: string | null
  telefono: string | null
  email: string | null
  notas: string | null
  latitud: number | null
  longitud: number | null
  logoUrl: string | null
  activo: boolean
}

interface Producto {
  id: string
  tipo: string
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
  cantidadRecibida: number
  precioUnit: string
  producto: { id: string; nombre: string; sku: string | null }
}

interface OrdenCompra {
  id: string
  estado: string
  total: string
  fechaEsperada: string | null
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
  const { confirmar, dialog } = useConfirm()
  const location = useLocation()
  const productoIdSugerido = (location.state as { productoIdSugerido?: string } | null)
    ?.productoIdSugerido

  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [categoriasEgreso, setCategoriasEgreso] = useState<CategoriaMovimiento[]>([])
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([])
  const [cargando, setCargando] = useState(true)
  const [cargandoProveedores, setCargandoProveedores] = useState(false)
  const [cargandoOrdenes, setCargandoOrdenes] = useState(false)

  const [busquedaProveedor, setBusquedaProveedor] = useState('')
  const [mostrarProveedoresArchivados, setMostrarProveedoresArchivados] = useState(false)

  const [nombreProveedor, setNombreProveedor] = useState('')
  const [telefonoProveedor, setTelefonoProveedor] = useState('')
  const [rucProveedor, setRucProveedor] = useState('')
  const [creandoProveedor, setCreandoProveedor] = useState(false)
  const [cambiandoActivoProveedorId, setCambiandoActivoProveedorId] = useState<string | null>(null)

  const [proveedorEdit, setProveedorEdit] = useState<Proveedor | null>(null)
  const [nombreEdit, setNombreEdit] = useState('')
  const [rucEdit, setRucEdit] = useState('')
  const [contactoEdit, setContactoEdit] = useState('')
  const [telefonoEdit, setTelefonoEdit] = useState('')
  const [emailEdit, setEmailEdit] = useState('')
  const [notasEdit, setNotasEdit] = useState('')
  const [logoUrlEdit, setLogoUrlEdit] = useState('')
  const [guardandoEdicionProveedor, setGuardandoEdicionProveedor] = useState(false)

  const [proveedorId, setProveedorId] = useState('')
  const [productoSeleccionado, setProductoSeleccionado] = useState('')
  const [carrito, setCarrito] = useState<ItemCarrito[]>([])
  const [fechaEsperada, setFechaEsperada] = useState('')
  const [creandoOrden, setCreandoOrden] = useState(false)

  const [modalRecibir, setModalRecibir] = useState<OrdenCompra | null>(null)
  const [categoriaEgresoId, setCategoriaEgresoId] = useState('')
  const [cantidadesRecibir, setCantidadesRecibir] = useState<Record<string, number>>({})
  const [recibiendo, setRecibiendo] = useState(false)

  const [filtroDesdeOrdenes, setFiltroDesdeOrdenes] = useState(fechaHaceDias(30))
  const [filtroHastaOrdenes, setFiltroHastaOrdenes] = useState('')
  const [filtroTextoOrdenes, setFiltroTextoOrdenes] = useState('')

  const [modalUbicacion, setModalUbicacion] = useState<Proveedor | null>(null)
  const [ubicacionSeleccionada, setUbicacionSeleccionada] = useState<{ lat: number; lng: number } | null>(
    null,
  )
  const [guardandoUbicacion, setGuardandoUbicacion] = useState(false)

  const cargarProveedores = (incluirInactivos: boolean) =>
    axiosInstance
      .get<Proveedor[]>('/proveedores', { params: incluirInactivos ? { incluirInactivos: 'true' } : {} })
      .then(({ data }) => setProveedores(data))
  const cargarOrdenes = (desde?: string, hasta?: string) =>
    axiosInstance
      .get<OrdenCompra[]>('/ordenes-compra', { params: { desde: desde || undefined, hasta: hasta || undefined } })
      .then(({ data }) => setOrdenes(data))

  useEffect(() => {
    setCargando(true)
    Promise.all([
      axiosInstance
        .get<Producto[]>('/productos')
        .then(({ data }) => setProductos(data.filter((p) => p.tipo === 'producto'))),
      axiosInstance
        .get<CategoriaMovimiento[]>('/categorias-movimiento', { params: { tipo: 'egreso' } })
        .then(({ data }) => setCategoriasEgreso(data))
        .catch(() => {
          /* módulo Cuentas puede no estar activo */
        }),
    ])
      .catch(() => toast.error('No se pudo cargar la información'))
      .finally(() => setCargando(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setCargandoProveedores(true)
    cargarProveedores(mostrarProveedoresArchivados)
      .catch(() => toast.error('No se pudieron cargar los proveedores'))
      .finally(() => setCargandoProveedores(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mostrarProveedoresArchivados])

  useEffect(() => {
    setCargandoOrdenes(true)
    cargarOrdenes(filtroDesdeOrdenes, filtroHastaOrdenes)
      .catch(() => toast.error('No se pudieron cargar las órdenes de compra'))
      .finally(() => setCargandoOrdenes(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroDesdeOrdenes, filtroHastaOrdenes])

  useEffect(() => {
    if (!productoIdSugerido || productos.length === 0) return
    const producto = productos.find((p) => p.id === productoIdSugerido)
    if (!producto) return
    setCarrito((prev) =>
      prev.some((item) => item.productoId === producto.id)
        ? prev
        : [...prev, { productoId: producto.id, nombre: producto.nombre, cantidad: 1, precioUnit: 0 }],
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productoIdSugerido, productos])

  const crearProveedor = async () => {
    if (!nombreProveedor.trim()) return
    setCreandoProveedor(true)
    try {
      await axiosInstance.post('/proveedores', {
        nombre: nombreProveedor,
        telefono: telefonoProveedor || undefined,
        ruc: rucProveedor || undefined,
      })
      setNombreProveedor('')
      setTelefonoProveedor('')
      setRucProveedor('')
      toast.success('Proveedor creado')
      await cargarProveedores(mostrarProveedoresArchivados)
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo crear el proveedor'))
    } finally {
      setCreandoProveedor(false)
    }
  }

  const abrirEdicionProveedor = (proveedor: Proveedor) => {
    setProveedorEdit(proveedor)
    setNombreEdit(proveedor.nombre)
    setRucEdit(proveedor.ruc ?? '')
    setContactoEdit(proveedor.contacto ?? '')
    setTelefonoEdit(proveedor.telefono ?? '')
    setEmailEdit(proveedor.email ?? '')
    setNotasEdit(proveedor.notas ?? '')
    setLogoUrlEdit(proveedor.logoUrl ?? '')
  }

  const guardarEdicionProveedor = async () => {
    if (!proveedorEdit || !nombreEdit.trim()) return
    setGuardandoEdicionProveedor(true)
    try {
      await axiosInstance.patch(`/proveedores/${proveedorEdit.id}`, {
        nombre: nombreEdit,
        ruc: rucEdit || null,
        contacto: contactoEdit || null,
        telefono: telefonoEdit || null,
        email: emailEdit || null,
        notas: notasEdit || null,
        logoUrl: logoUrlEdit || null,
      })
      toast.success('Proveedor actualizado')
      setProveedorEdit(null)
      await cargarProveedores(mostrarProveedoresArchivados)
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo actualizar el proveedor'))
    } finally {
      setGuardandoEdicionProveedor(false)
    }
  }

  const alternarActivoProveedor = async (proveedor: Proveedor) => {
    setCambiandoActivoProveedorId(proveedor.id)
    try {
      await axiosInstance.patch(`/proveedores/${proveedor.id}`, { activo: !proveedor.activo })
      toast.success(proveedor.activo ? 'Proveedor archivado' : 'Proveedor reactivado')
      await cargarProveedores(mostrarProveedoresArchivados)
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo actualizar el proveedor'))
    } finally {
      setCambiandoActivoProveedorId(null)
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
      await cargarProveedores(mostrarProveedoresArchivados)
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
        fechaEsperada: fechaEsperada || undefined,
        items: carrito.map((item) => ({
          productoId: item.productoId,
          cantidad: item.cantidad,
          precioUnit: item.precioUnit,
        })),
      })
      toast.success('Orden de compra creada')
      setProveedorId('')
      setCarrito([])
      setFechaEsperada('')
      await cargarOrdenes(filtroDesdeOrdenes, filtroHastaOrdenes)
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo crear la orden de compra'))
    } finally {
      setCreandoOrden(false)
    }
  }

  const abrirModalRecibir = (orden: OrdenCompra) => {
    setModalRecibir(orden)
    setCategoriaEgresoId('')
    setCantidadesRecibir(
      Object.fromEntries(
        orden.items
          .filter((item) => item.cantidad > item.cantidadRecibida)
          .map((item) => [item.id, item.cantidad - item.cantidadRecibida]),
      ),
    )
  }

  const confirmarRecepcion = async () => {
    if (!modalRecibir) return
    setRecibiendo(true)
    try {
      await axiosInstance.post(`/ordenes-compra/${modalRecibir.id}/recibir`, {
        categoriaEgresoId: categoriaEgresoId || undefined,
        items: Object.entries(cantidadesRecibir)
          .filter(([, cantidad]) => cantidad > 0)
          .map(([ordenCompraItemId, cantidad]) => ({ ordenCompraItemId, cantidad })),
      })
      toast.success('Recepción registrada — stock actualizado')
      setModalRecibir(null)
      setCategoriaEgresoId('')
      setCantidadesRecibir({})
      await Promise.all([
        cargarOrdenes(filtroDesdeOrdenes, filtroHastaOrdenes),
        axiosInstance
          .get<Producto[]>('/productos')
          .then(({ data }) => setProductos(data.filter((p) => p.tipo === 'producto'))),
      ])
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo recibir la orden'))
    } finally {
      setRecibiendo(false)
    }
  }

  const cancelarOrden = async (orden: OrdenCompra) => {
    const confirmado = await confirmar(
      'Cancelar orden de compra',
      '¿Cancelar esta orden de compra? Se marca como cancelada pero queda en el historial.',
      'Cancelar orden',
    )
    if (!confirmado) return
    try {
      await axiosInstance.post(`/ordenes-compra/${orden.id}/cancelar`)
      toast.success('Orden cancelada')
      await cargarOrdenes(filtroDesdeOrdenes, filtroHastaOrdenes)
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo cancelar la orden'))
    }
  }

  const eliminarOrden = async (orden: OrdenCompra) => {
    const confirmado = await confirmar(
      'Eliminar orden de compra',
      orden.estado === 'recibida'
        ? '¿Eliminar esta orden? Se revertirá el stock que había sumado.'
        : '¿Eliminar esta orden de compra? Esta acción no se puede deshacer.',
      'Eliminar',
    )
    if (!confirmado) return
    try {
      await axiosInstance.delete(`/ordenes-compra/${orden.id}`)
      toast.success('Orden eliminada')
      await cargarOrdenes(filtroDesdeOrdenes, filtroHastaOrdenes)
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo eliminar la orden'))
    }
  }

  const proveedoresFiltrados = useMemo(() => {
    const q = busquedaProveedor.trim().toLowerCase()
    if (!q) return proveedores
    return proveedores.filter((p) => p.nombre.toLowerCase().includes(q))
  }, [busquedaProveedor, proveedores])

  const ordenesFiltradas = useMemo(() => {
    const q = filtroTextoOrdenes.trim().toLowerCase()
    if (!q) return ordenes
    return ordenes.filter(
      (o) =>
        o.proveedor.nombre.toLowerCase().includes(q) ||
        o.items.some((item) => item.producto.nombre.toLowerCase().includes(q)),
    )
  }, [filtroTextoOrdenes, ordenes])

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
          <CanAccess resource="proveedores" action="create">
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
              <input
                value={rucProveedor}
                onChange={(e) => setRucProveedor(e.target.value)}
                placeholder="RUC (opcional)"
                className="w-36 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
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
          </CanAccess>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <SearchInput
              value={busquedaProveedor}
              onChange={setBusquedaProveedor}
              placeholder="Buscar proveedor…"
            />
            <label className="ml-auto flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
              <input
                type="checkbox"
                checked={mostrarProveedoresArchivados}
                onChange={(e) => setMostrarProveedoresArchivados(e.target.checked)}
              />
              Mostrar archivados
            </label>
          </div>

          <div className="relative mt-3 flex flex-col gap-1">
            {cargandoProveedores && (
              <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-xl bg-[var(--color-bg-card)]/70 text-sm text-[var(--color-text-muted)]">
                <Spinner size={18} />
                Actualizando…
              </div>
            )}
            {proveedoresFiltrados.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="flex min-w-0 items-center gap-2 text-[var(--color-text-muted)]">
                  <Avatar nombre={p.nombre} fotoUrl={p.logoUrl} size={24} />
                  <Link to={`/proveedores/${p.id}`} className="truncate text-[var(--color-primario-legible)] hover:underline">
                    {p.nombre}
                  </Link>
                  {p.telefono ? ` · ${p.telefono}` : ''}
                  {!p.activo && (
                    <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                      Archivado
                    </span>
                  )}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => abrirModalUbicacion(p)}
                    className={`flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-[var(--color-bg-subtle)] ${
                      p.latitud != null
                        ? 'text-[var(--color-primario-legible)]'
                        : 'text-[var(--color-text-faint)]'
                    }`}
                  >
                    <MapPin size={13} />
                    {p.latitud != null ? 'Ver ubicación' : 'Agregar ubicación'}
                  </button>
                  <CanAccess resource="proveedores" action="edit">
                    <button
                      type="button"
                      onClick={() => abrirEdicionProveedor(p)}
                      title="Editar proveedor"
                      className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)]"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => alternarActivoProveedor(p)}
                      disabled={cambiandoActivoProveedorId === p.id}
                      title={p.activo ? 'Archivar' : 'Reactivar'}
                      className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-50"
                    >
                      {cambiandoActivoProveedorId === p.id ? (
                        <Spinner size={13} />
                      ) : p.activo ? (
                        <Archive size={13} />
                      ) : (
                        <ArchiveRestore size={13} />
                      )}
                    </button>
                  </CanAccess>
                </div>
              </div>
            ))}
            {proveedoresFiltrados.length === 0 && (
              <p className="text-sm text-[var(--color-text-faint)]">
                {busquedaProveedor ? 'Sin resultados para tu búsqueda' : 'Sin proveedores todavía'}
              </p>
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
          {productoIdSugerido && carrito.some((item) => item.productoId === productoIdSugerido) && (
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Producto agregado automáticamente por tener stock bajo — completa proveedor, cantidad
              y costo.
            </p>
          )}

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

          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-[var(--color-text)]">
              Entrega esperada (opcional)
            </label>
            <input
              type="date"
              value={fechaEsperada}
              onChange={(e) => setFechaEsperada(e.target.value)}
              className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm focus:border-[var(--color-primario)] focus:outline-none"
            />
          </div>

          <div className="mt-3 flex items-center justify-between text-sm font-semibold text-[var(--color-text)]">
            <span>Total</span>
            <span>${totalOrden.toFixed(2)}</span>
          </div>

          <CanAccess resource="compras" action="create">
            <PrimaryButton
              type="button"
              onClick={crearOrden}
              disabled={creandoOrden || !proveedorId || carrito.length === 0}
              className="mt-3 flex w-full items-center justify-center gap-2"
            >
              {creandoOrden && <Spinner size={14} />}
              Crear orden de compra
            </PrimaryButton>
          </CanAccess>
        </div>
      </div>

      <h2 className="mt-8 text-base font-semibold text-[var(--color-text)]">Órdenes de compra</h2>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-text)]">Desde</label>
          <input
            type="date"
            value={filtroDesdeOrdenes}
            onChange={(e) => setFiltroDesdeOrdenes(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm focus:border-[var(--color-primario)] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-text)]">Hasta</label>
          <input
            type="date"
            value={filtroHastaOrdenes}
            onChange={(e) => setFiltroHastaOrdenes(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm focus:border-[var(--color-primario)] focus:outline-none"
          />
        </div>
        <input
          value={filtroTextoOrdenes}
          onChange={(e) => setFiltroTextoOrdenes(e.target.value)}
          placeholder="Buscar por proveedor o producto…"
          className="min-w-[220px] flex-1 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm focus:border-[var(--color-primario)] focus:outline-none"
        />
      </div>

      <div className="relative mt-2 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)]">
        {cargandoOrdenes && (
          <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-xl bg-[var(--color-bg-card)]/70 text-sm text-[var(--color-text-muted)]">
            <Spinner size={18} />
            Actualizando…
          </div>
        )}
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-2">Fecha</th>
              <th className="px-4 py-2">Proveedor</th>
              <th className="px-4 py-2">Items</th>
              <th className="px-4 py-2">Entrega esperada</th>
              <th className="px-4 py-2">Total</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {ordenesFiltradas.map((orden) => {
              const atrasada =
                orden.estado === 'pendiente' &&
                orden.fechaEsperada != null &&
                new Date(orden.fechaEsperada) < new Date()
              return (
                <tr key={orden.id} className="border-t border-[var(--color-border)]">
                  <td className="px-4 py-2">{new Date(orden.creadoEn).toLocaleString()}</td>
                  <td className="px-4 py-2">{orden.proveedor.nombre}</td>
                  <td className="px-4 py-2 text-[var(--color-text-muted)]">
                    {orden.items
                      .map((item) =>
                        item.cantidadRecibida > 0 && item.cantidadRecibida < item.cantidad
                          ? `${item.cantidadRecibida}/${item.cantidad}× ${item.producto.nombre}`
                          : `${item.cantidad}× ${item.producto.nombre}`,
                      )
                      .join(', ')}
                  </td>
                  <td className="px-4 py-2 text-[var(--color-text-muted)]">
                    {orden.fechaEsperada ? (
                      <>
                        {new Date(orden.fechaEsperada).toLocaleDateString()}
                        {atrasada && (
                          <span className="ml-1.5 rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">
                            Atrasada
                          </span>
                        )}
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-2 font-medium">${Number(orden.total).toFixed(2)}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        orden.estado === 'recibida'
                          ? 'bg-green-100 text-green-700'
                          : orden.estado === 'parcial'
                            ? 'bg-blue-100 text-blue-700'
                            : orden.estado === 'cancelada'
                              ? 'bg-gray-100 text-gray-600'
                              : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {orden.estado}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      {(orden.estado === 'pendiente' || orden.estado === 'parcial') && (
                        <CanAccess resource="compras" action="edit">
                          <button
                            type="button"
                            onClick={() => abrirModalRecibir(orden)}
                            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--color-primario-legible)] hover:bg-[var(--color-bg-subtle)]"
                          >
                            <PackageCheck size={14} />
                            Recibir
                          </button>
                          {orden.estado === 'pendiente' && (
                            <button
                              type="button"
                              onClick={() => cancelarOrden(orden)}
                              title="Cancelar (queda en el historial)"
                              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)]"
                            >
                              <Ban size={14} />
                              Cancelar
                            </button>
                          )}
                        </CanAccess>
                      )}
                      <CanAccess resource="compras" action="delete">
                        <button
                          type="button"
                          onClick={() => eliminarOrden(orden)}
                          className="rounded p-1.5 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </CanAccess>
                    </div>
                  </td>
                </tr>
              )
            })}
            {ordenesFiltradas.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-[var(--color-text-faint)]">
                  {cargandoOrdenes ? (
                    <CargandoPantalla minHeight={80} />
                  ) : filtroTextoOrdenes ? (
                    'Sin resultados para tu búsqueda'
                  ) : (
                    'Sin órdenes de compra en este rango de fechas'
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalRecibir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-xl bg-[var(--color-bg-card)] p-6 shadow-[var(--sombra-lg)]">
            <h2 className="text-base font-semibold text-[var(--color-text)]">
              Recibir orden de «{modalRecibir.proveedor.nombre}»
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              Indica cuánto llegó de cada producto — puede ser menos de lo pedido, para completar
              después.
            </p>

            <div className="mt-4 flex flex-col gap-3">
              {modalRecibir.items
                .filter((item) => item.cantidad > item.cantidadRecibida)
                .map((item) => {
                  const restante = item.cantidad - item.cantidadRecibida
                  return (
                    <div key={item.id}>
                      <label className="mb-1 flex items-center justify-between text-sm font-medium text-[var(--color-text)]">
                        <span>{item.producto.nombre}</span>
                        <span className="text-xs font-normal text-[var(--color-text-muted)]">
                          Pendiente: {restante} (pedido {item.cantidad})
                        </span>
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={restante}
                        value={cantidadesRecibir[item.id] ?? 0}
                        onChange={(e) =>
                          setCantidadesRecibir((prev) => ({
                            ...prev,
                            [item.id]: Math.min(Math.max(Number(e.target.value), 0), restante),
                          }))
                        }
                        className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                      />
                    </div>
                  )
                })}
            </div>

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
                disabled={recibiendo || Object.values(cantidadesRecibir).every((c) => !c || c <= 0)}
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
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-[var(--color-bg-card)] p-6 shadow-[var(--sombra-lg)]">
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
              <CanAccess resource="proveedores" action="edit">
                <PrimaryButton
                  type="button"
                  onClick={guardarUbicacion}
                  disabled={guardandoUbicacion || !ubicacionSeleccionada}
                  className="flex items-center gap-2"
                >
                  {guardandoUbicacion && <Spinner size={14} />}
                  Guardar ubicación
                </PrimaryButton>
              </CanAccess>
            </div>
          </div>
        </div>
      )}

      {proveedorEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl bg-[var(--color-bg-card)] p-6 shadow-[var(--sombra-lg)]">
            <h2 className="text-base font-semibold text-[var(--color-text)]">Editar proveedor</h2>
            <div className="mt-4 flex flex-col gap-3">
              <ImageUploadField label="Logo (opcional)" value={logoUrlEdit} onChange={setLogoUrlEdit} rounded />

              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                  Nombre
                </label>
                <input
                  value={nombreEdit}
                  onChange={(e) => setNombreEdit(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                  RUC
                </label>
                <input
                  value={rucEdit}
                  onChange={(e) => setRucEdit(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                    Contacto
                  </label>
                  <input
                    value={contactoEdit}
                    onChange={(e) => setContactoEdit(e.target.value)}
                    placeholder="Nombre de la persona de contacto"
                    className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                    Teléfono
                  </label>
                  <input
                    value={telefonoEdit}
                    onChange={(e) => setTelefonoEdit(e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                  Email
                </label>
                <input
                  type="email"
                  value={emailEdit}
                  onChange={(e) => setEmailEdit(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                  Notas
                </label>
                <textarea
                  value={notasEdit}
                  onChange={(e) => setNotasEdit(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setProveedorEdit(null)}
                className="rounded px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]"
              >
                Cancelar
              </button>
              <PrimaryButton
                type="button"
                onClick={guardarEdicionProveedor}
                disabled={guardandoEdicionProveedor || !nombreEdit.trim()}
                className="flex items-center gap-2"
              >
                {guardandoEdicionProveedor && <Spinner size={14} />}
                {guardandoEdicionProveedor ? 'Guardando…' : 'Guardar cambios'}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {dialog}
    </div>
  )
}
