import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { CanAccess } from '@refinedev/core'
import { axiosInstance } from '../../lib/axios'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { Spinner } from '../../components/ui/Spinner'
import { CargandoPantalla } from '../../components/ui/CargandoPantalla'

interface Material {
  id: string
  nombre: string
  calidad: string | null
  unidadMedida: string
  precioUnitario: string
}

export function MaterialesPage() {
  const [materiales, setMateriales] = useState<Material[]>([])
  const [cargando, setCargando] = useState(true)

  const [nombre, setNombre] = useState('')
  const [calidad, setCalidad] = useState('')
  const [unidadMedida, setUnidadMedida] = useState('metro')
  const [precioUnitario, setPrecioUnitario] = useState(0)
  const [creando, setCreando] = useState(false)

  const cargar = async () => {
    setCargando(true)
    try {
      const { data } = await axiosInstance.get<Material[]>('/materiales')
      setMateriales(data)
    } catch {
      toast.error('No se pudieron cargar los materiales')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  const crear = async () => {
    if (!nombre.trim() || precioUnitario <= 0) return
    setCreando(true)
    try {
      await axiosInstance.post('/materiales', {
        nombre,
        calidad: calidad || undefined,
        unidadMedida,
        precioUnitario,
      })
      setNombre('')
      setCalidad('')
      setPrecioUnitario(0)
      toast.success('Material creado')
      await cargar()
    } catch {
      toast.error('No se pudo crear el material')
    } finally {
      setCreando(false)
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--color-text)]">Materiales</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Catálogo de telas, goma EVA, pinturas y demás insumos, con su precio por unidad. Si un
        material tiene distintas calidades (ej. tela estándar vs. premium), regístralas como
        entradas separadas.
      </p>

      <CanAccess resource="costeo" action="create">
        <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)] p-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
              Nombre
            </label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Tela Lycra"
              className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
              Calidad (opcional)
            </label>
            <input
              value={calidad}
              onChange={(e) => setCalidad(e.target.value)}
              placeholder="Ej: Premium"
              className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
              Unidad
            </label>
            <input
              value={unidadMedida}
              onChange={(e) => setUnidadMedida(e.target.value)}
              placeholder="metro, kg, unidad…"
              className="w-28 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
              Precio unitario
            </label>
            <input
              type="number"
              min={0}
              step={0.1}
              value={precioUnitario}
              onChange={(e) => setPrecioUnitario(Number(e.target.value))}
              className="w-28 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
            />
          </div>
          <PrimaryButton
            type="button"
            onClick={crear}
            disabled={creando || !nombre.trim() || precioUnitario <= 0}
            className="flex items-center gap-2"
          >
            {creando && <Spinner size={14} />}
            {creando ? 'Creando…' : 'Agregar material'}
          </PrimaryButton>
        </div>
      </CanAccess>

      <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Calidad</th>
              <th className="px-4 py-2">Unidad</th>
              <th className="px-4 py-2">Precio</th>
            </tr>
          </thead>
          <tbody>
            {materiales.map((m) => (
              <tr key={m.id} className="border-t border-[var(--color-border)]">
                <td className="px-4 py-2">{m.nombre}</td>
                <td className="px-4 py-2 text-[var(--color-text-muted)]">{m.calidad ?? '—'}</td>
                <td className="px-4 py-2 text-[var(--color-text-muted)]">{m.unidadMedida}</td>
                <td className="px-4 py-2 font-medium">
                  ${Number(m.precioUnitario).toFixed(2)}
                </td>
              </tr>
            ))}
            {materiales.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-[var(--color-text-faint)]">
                  {cargando ? <CargandoPantalla minHeight={80} /> : 'Sin materiales todavía'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
