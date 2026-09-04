import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { CanAccess } from '@refinedev/core'
import { useNavigate } from 'react-router-dom'
import { axiosInstance } from '../../lib/axios'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { CargandoPantalla } from '../../components/ui/CargandoPantalla'

type Periodo = 'mes' | 'anio' | 'todo'

const PERIODOS: { value: Periodo; label: string }[] = [
  { value: 'mes', label: 'Este mes' },
  { value: 'anio', label: 'Este año' },
  { value: 'todo', label: 'Todo' },
]

interface ProyectoResumen {
  id: string
  nombre: string
  cliente: { nombre: string } | null
  creadoEn: string
  estado: string
  totales: { costoTotal: number; precioSugerido: number; gananciaReal: number | null }
}

export function CosteosPage() {
  const navigate = useNavigate()
  const [proyectos, setProyectos] = useState<ProyectoResumen[]>([])
  const [cargando, setCargando] = useState(true)
  const [periodo, setPeriodo] = useState<Periodo>('todo')

  useEffect(() => {
    axiosInstance
      .get<ProyectoResumen[]>('/costeos')
      .then(({ data }) => setProyectos(data))
      .catch(() => toast.error('No se pudieron cargar los costeos'))
      .finally(() => setCargando(false))
  }, [])

  const proyectosFiltrados = useMemo(() => {
    if (periodo === 'todo') return proyectos
    const ahora = new Date()
    return proyectos.filter((p) => {
      const fecha = new Date(p.creadoEn)
      if (periodo === 'anio') return fecha.getFullYear() === ahora.getFullYear()
      return (
        fecha.getFullYear() === ahora.getFullYear() && fecha.getMonth() === ahora.getMonth()
      )
    })
  }, [proyectos, periodo])

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-[var(--color-text)]">Costeo de cosplays</h1>
        <CanAccess resource="costeo" action="create">
          <PrimaryButton type="button" onClick={() => navigate('/costeos/nuevo')}>
            Nuevo costeo
          </PrimaryButton>
        </CanAccess>
      </div>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Arma cada cosplay por partes con sus materiales y horas de trabajo, y calcula
        automáticamente cuánto te cuesta y a qué precio venderlo.
      </p>

      <div className="mt-4 flex gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-1 w-fit">
        {PERIODOS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setPeriodo(p.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              periodo === p.value
                ? 'bg-[var(--color-primario)] text-white'
                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Cliente</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2">Costo</th>
              <th className="px-4 py-2">Precio sugerido</th>
              <th className="px-4 py-2">Ganancia</th>
              <th className="px-4 py-2">Creado</th>
            </tr>
          </thead>
          <tbody>
            {proyectosFiltrados.map((p) => (
              <tr
                key={p.id}
                onClick={() => navigate(`/costeos/${p.id}`)}
                className="cursor-pointer border-t border-[var(--color-border)] hover:bg-[var(--color-bg-subtle)]"
              >
                <td className="px-4 py-2">{p.nombre}</td>
                <td className="px-4 py-2 text-[var(--color-text-muted)]">
                  {p.cliente?.nombre ?? '—'}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.estado === 'vendido'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]'
                    }`}
                  >
                    {p.estado === 'vendido' ? 'Vendido' : 'Borrador'}
                  </span>
                </td>
                <td className="px-4 py-2">${p.totales.costoTotal.toFixed(2)}</td>
                <td className="px-4 py-2 font-medium">
                  ${p.totales.precioSugerido.toFixed(2)}
                </td>
                <td className="px-4 py-2 font-medium text-emerald-600">
                  {p.totales.gananciaReal != null ? `$${p.totales.gananciaReal.toFixed(2)}` : '—'}
                </td>
                <td className="px-4 py-2 text-[var(--color-text-muted)]">
                  {new Date(p.creadoEn).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {proyectosFiltrados.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-[var(--color-text-faint)]">
                  {cargando ? <CargandoPantalla minHeight={80} /> : 'Sin costeos en este período'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
