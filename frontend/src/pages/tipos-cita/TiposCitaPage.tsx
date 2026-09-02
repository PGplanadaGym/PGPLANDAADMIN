import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { CanAccess } from '@refinedev/core'
import { axiosInstance } from '../../lib/axios'
import { PrimaryButton } from '../../components/ui/PrimaryButton'

interface TipoCita {
  id: string
  nombre: string
  duracionMinutos: number
  bufferMinutos: number
  color: string
  activo: boolean
}

export function TiposCitaPage() {
  const [tipos, setTipos] = useState<TipoCita[]>([])
  const [loading, setLoading] = useState(true)
  const [nombre, setNombre] = useState('')
  const [duracionMinutos, setDuracionMinutos] = useState(30)
  const [bufferMinutos, setBufferMinutos] = useState(0)
  const [color, setColor] = useState('#0ea5e9')
  const [creando, setCreando] = useState(false)

  const cargar = async () => {
    setLoading(true)
    try {
      const { data } = await axiosInstance.get<TipoCita[]>('/tipos-cita')
      setTipos(data)
    } catch {
      toast.error('No se pudieron cargar los tipos de cita')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  const crear = async () => {
    if (!nombre.trim() || duracionMinutos <= 0) return
    setCreando(true)
    try {
      await axiosInstance.post('/tipos-cita', {
        nombre,
        duracionMinutos,
        bufferMinutos,
        color,
      })
      setNombre('')
      setDuracionMinutos(30)
      setBufferMinutos(0)
      toast.success('Tipo de cita creado')
      await cargar()
    } catch {
      toast.error('No se pudo crear el tipo de cita')
    } finally {
      setCreando(false)
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--color-text)]">Tipos de cita</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Los distintos servicios que se pueden agendar (por ejemplo: consulta, corte de cabello,
        mantenimiento). Cada uno define su duración y el colchón de tiempo antes de la siguiente
        cita.
      </p>

      <CanAccess resource="tipos-cita" action="create">
        <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)] p-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
              Nombre
            </label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
              placeholder="Ej: Consulta general"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
              Duración (min)
            </label>
            <input
              type="number"
              min={5}
              step={5}
              value={duracionMinutos}
              onChange={(e) => setDuracionMinutos(Number(e.target.value))}
              className="w-24 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
              Colchón (min)
            </label>
            <input
              type="number"
              min={0}
              step={5}
              value={bufferMinutos}
              onChange={(e) => setBufferMinutos(Number(e.target.value))}
              className="w-24 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
              Color
            </label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-9 w-14 rounded-lg border border-[var(--color-border)]"
            />
          </div>
          <PrimaryButton type="button" onClick={crear} disabled={creando || !nombre.trim()}>
            {creando ? 'Creando…' : 'Agregar tipo de cita'}
          </PrimaryButton>
        </div>
      </CanAccess>

      <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Duración</th>
              <th className="px-4 py-2">Colchón</th>
              <th className="px-4 py-2">Color</th>
            </tr>
          </thead>
          <tbody>
            {tipos.map((t) => (
              <tr key={t.id} className="border-t border-[var(--color-border)]">
                <td className="px-4 py-2">{t.nombre}</td>
                <td className="px-4 py-2">{t.duracionMinutos} min</td>
                <td className="px-4 py-2">{t.bufferMinutos} min</td>
                <td className="px-4 py-2">
                  <span
                    className="inline-block h-4 w-4 rounded-full border border-[var(--color-border)] align-middle"
                    style={{ backgroundColor: t.color }}
                  />
                </td>
              </tr>
            ))}
            {tipos.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-[var(--color-text-faint)]">
                  {loading ? 'Cargando…' : 'Sin tipos de cita todavía'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
