import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Pencil, Archive, ArchiveRestore, ShoppingCart, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { CanAccess, useGetIdentity } from '@refinedev/core'
import { axiosInstance } from '../../lib/axios'
import { buildAbility } from '../../ability/ability'
import type { Identity } from '../../lib/identity'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { Spinner } from '../../components/ui/Spinner'
import { CargandoPantalla } from '../../components/ui/CargandoPantalla'
import { SearchInput } from '../../components/ui/SearchInput'
import { ExportarExcelButton } from '../../components/ui/ExportarExcelButton'
import { useConfirm } from '../../components/ui/ConfirmDialog'
import { ImageUploadField } from '../../components/ui/ImageUploadField'

const TIPOS_MOVIMIENTO = [
  { value: 'entrada', label: 'Entrada (compra/reposición)' },
  { value: 'salida', label: 'Salida (venta/consumo)' },
  { value: 'ajuste', label: 'Ajuste de conteo físico' },
] as const

const TIPOS_PRODUCTO = [
  { value: 'producto', label: 'Producto (con stock)' },
  { value: 'servicio', label: 'Servicio (sin stock)' },
] as const

function mensajeError(error: unknown, fallback: string) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  )
}

interface CategoriaProducto {
  id: string
  nombre: string
  activo: boolean
  _count: { productos: number }
}

