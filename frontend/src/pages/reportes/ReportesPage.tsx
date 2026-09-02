import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { axiosInstance } from '../../lib/axios'
import { Spinner } from '../../components/ui/Spinner'

const COLORES_CATEGORICOS = [
  'var(--color-cat-1)',
  'var(--color-cat-2)',
  'var(--color-cat-3)',
  'var(--color-cat-4)',
  'var(--color-cat-5)',
  'var(--color-cat-6)',
  'var(--color-cat-7)',
  'var(--color-cat-8)',
]

interface ResumenCuentas {
  totalIngresos: number
  totalEgresos: number
  balance: number
  porMes: { mes: string; ingresos: number; egresos: number }[]
  porCategoria: { categoriaId: string; nombre: string; tipo: string; total: number }[]
}

interface TopProducto {
  productoId: string
  nombre: string
  cantidadVendida: number
  totalVendido: number
}

function formatoMoneda(valor: number) {
  return `$${valor.toFixed(2)}`
}

export function ReportesPage() {
  const [resumen, setResumen] = useState<ResumenCuentas | null>(null)
  const [errorCuentas, setErrorCuentas] = useState(false)
  const [topProductos, setTopProductos] = useState<TopProducto[] | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    Promise.all([
      axiosInstance
        .get<ResumenCuentas>('/cuentas/resumen')
        .then(({ data }) => setResumen(data))
        .catch(() => setErrorCuentas(true)),
      axiosInstance
        .get<TopProducto[]>('/ventas/top-productos')
        .then(({ data }) => setTopProductos(data))
        .catch(() => {
          /* módulo Ventas puede no estar activo, o el usuario no tiene permiso */
        }),
    ]).finally(() => setCargando(false))
  }, [])

  if (cargando) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
        <Spinner size={16} />
        Cargando…
      </div>
    )
  }

  const egresosPorCategoria = (resumen?.porCategoria ?? [])
    .filter((c) => c.tipo === 'egreso')
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--color-text)]">Reportes</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Resumen financiero y de ventas de los últimos 6 meses.
      </p>

      {errorCuentas && !resumen && (
        <p className="mt-4 text-sm text-[var(--color-text-faint)]">
          No se pudo cargar la información financiera (verifica que tengas permiso o que el
          módulo Cuentas esté activo).
        </p>
      )}

      {resumen && (
        <>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[var(--sombra-sm)]">
              <p className="text-xs text-[var(--color-text-muted)]">Ingresos (6 meses)</p>
              <p className="text-lg font-bold text-[var(--color-text)]">
                {formatoMoneda(resumen.totalIngresos)}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[var(--sombra-sm)]">
              <p className="text-xs text-[var(--color-text-muted)]">Egresos (6 meses)</p>
              <p className="text-lg font-bold text-[var(--color-text)]">
                {formatoMoneda(resumen.totalEgresos)}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[var(--sombra-sm)]">
              <p className="text-xs text-[var(--color-text-muted)]">Balance</p>
              <p
                className={`text-lg font-bold ${
                  resumen.balance >= 0 ? 'text-[var(--color-serie-ingreso)]' : 'text-[var(--color-serie-egreso)]'
                }`}
              >
                {formatoMoneda(resumen.balance)}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[var(--sombra-sm)]">
              <h2 className="text-sm font-semibold text-[var(--color-text)]">
                Ingresos vs egresos por mes
              </h2>
              <div className="mt-2 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={resumen.porMes}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis
                      dataKey="mes"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                      axisLine={{ stroke: 'var(--color-border)' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                      axisLine={{ stroke: 'var(--color-border)' }}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value) => formatoMoneda(Number(value))}
                      contentStyle={{
                        background: 'var(--color-bg-card)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 6,
                        color: 'var(--color-text)',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, color: 'var(--color-text-muted)' }} />
                    <Bar dataKey="ingresos" name="Ingresos" fill="var(--color-serie-ingreso)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="egresos" name="Egresos" fill="var(--color-serie-egreso)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {resumen.porMes.length === 0 && (
                <p className="text-center text-sm text-[var(--color-text-faint)]">
                  Sin movimientos en este rango
                </p>
              )}
            </div>

            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[var(--sombra-sm)]">
              <h2 className="text-sm font-semibold text-[var(--color-text)]">
                Egresos por categoría
              </h2>
              <div className="mt-2 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={egresosPorCategoria} layout="vertical" margin={{ left: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                      axisLine={{ stroke: 'var(--color-border)' }}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="nombre"
                      width={110}
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                      axisLine={{ stroke: 'var(--color-border)' }}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value) => formatoMoneda(Number(value))}
                      contentStyle={{
                        background: 'var(--color-bg-card)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 6,
                        color: 'var(--color-text)',
                      }}
                    />
                    <Bar dataKey="total" name="Egreso" radius={[0, 4, 4, 0]}>
                      {egresosPorCategoria.map((entrada, index) => (
                        <Cell key={entrada.categoriaId} fill={COLORES_CATEGORICOS[index % 8]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {egresosPorCategoria.length === 0 && (
                <p className="text-center text-sm text-[var(--color-text-faint)]">
                  Sin egresos registrados en este rango
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {topProductos && (
        <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[var(--sombra-sm)]">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">
            Productos más vendidos (6 meses)
          </h2>
          <div className="mt-2 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProductos} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                  axisLine={{ stroke: 'var(--color-border)' }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="nombre"
                  width={140}
                  tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }}
                  axisLine={{ stroke: 'var(--color-border)' }}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value, name) =>
                    name === 'totalVendido' ? formatoMoneda(Number(value)) : value
                  }
                  contentStyle={{
                    background: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 6,
                    color: 'var(--color-text)',
                  }}
                />
                <Bar dataKey="totalVendido" name="Vendido" radius={[0, 4, 4, 0]}>
                  {topProductos.map((entrada, index) => (
                    <Cell key={entrada.productoId} fill={COLORES_CATEGORICOS[index % 8]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {topProductos.length === 0 && (
            <p className="text-center text-sm text-[var(--color-text-faint)]">
              Sin ventas registradas en este rango
            </p>
          )}
        </div>
      )}
    </div>
  )
}
