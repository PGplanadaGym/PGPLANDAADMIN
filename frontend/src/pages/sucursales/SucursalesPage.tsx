import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { axiosInstance } from '../../lib/axios'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { Spinner } from '../../components/ui/Spinner'

interface Sucursal {
  id: string
  nombre: string
  direccion: string | null
  activa: boolean
}

function mensajeError(error: unknown, fallback: string) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  )
}

export function SucursalesPage() {
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [cargando, setCargando] = useState(true)

  const [nombre, setNombre] = useState('')
  const [direccion, setDireccion] = useState('')
  const [creando, setCreando] = useState(false)

  const cargar = () => {
    setCargando(true)
    axiosInstance
      .get<Sucursal[]>('/sucursales')
      .then(({ data }) => setSucursales(data))
      .catch(() => toast.error('No se pudieron cargar las sucursales'))
      .finally(() => setCargando(false))
  }

  useEffect(() => {
    cargar()
  }, [])

  const crear = async () => {
    if (!nombre.trim()) return
    setCreando(true)
    try {
      await axiosInstance.post('/sucursales', { nombre, direccion: direccion || undefined })
      setNombre('')
      setDireccion('')
      toast.success('Sucursal creada')
      cargar()
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo crear la sucursal'))
    } finally {
      setCreando(false)
    }
  }

  const alternarActiva = async (sucursal: Sucursal) => {
    try {
      await axiosInstance.patch(`/sucursales/${sucursal.id}`, { activa: !sucursal.activa })
      cargar()
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo actualizar la sucursal'))
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--color-text)]">Sucursales</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Registra tus locales. Luego puedes asignar empleados, recursos y activos a cada uno.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)] p-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">Nombre</label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Sucursal Norte"
            className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
            Dirección
          </label>
          <input
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            className="w-64 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
          />
        </div>
        <PrimaryButton
          type="button"
          onClick={crear}
          disabled={creando || !nombre.trim()}
          className="flex items-center gap-2"
        >
          {creando && <Spinner size={14} />}
          Agregar sucursal
        </PrimaryButton>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Dirección</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {sucursales.map((sucursal) => (
              <tr key={sucursal.id} className="border-t border-[var(--color-border)]">
                <td className="px-4 py-2">{sucursal.nombre}</td>
                <td className="px-4 py-2 text-[var(--color-text-muted)]">
                  {sucursal.direccion ?? '—'}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${
                      sucursal.activa
                        ? 'bg-green-100 text-green-700'
                        : 'bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]'
                    }`}
                  >
                    {sucursal.activa ? 'Activa' : 'Inactiva'}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => alternarActiva(sucursal)}
                    className="rounded px-2 py-1 text-xs text-[var(--color-primario-legible)] hover:bg-[var(--color-bg-subtle)]"
                  >
                    {sucursal.activa ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
              </tr>
            ))}
            {sucursales.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-[var(--color-text-faint)]">
                  {cargando ? 'Cargando…' : 'Sin sucursales todavía'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