interface Producto {
  id: string
  tipo: string
  nombre: string
  sku: string | null
  precio: string
  costo: string | null
  stock: number | null
  stockMinimo: number | null
  unidadMedida: string
  activo: boolean
  imagenUrl: string | null
  categoria: CategoriaProducto | null
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

interface Sucursal {
  id: string
  nombre: string
}

interface StockPorSucursal {
  sucursalId: string | null
  sucursalNombre: string | null
  stock: number
}

export function ProductosPage() {
  const navigate = useNavigate()
  const { confirmar, dialog } = useConfirm()
  const { data: identity } = useGetIdentity<Identity>()
  const ability = useMemo(() => buildAbility(identity?.permisos ?? []), [identity?.permisos])
  const puedeRegistrarMovimiento = ability.can('productos.movimientos.crear', 'all')

  const [productos, setProductos] = useState<Producto[]>([])
  const [categorias, setCategorias] = useState<CategoriaProducto[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [cargando, setCargando] = useState(true)

  const [nombreCategoria, setNombreCategoria] = useState('')
  const [creandoCategoria, setCreandoCategoria] = useState(false)
  const [mostrarCategoriasArchivadas, setMostrarCategoriasArchivadas] = useState(false)
  const [categoriaEdit, setCategoriaEdit] = useState<CategoriaProducto | null>(null)
  const [nombreCategoriaEdit, setNombreCategoriaEdit] = useState('')
  const [guardandoCategoriaEdit, setGuardandoCategoriaEdit] = useState(false)
  const [cambiandoActivoCategoriaId, setCambiandoActivoCategoriaId] = useState<string | null>(null)
  const [eliminandoCategoriaId, setEliminandoCategoriaId] = useState<string | null>(null)

  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<(typeof TIPOS_PRODUCTO)[number]['value']>('producto')
  const [categoriaId, setCategoriaId] = useState('')
  const [sku, setSku] = useState('')
  const [precio, setPrecio] = useState(0)
  const [costo, setCosto] = useState('')
  const [unidadMedida, setUnidadMedida] = useState('unidad')
  const [stockMinimo, setStockMinimo] = useState<number | ''>('')
  const [imagenUrl, setImagenUrl] = useState('')
  const [creando, setCreando] = useState(false)

  const [query, setQuery] = useState('')
  const [filtroCategoriaId, setFiltroCategoriaId] = useState('')
  const [soloStockBajo, setSoloStockBajo] = useState(false)
  const [mostrarArchivados, setMostrarArchivados] = useState(false)

  const [productoEdit, setProductoEdit] = useState<Producto | null>(null)
  const [nombreEdit, setNombreEdit] = useState('')
  const [categoriaIdEdit, setCategoriaIdEdit] = useState('')
  const [skuEdit, setSkuEdit] = useState('')
  const [precioEdit, setPrecioEdit] = useState(0)
  const [costoEdit, setCostoEdit] = useState('')
  const [unidadMedidaEdit, setUnidadMedidaEdit] = useState('unidad')
  const [stockMinimoEdit, setStockMinimoEdit] = useState<number | ''>('')
  const [imagenUrlEdit, setImagenUrlEdit] = useState('')
  const [guardandoEdit, setGuardandoEdit] = useState(false)
  const [cambiandoActivoId, setCambiandoActivoId] = useState<string | null>(null)

  const [modalMovimiento, setModalMovimiento] = useState<Producto | null>(null)
  const [tipoMovimiento, setTipoMovimiento] = useState<(typeof TIPOS_MOVIMIENTO)[number]['value']>(
    'entrada',
  )
  const [cantidad, setCantidad] = useState(0)
  const [motivo, setMotivo] = useState('')
  const [sucursalIdMovimiento, setSucursalIdMovimiento] = useState('')
  const [registrando, setRegistrando] = useState(false)

  const [modalHistorial, setModalHistorial] = useState<Producto | null>(null)
  const [historial, setHistorial] = useState<Movimiento[]>([])
  const [cargandoHistorial, setCargandoHistorial] = useState(false)

  const [modalStockSucursal, setModalStockSucursal] = useState<Producto | null>(null)
  const [stockSucursal, setStockSucursal] = useState<StockPorSucursal[]>([])
  const [cargandoStockSucursal, setCargandoStockSucursal] = useState(false)

  const cargar = async () => {
    setCargando(true)
    try {
      const [p, c] = await Promise.all([
        axiosInstance.get<Producto[]>('/productos', {
          params: mostrarArchivados ? { incluirInactivos: 'true' } : {},
        }),
        axiosInstance.get<CategoriaProducto[]>('/categorias-producto', {
          params: mostrarCategoriasArchivadas ? { incluirInactivos: 'true' } : {},
        }),
      ])
      setProductos(p.data)
      setCategorias(c.data)
    } catch {
      toast.error('No se pudieron cargar los productos')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mostrarArchivados, mostrarCategoriasArchivadas])

  useEffect(() => {
    axiosInstance
      .get<Sucursal[]>('/sucursales')
      .then(({ data }) => setSucursales(data))
      .catch(() => {
        /* módulo Sucursales puede no estar activo */
      })
  }, [])

  const crearCategoria = async () => {
    if (!nombreCategoria.trim()) return
    setCreandoCategoria(true)
    try {
      await axiosInstance.post('/categorias-producto', { nombre: nombreCategoria })
      setNombreCategoria('')
      toast.success('Categoría creada')
      await cargar()
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo crear la categoría'))
    } finally {
      setCreandoCategoria(false)
    }
  }

  const abrirEdicionCategoria = (categoria: CategoriaProducto) => {
    setCategoriaEdit(categoria)
    setNombreCategoriaEdit(categoria.nombre)
  }

  const guardarEdicionCategoria = async () => {
    if (!categoriaEdit || !nombreCategoriaEdit.trim()) return
    setGuardandoCategoriaEdit(true)
    try {
      await axiosInstance.patch(`/categorias-producto/${categoriaEdit.id}`, {
        nombre: nombreCategoriaEdit,
      })
      toast.success('Categoría actualizada')
      setCategoriaEdit(null)
      await cargar()
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo actualizar la categoría'))
    } finally {
      setGuardandoCategoriaEdit(false)
    }
  }

  const alternarActivoCategoria = async (categoria: CategoriaProducto) => {
    setCambiandoActivoCategoriaId(categoria.id)
    try {
      await axiosInstance.patch(`/categorias-producto/${categoria.id}`, {
        activo: !categoria.activo,
      })
      toast.success(categoria.activo ? 'Categoría archivada' : 'Categoría reactivada')
      await cargar()
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo actualizar la categoría'))
    } finally {
      setCambiandoActivoCategoriaId(null)
    }
  }

  const eliminarCategoria = async (categoria: CategoriaProducto) => {
    const confirmado = await confirmar(
      'Eliminar categoría',
      `¿Eliminar la categoría «${categoria.nombre}»? Esta acción no se puede deshacer.`,
      'Eliminar',
    )
    if (!confirmado) return
    setEliminandoCategoriaId(categoria.id)
    try {
      await axiosInstance.delete(`/categorias-producto/${categoria.id}`)
      toast.success('Categoría eliminada')
      await cargar()
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo eliminar la categoría'))
    } finally {
      setEliminandoCategoriaId(null)
    }
  }

  const crearProducto = async () => {
    if (!nombre.trim() || precio <= 0) return
    setCreando(true)
    try {
      await axiosInstance.post('/productos', {
        nombre,
        tipo,
        categoriaId: categoriaId || undefined,
        sku: sku || undefined,
        precio,
        costo: costo ? Number(costo) : undefined,
        unidadMedida,
        stockMinimo: tipo === 'producto' && stockMinimo !== '' ? stockMinimo : undefined,
        imagenUrl: imagenUrl || undefined,
      })
      setNombre('')
      setSku('')
      setPrecio(0)
      setCosto('')
      setStockMinimo('')
      setImagenUrl('')
      toast.success(tipo === 'servicio' ? 'Servicio creado' : 'Producto creado')
      await cargar()
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo crear el producto'))
    } finally {
      setCreando(false)
    }
  }

  const abrirEdicionProducto = (producto: Producto) => {
    setProductoEdit(producto)
    setNombreEdit(producto.nombre)
    setCategoriaIdEdit(producto.categoria?.id ?? '')
    setSkuEdit(producto.sku ?? '')
    setPrecioEdit(Number(producto.precio))
    setCostoEdit(producto.costo ?? '')
    setUnidadMedidaEdit(producto.unidadMedida)
    setStockMinimoEdit(producto.stockMinimo ?? '')
    setImagenUrlEdit(producto.imagenUrl ?? '')
  }

  const guardarEdicionProducto = async () => {
    if (!productoEdit || !nombreEdit.trim() || precioEdit <= 0) return
    setGuardandoEdit(true)
    try {
      await axiosInstance.patch(`/productos/${productoEdit.id}`, {
        nombre: nombreEdit,
        categoriaId: categoriaIdEdit || '',
        sku: skuEdit || null,
        precio: precioEdit,
        costo: costoEdit ? Number(costoEdit) : null,
        unidadMedida: unidadMedidaEdit,
        stockMinimo:
          productoEdit.tipo === 'producto' ? (stockMinimoEdit === '' ? null : stockMinimoEdit) : undefined,
        imagenUrl: imagenUrlEdit || null,
      })
      toast.success('Producto actualizado')
      setProductoEdit(null)
      await cargar()
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo actualizar el producto'))
    } finally {
      setGuardandoEdit(false)
    }
  }

  const alternarActivoProducto = async (producto: Producto) => {
    setCambiandoActivoId(producto.id)
    try {
      await axiosInstance.patch(`/productos/${producto.id}`, { activo: !producto.activo })
      toast.success(producto.activo ? 'Producto archivado' : 'Producto reactivado')
      await cargar()
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo actualizar el producto'))
    } finally {
      setCambiandoActivoId(null)
    }
  }

  const abrirMovimiento = (producto: Producto) => {
    setModalMovimiento(producto)
    setTipoMovimiento('entrada')
    setCantidad(0)
    setMotivo('')
    setSucursalIdMovimiento('')
  }

  const registrarMovimiento = async () => {
    if (!modalMovimiento) return
    setRegistrando(true)
    try {
      await axiosInstance.post(`/productos/${modalMovimiento.id}/movimientos`, {
        tipo: tipoMovimiento,
        cantidad,
        motivo: motivo || undefined,
        sucursalId: sucursalIdMovimiento || undefined,
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

  const abrirStockSucursal = async (producto: Producto) => {
    setModalStockSucursal(producto)
    setCargandoStockSucursal(true)
    try {
      const { data } = await axiosInstance.get<StockPorSucursal[]>(
        `/productos/${producto.id}/stock-por-sucursal`,
      )
      setStockSucursal(data)
    } catch {
      toast.error('No se pudo cargar el stock por sucursal')
    } finally {
      setCargandoStockSucursal(false)
    }
  }

  const productosFiltrados = productos.filter((p) => {
    const q = query.trim().toLowerCase()
    const coincideQuery =
      !q || p.nombre.toLowerCase().includes(q) || (p.sku?.toLowerCase().includes(q) ?? false)
    const coincideCategoria = !filtroCategoriaId || p.categoria?.id === filtroCategoriaId
    const coincideStockBajo =
      !soloStockBajo || (p.stockMinimo != null && (p.stock ?? 0) < p.stockMinimo)
    return coincideQuery && coincideCategoria && coincideStockBajo
  })

  const valorTotalInventario = productos
    .filter((p) => p.tipo === 'producto' && p.activo)
    .reduce((suma, p) => suma + Number(p.precio) * (p.stock ?? 0), 0)

  const filasExportar = productosFiltrados.map((p) => ({
    nombre: p.nombre,
    tipo: p.tipo === 'servicio' ? 'Servicio' : 'Producto',
    categoria: p.categoria?.nombre ?? '',
    sku: p.sku ?? '',
    precio: p.precio,
    costo: p.costo ?? '',
    stock: p.tipo === 'servicio' ? '' : (p.stock ?? 0),
    stockMinimo: p.stockMinimo ?? '',
    unidad: p.unidadMedida,
    activo: p.activo ? 'Sí' : 'No',
  }))

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--color-text)]">Productos</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Stock de productos por cantidad: registra entradas, salidas y ajustes de conteo. El stock
        actual se calcula automáticamente a partir de los movimientos. Los servicios (mano de
        obra, instalación…) no manejan stock.
      </p>

      <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[var(--sombra-sm)]">
        <p className="text-xs text-[var(--color-text-muted)]">Valor total del inventario</p>
        <p className="text-lg font-bold text-[var(--color-text)]">
          ${valorTotalInventario.toFixed(2)}
        </p>
      </div>

      <CanAccess resource="productos" action="create">
        <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)] p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                Nueva categoría
              </label>
              <input
                value={nombreCategoria}
                onChange={(e) => setNombreCategoria(e.target.value)}
                placeholder="Ej: Bebidas, Snacks…"
                className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={crearCategoria}
              disabled={creandoCategoria || !nombreCategoria.trim()}
              className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg)] disabled:opacity-50"
            >
              {creandoCategoria ? 'Creando…' : 'Agregar categoría'}
            </button>
            <label className="ml-auto flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
              <input
                type="checkbox"
                checked={mostrarCategoriasArchivadas}
                onChange={(e) => setMostrarCategoriasArchivadas(e.target.checked)}
              />
              Mostrar archivadas
            </label>
          </div>
          {categorias.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {categorias.map((c) => (
                <span
                  key={c.id}
                  className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-2 py-1 text-sm text-[var(--color-text)]"
                >
                  {c.nombre}
                  {!c.activo && (
                    <span className="rounded bg-amber-100 px-1 text-xs font-medium text-amber-700">
                      Archivada
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => abrirEdicionCategoria(c)}
                    className="rounded p-0.5 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)]"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => alternarActivoCategoria(c)}
                    disabled={cambiandoActivoCategoriaId === c.id}
                    className="rounded p-0.5 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-50"
                  >
                    {cambiandoActivoCategoriaId === c.id ? (
                      <Spinner size={12} />
                    ) : c.activo ? (
                      <Archive size={12} />
                    ) : (
                      <ArchiveRestore size={12} />
                    )}
                  </button>
                  {c._count.productos === 0 ? (
                    <button
                      type="button"
                      onClick={() => eliminarCategoria(c)}
                      disabled={eliminandoCategoriaId === c.id}
                      title="Eliminar (no tiene productos asociados)"
                      className="rounded p-0.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {eliminandoCategoriaId === c.id ? <Spinner size={12} /> : <Trash2 size={12} />}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      title={`Tiene ${c._count.productos} producto(s) asociado(s) — archívala en su lugar`}
                      className="rounded p-0.5 text-[var(--color-text-faint)] opacity-40"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)] p-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
              Tipo
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as typeof tipo)}
              className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
            >
              {TIPOS_PRODUCTO.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
              Nombre
            </label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder={tipo === 'servicio' ? 'Ej: Instalación a domicilio' : 'Ej: Papel bond A4'}
              className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
            />
          </div>
          {categorias.length > 0 && (
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                Categoría
              </label>
              <select
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
              >
                <option value="">Sin categoría</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}
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
              Costo (opcional)
            </label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={costo}
              onChange={(e) => setCosto(e.target.value)}
              placeholder="$"
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
          {tipo === 'producto' && (
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
          )}
          <ImageUploadField label="Foto (opcional)" value={imagenUrl} onChange={setImagenUrl} />
          <PrimaryButton
            type="button"
            onClick={crearProducto}
            disabled={creando || !nombre.trim() || precio <= 0}
            className="flex items-center gap-2"
          >
            {creando && <Spinner size={14} />}
            {creando ? 'Creando…' : tipo === 'servicio' ? 'Agregar servicio' : 'Agregar producto'}
          </PrimaryButton>
        </div>
      </CanAccess>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <SearchInput value={query} onChange={setQuery} placeholder="Buscar por nombre o SKU…" />
        <select
          value={filtroCategoriaId}
          onChange={(e) => setFiltroCategoriaId(e.target.value)}
          className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm focus:border-[var(--color-primario)] focus:outline-none"
        >
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
          <input
            type="checkbox"
            checked={soloStockBajo}
            onChange={(e) => setSoloStockBajo(e.target.checked)}
          />
          Solo stock bajo
        </label>
        <label className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
          <input
            type="checkbox"
            checked={mostrarArchivados}
            onChange={(e) => setMostrarArchivados(e.target.checked)}
          />
          Mostrar archivados
        </label>
        <ExportarExcelButton nombreArchivo="productos.csv" filas={filasExportar} />
      </div>

      <div className="relative mt-2 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)]">
        {cargando && (
          <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-xl bg-[var(--color-bg-card)]/70 text-sm text-[var(--color-text-muted)]">
            <Spinner size={18} />
            Actualizando…
          </div>
        )}
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Categoría</th>
              <th className="px-4 py-2">SKU</th>
              <th className="px-4 py-2">Stock</th>
              <th className="px-4 py-2">Precio</th>
              <th className="px-4 py-2">Margen</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {productosFiltrados.map((producto) => {
              const bajoStock =
                producto.tipo === 'producto' &&
                producto.stockMinimo != null &&
                (producto.stock ?? 0) < producto.stockMinimo
              const margen =
                producto.costo != null
                  ? Number(producto.precio) - Number(producto.costo)
                  : null
              return (
                <tr key={producto.id} className="border-t border-[var(--color-border)]">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      {producto.imagenUrl ? (
                        <img
                          src={producto.imagenUrl}
                          alt=""
                          className="h-8 w-8 shrink-0 rounded object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 shrink-0 rounded bg-[var(--color-bg)]" />
                      )}
                      <div>
                        {producto.nombre}
                        <span
                          className={`ml-2 rounded px-1.5 py-0.5 text-xs font-medium ${
                            producto.tipo === 'servicio'
                              ? 'bg-sky-100 text-sky-700'
                              : 'bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]'
                          }`}
                        >
                          {producto.tipo === 'servicio' ? 'Servicio' : 'Producto'}
                        </span>
                        {!producto.activo && (
                          <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                            Archivado
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-[var(--color-text-muted)]">
                    {producto.categoria?.nombre ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-[var(--color-text-muted)]">
                    {producto.sku ?? '—'}
                  </td>
                  <td className="px-4 py-2">
                    {producto.tipo === 'servicio' ? (
                      <span className="text-[var(--color-text-faint)]">N/A</span>
                    ) : (
                      <>
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
                      </>
                    )}
                  </td>
                  <td className="px-4 py-2">${Number(producto.precio).toFixed(2)}</td>
                  <td className="px-4 py-2 text-[var(--color-text-muted)]">
                    {margen != null ? `$${margen.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <CanAccess resource="productos" action="edit">
                        <button
                          type="button"
                          onClick={() => abrirEdicionProducto(producto)}
                          title="Editar"
                          className="rounded p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)]"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => alternarActivoProducto(producto)}
                          disabled={cambiandoActivoId === producto.id}
                          title={producto.activo ? 'Archivar' : 'Reactivar'}
                          className="rounded p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-50"
                        >
                          {cambiandoActivoId === producto.id ? (
                            <Spinner size={14} />
                          ) : producto.activo ? (
                            <Archive size={14} />
                          ) : (
                            <ArchiveRestore size={14} />
                          )}
                        </button>
                      </CanAccess>
                      {puedeRegistrarMovimiento && producto.tipo === 'producto' && (
                        <button
                          type="button"
                          onClick={() => abrirMovimiento(producto)}
                          className="rounded px-2 py-1 text-xs text-[var(--color-primario-legible)] hover:bg-[var(--color-bg-subtle)]"
                        >
                          Registrar movimiento
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => abrirHistorial(producto)}
                        className="rounded px-2 py-1 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)]"
                      >
                        Historial
                      </button>
                      {sucursales.length > 0 && producto.tipo === 'producto' && (
                        <button
                          type="button"
                          onClick={() => abrirStockSucursal(producto)}
                          className="rounded px-2 py-1 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)]"
                        >
                          Stock por sucursal
                        </button>
                      )}
                      {bajoStock && (
                        <button
                          type="button"
                          onClick={() =>
                            navigate('/proveedores', {
                              state: { productoIdSugerido: producto.id },
                            })
                          }
                          title="Crear una orden de compra para reponer este producto"
                          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                        >
                          <ShoppingCart size={13} />
                          Reponer
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
            {productosFiltrados.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-[var(--color-text-faint)]">
                  {cargando ? (
                    <CargandoPantalla minHeight={80} />
                  ) : query || filtroCategoriaId || soloStockBajo ? (
                    'Sin resultados para tu búsqueda'
                  ) : (
                    'Sin productos todavía'
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalMovimiento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-lg bg-[var(--color-bg-card)] p-6 shadow-lg">
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
                Motivo{tipoMovimiento !== 'entrada' ? ' (obligatorio)' : ' (opcional)'}
              </label>
              <input
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder={
                  tipoMovimiento === 'salida'
                    ? 'Ej: Dañado, vencido, robado…'
                    : tipoMovimiento === 'ajuste'
                      ? 'Ej: Corrección por conteo físico'
                      : undefined
                }
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
              />
            </div>

            {sucursales.length > 0 && (
              <div className="mt-4">
                <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                  Sucursal (opcional)
                </label>
                <select
                  value={sucursalIdMovimiento}
                  onChange={(e) => setSucursalIdMovimiento(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                >
                  <option value="">Sin especificar</option>
                  {sucursales.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

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
                disabled={registrando || (tipoMovimiento !== 'entrada' && !motivo.trim())}
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
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg bg-[var(--color-bg-card)] p-6 shadow-lg">
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

      {modalStockSucursal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-lg bg-[var(--color-bg-card)] p-6 shadow-lg">
            <h2 className="text-base font-semibold text-[var(--color-text)]">
              Stock por sucursal de «{modalStockSucursal.nombre}»
            </h2>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Desglose calculado a partir de los movimientos registrados con sucursal. El stock
              total ({modalStockSucursal.stock ?? 0} {modalStockSucursal.unidadMedida}) no cambia.
            </p>

            <div className="mt-4 max-h-80 overflow-y-auto">
              {cargandoStockSucursal && <CargandoPantalla minHeight={100} />}
              {!cargandoStockSucursal && stockSucursal.length === 0 && (
                <p className="py-4 text-sm text-[var(--color-text-faint)]">
                  Sin movimientos con sucursal registrada todavía
                </p>
              )}
              {!cargandoStockSucursal &&
                stockSucursal.map((s) => (
                  <div
                    key={s.sucursalId ?? 'sin-sucursal'}
                    className="flex items-center justify-between border-b border-[var(--color-border)] py-2 text-sm last:border-b-0"
                  >
                    <span className="text-[var(--color-text)]">
                      {s.sucursalNombre ?? 'Sin sucursal'}
                    </span>
                    <span className="font-medium text-[var(--color-text)]">{s.stock}</span>
                  </div>
                ))}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setModalStockSucursal(null)}
                className="rounded px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {categoriaEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-lg bg-[var(--color-bg-card)] p-6 shadow-lg">
            <h2 className="text-base font-semibold text-[var(--color-text)]">Editar categoría</h2>
            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                Nombre
              </label>
              <input
                value={nombreCategoriaEdit}
                onChange={(e) => setNombreCategoriaEdit(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCategoriaEdit(null)}
                className="rounded px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]"
              >
                Cancelar
              </button>
              <PrimaryButton
                type="button"
                onClick={guardarEdicionCategoria}
                disabled={guardandoCategoriaEdit || !nombreCategoriaEdit.trim()}
                className="flex items-center gap-2"
              >
                {guardandoCategoriaEdit && <Spinner size={14} />}
                {guardandoCategoriaEdit ? 'Guardando…' : 'Guardar cambios'}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {productoEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-lg bg-[var(--color-bg-card)] p-6 shadow-lg">
            <h2 className="text-base font-semibold text-[var(--color-text)]">
              Editar {productoEdit.tipo === 'servicio' ? 'servicio' : 'producto'}
            </h2>
            <div className="mt-4 flex flex-col gap-3">
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
              <div className="flex flex-wrap gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                    Categoría
                  </label>
                  <select
                    value={categoriaIdEdit}
                    onChange={(e) => setCategoriaIdEdit(e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                  >
                    <option value="">Sin categoría</option>
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                    SKU
                  </label>
                  <input
                    value={skuEdit}
                    onChange={(e) => setSkuEdit(e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                    Precio
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={precioEdit}
                    onChange={(e) => setPrecioEdit(Number(e.target.value))}
                    className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                    Costo
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={costoEdit}
                    onChange={(e) => setCostoEdit(e.target.value)}
                    placeholder="$"
                    className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                    Unidad
                  </label>
                  <input
                    value={unidadMedidaEdit}
                    onChange={(e) => setUnidadMedidaEdit(e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                  />
                </div>
              </div>
              {productoEdit.tipo === 'producto' && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                    Stock mínimo
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={stockMinimoEdit}
                    onChange={(e) =>
                      setStockMinimoEdit(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                  />
                </div>
              )}
              <ImageUploadField
                label="Foto (opcional)"
                value={imagenUrlEdit}
                onChange={setImagenUrlEdit}
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setProductoEdit(null)}
                className="rounded px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]"
              >
                Cancelar
              </button>
              <PrimaryButton
                type="button"
                onClick={guardarEdicionProducto}
                disabled={guardandoEdit || !nombreEdit.trim() || precioEdit <= 0}
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
