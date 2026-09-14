import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, ShoppingBag, Wallet, MapPin } from 'lucide-react'
import { axiosInstance } from '../../lib/axios'
import { CargandoPantalla } from '../../components/ui/CargandoPantalla'

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
  activo: boolean
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
  usuario: { id: string; nombre: string }
  items: OrdenCompraItem[]
}

interface PerfilProveedor {
  proveedor: Proveedor
  ordenes: OrdenCompra[]
  totalComprado: number
  cantidadOrdenes: number
}

const ESTADO_ESTILO: Record<string, string> = {
  recibida: 'bg-green-100 text-green-700',
  parcial: 'bg-blue-100 text-blue-700',
  cancelada: 'bg-gray-100 text-gray-600',
  pendiente: 'bg-amber-100 text-amber-700',
}

export function ProveedorPerfilPage() {
  const { id } = useParams<{ id: string }>()
  const [perfil, setPerfil] = useState<PerfilProveedor | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (!id) return
    setCargando(true)
    axiosInstance
      .get<PerfilProveedor>(`/proveedores/${id}/perfil`)
      .then(({ data }) => setPerfil(data))
      .catch(() => toast.error('No se pudo cargar el perfil del proveedor'))
      .finally(() => setCargando(false))
  }, [id])

  if (cargando) {
    return <CargandoPantalla minHeight={300} />
  }

  if (!perfil) {
    return (
      <div>
        <p className="text-sm text-[var(--color-text-faint)]">Proveedor no encontrado.</p>
      </div>
    )
  }

  const { proveedor, ordenes, totalComprado, cantidadOrdenes } = perfil

  return (
    <div>
      <Link
        to="/proveedores"
        className="flex items-center gap-1 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
      >
        <ArrowLeft size={14} />
        Volver a Proveedores
      </Link>

      <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[var(--sombra-sm)]">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-[var(--color-text)]">{proveedor.nombre}</h1>
          {!proveedor.activo && (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
              Archivado
            </span>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--color-text-muted)]">
          {proveedor.ruc && <span>RUC: {proveedor.ruc}</span>}
          {proveedor.contacto && <span>Contacto: {proveedor.contacto}</span>}
          {proveedor.telefono && <span>Tel: {proveedor.telefono}</span>}
          {proveedor.email && <span>{proveedor.email}</span>}
          {proveedor.latitud != null && (
            <span className="flex items-center gap-1">
              <MapPin size={13} />
              Tiene ubicación registrada
            </span>
          )}
        </div>
        {proveedor.notas && (
          <p className="mt-2 text-sm text-[var(--color-text-faint)]">{proveedor.notas}</p>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[var(--sombra-sm)]">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
            <Wallet size={16} />
            Total comprado
          </h2>
          <p className="mt-2 text-2xl font-bold text-[var(--color-text)]">
            ${totalComprado.toFixed(2)}
          </p>
          <p className="text-xs text-[var(--color-text-faint)]">Órdenes recibidas o parciales</p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[var(--sombra-sm)]">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]">
            <ShoppingBag size={16} />
            Órdenes de compra
          </h2>
          <p className="mt-2 text-2xl font-bold text-[var(--color-text)]">{cantidadOrdenes}</p>
          <p className="text-xs text-[var(--color-text-faint)]">En todo el historial</p>
        </div>
      </div>

      <h2 className="mt-6 text-base font-semibold text-[var(--color-text)]">
        Historial de órdenes
      </h2>
      <div className="mt-3 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-2">Fecha</th>
              <th className="px-4 py-2">Items</th>
              <th className="px-4 py-2">Vendedor</th>
              <th className="px-4 py-2">Total</th>
              <th className="px-4 py-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {ordenes.map((orden) => (
              <tr key={orden.id} className="border-t border-[var(--color-border)]">
                <td className="px-4 py-2">{new Date(orden.creadoEn).toLocaleString()}</td>
                <td className="px-4 py-2 text-[var(--color-text-muted)]">
                  {orden.items.map((item) => `${item.cantidad}× ${item.producto.nombre}`).join(', ')}
                </td>
                <td className="px-4 py-2 text-[var(--color-text-muted)]">{orden.usuario.nombre}</td>
                <td className="px-4 py-2 font-medium">${Number(orden.total).toFixed(2)}</td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      ESTADO_ESTILO[orden.estado] ?? ''
                    }`}
                  >
                    {orden.estado}
                  </span>
                </td>
              </tr>
            ))}
            {ordenes.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-[var(--color-text-faint)]">
                  Sin órdenes de compra todavía
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
