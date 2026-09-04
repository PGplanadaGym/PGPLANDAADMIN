import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { axiosInstance } from '../../lib/axios'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { Spinner } from '../../components/ui/Spinner'
import { CargandoPantalla } from '../../components/ui/CargandoPantalla'

const ESTADO_ESTILO: Record<string, string> = {
  disponible: 'bg-emerald-100 text-emerald-700',
  asignado: 'bg-amber-100 text-amber-700',
  baja: 'bg-red-100 text-red-700',
}

interface CategoriaActivo {
  id: string
  nombre: string
}

interface UsuarioBasico {
  id: string
  nombre: string
  email: string
}

interface ClienteBasico {
  id: string
  nombre: string
}

interface Asignacion {
  id: string
  fechaAsignacion: string
  fechaDevolucion: string | null
  notas: string | null
  usuario: UsuarioBasico | null
  cliente: ClienteBasico | null
  asignadoPor: UsuarioBasico
}

interface Sucursal {
  id: string
  nombre: string
}

interface Activo {
  id: string
  nombre: string
  codigoInterno: string | null
  numeroSerie: string | null
  estado: string
  categoriaActivo: CategoriaActivo
  sucursal: Sucursal | null
  asignaciones: Asignacion[]
}

function mensajeError(error: unknown, fallback: string) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  )
}

export function ActivosPage() {
  const [activos, setActivos] = useState<Activo[]>([])
  const [categorias, setCategorias] = useState<CategoriaActivo[]>([])
  const [usuarios, setUsuarios] = useState<UsuarioBasico[]>([])
  const [clientes, setClientes] = useState<ClienteBasico[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [cargando, setCargando] = useState(true)

  const [nombreCategoria, setNombreCategoria] = useState('')
  const [creandoCategoria, setCreandoCategoria] = useState(false)

  const [nombre, setNombre] = useState('')
  const [categoriaActivoId, setCategoriaActivoId] = useState('')
  const [codigoInterno, setCodigoInterno] = useState('')
  const [numeroSerie, setNumeroSerie] = useState('')
  const [sucursalId, setSucursalId] = useState('')
  const [creandoActivo, setCreandoActivo] = useState(false)

  const [modalAsignar, setModalAsignar] = useState<Activo | null>(null)
  const [tipoDestino, setTipoDestino] = useState<'usuario' | 'cliente'>('usuario')
  const [destinoId, setDestinoId] = useState('')
  const [notasAsignacion, setNotasAsignacion] = useState('')
  const [procesando, setProcesando] = useState(false)

  const [modalHistorial, setModalHistorial] = useState<Activo | null>(null)
  const [historial, setHistorial] = useState<Asignacion[]>([])
  const [cargandoHistorial, setCargandoHistorial] = useState(false)

  const cargar = async () => {
    setCargando(true)
    try {
      const [a, c] = await Promise.all([
        axiosInstance.get<Activo[]>('/activos'),
        axiosInstance.get<CategoriaActivo[]>('/categorias-activo'),
      ])
      setActivos(a.data)
      setCategorias(c.data)
      if (c.data.length > 0) setCategoriaActivoId((prev) => prev || c.data[0].id)
    } catch {
      toast.error('No se pudieron cargar los activos')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargar()
    Promise.all([
      axiosInstance.get<UsuarioBasico[]>('/usuarios'),
      axiosInstance.get<ClienteBasico[]>('/clientes'),
    ])
      .then(([u, c]) => {
        setUsuarios(u.data)
        setClientes(c.data)
      })
      .catch(() => toast.error('No se pudieron cargar usuarios/clientes'))
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
      await axiosInstance.post('/categorias-activo', { nombre: nombreCategoria })
      setNombreCategoria('')
      toast.success('Categoría creada')
      await cargar()
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo crear la categoría'))
    } finally {
      setCreandoCategoria(false)
    }
  }

  const crearActivo = async () => {
    if (!nombre.trim() || !categoriaActivoId) return
    setCreandoActivo(true)
    try {
      await axiosInstance.post('/activos', {
        nombre,
        categoriaActivoId,
        codigoInterno: codigoInterno || undefined,
        numeroSerie: numeroSerie || undefined,
        sucursalId: sucursalId || undefined,
      })
      setNombre('')
      setCodigoInterno('')
      setNumeroSerie('')
      setSucursalId('')
      toast.success('Activo creado')
      await cargar()
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo crear el activo'))
    } finally {
      setCreandoActivo(false)
    }
  }

  const abrirAsignar = (activo: Activo) => {
    setModalAsignar(activo)
    setTipoDestino('usuario')
    setDestinoId('')
    setNotasAsignacion('')
  }

  const confirmarAsignacion = async () => {
    if (!modalAsignar || !destinoId) return
    setProcesando(true)
    try {
      await axiosInstance.post(`/activos/${modalAsignar.id}/asignar`, {
        usuarioId: tipoDestino === 'usuario' ? destinoId : undefined,
        clienteId: tipoDestino === 'cliente' ? destinoId : undefined,
        notas: notasAsignacion || undefined,
      })
      toast.success('Activo asignado')
      setModalAsignar(null)
      await cargar()
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo asignar el activo'))
    } finally {
      setProcesando(false)
    }
  }

  const devolver = async (activo: Activo) => {
    setProcesando(true)
    try {
      await axiosInstance.post(`/activos/${activo.id}/devolver`, {})
      toast.success('Activo devuelto al inventario')
      await cargar()
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo devolver el activo'))
    } finally {
      setProcesando(false)
    }
  }

  const abrirHistorial = async (activo: Activo) => {
    setModalHistorial(activo)
    setCargandoHistorial(true)
    try {
      const { data } = await axiosInstance.get<Asignacion[]>(`/activos/${activo.id}/historial`)
      setHistorial(data)
    } catch {
      toast.error('No se pudo cargar el historial')
    } finally {
      setCargandoHistorial(false)
    }
  }

  const titularActual = (activo: Activo) => {
    const asignacion = activo.asignaciones[0]
    if (!asignacion) return '—'
    return asignacion.usuario?.nombre ?? asignacion.cliente?.nombre ?? '—'
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--color-text)]">Activos</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Equipos, herramientas o vehículos que se asignan a una persona o cliente, con historial
        completo de quién tuvo cada uno y cuándo.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)] p-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
            Nueva categoría
          </label>
          <input
            value={nombreCategoria}
            onChange={(e) => setNombreCategoria(e.target.value)}
            placeholder="Ej: Laptops, Vehículos…"
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
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)] p-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
            Nombre
          </label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Laptop Dell #002"
            className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
            Categoría
          </label>
          <select
            value={categoriaActivoId}
            onChange={(e) => setCategoriaActivoId(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
          >
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
            Código interno
          </label>
          <input
            value={codigoInterno}
            onChange={(e) => setCodigoInterno(e.target.value)}
            placeholder="ACT-0002"
            className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
            N° de serie
          </label>
          <input
            value={numeroSerie}
            onChange={(e) => setNumeroSerie(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
          />
        </div>
        {sucursales.length > 0 && (
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
              Sucursal
            </label>
            <select
              value={sucursalId}
              onChange={(e) => setSucursalId(e.target.value)}
              className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
            >
              <option value="">Sin asignar</option>
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>
        )}
        <PrimaryButton
          type="button"
          onClick={crearActivo}
          disabled={creandoActivo || !nombre.trim() || !categoriaActivoId}
          className="flex items-center gap-2"
        >
          {creandoActivo && <Spinner size={14} />}
          {creandoActivo ? 'Creando…' : 'Agregar activo'}
        </PrimaryButton>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Categoría</th>
              <th className="px-4 py-2">Código</th>
              <th className="px-4 py-2">Estado</th>
              {sucursales.length > 0 && <th className="px-4 py-2">Sucursal</th>}
              <th className="px-4 py-2">Titular actual</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {activos.map((activo) => (
              <tr key={activo.id} className="border-t border-[var(--color-border)]">
                <td className="px-4 py-2">{activo.nombre}</td>
                <td className="px-4 py-2">{activo.categoriaActivo.nombre}</td>
                <td className="px-4 py-2 text-[var(--color-text-muted)]">
                  {activo.codigoInterno ?? '—'}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${ESTADO_ESTILO[activo.estado] ?? ''}`}
                  >
                    {activo.estado}
                  </span>
                </td>
                {sucursales.length > 0 && (
                  <td className="px-4 py-2 text-[var(--color-text-muted)]">
                    {activo.sucursal?.nombre ?? '—'}
                  </td>
                )}
                <td className="px-4 py-2">{titularActual(activo)}</td>
                <td className="px-4 py-2 text-right">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => abrirAsignar(activo)}
                      className="rounded px-2 py-1 text-xs text-[var(--color-primario-legible)] hover:bg-[var(--color-bg-subtle)]"
                    >
                      {activo.asignaciones.length > 0 ? 'Reasignar' : 'Asignar'}
                    </button>
                    {activo.asignaciones.length > 0 && (
                      <button
                        type="button"
                        onClick={() => devolver(activo)}
                        disabled={procesando}
                        className="rounded px-2 py-1 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-50"
                      >
                        Devolver
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => abrirHistorial(activo)}
                      className="rounded px-2 py-1 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)]"
                    >
                      Historial
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {activos.length === 0 && (
              <tr>
                <td
                  colSpan={sucursales.length > 0 ? 7 : 6}
                  className="px-4 py-6 text-center text-[var(--color-text-faint)]"
                >
                  {cargando ? <CargandoPantalla minHeight={80} /> : 'Sin activos todavía'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalAsignar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-[var(--color-bg-card)] p-6 shadow-lg">
            <h2 className="text-base font-semibold text-[var(--color-text)]">
              Asignar «{modalAsignar.nombre}»
            </h2>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setTipoDestino('usuario')
                  setDestinoId('')
                }}
                className={`flex-1 rounded border px-3 py-2 text-sm ${
                  tipoDestino === 'usuario'
                    ? 'border-[var(--color-primario)] bg-[var(--color-bg-subtle)] text-[var(--color-text)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)]'
                }`}
              >
                Usuario interno
              </button>
              <button
                type="button"
                onClick={() => {
                  setTipoDestino('cliente')
                  setDestinoId('')
                }}
                className={`flex-1 rounded border px-3 py-2 text-sm ${
                  tipoDestino === 'cliente'
                    ? 'border-[var(--color-primario)] bg-[var(--color-bg-subtle)] text-[var(--color-text)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)]'
                }`}
              >
                Cliente externo
              </button>
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                {tipoDestino === 'usuario' ? 'Usuario' : 'Cliente'}
              </label>
              <select
                value={destinoId}
                onChange={(e) => setDestinoId(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
              >
                <option value="">Selecciona…</option>
                {(tipoDestino === 'usuario' ? usuarios : clientes).map((persona) => (
                  <option key={persona.id} value={persona.id}>
                    {persona.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                Notas
              </label>
              <textarea
                value={notasAsignacion}
                onChange={(e) => setNotasAsignacion(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalAsignar(null)}
                className="rounded px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]"
              >
                Cancelar
              </button>
              <PrimaryButton
                type="button"
                onClick={confirmarAsignacion}
                disabled={procesando || !destinoId}
                className="flex items-center gap-2"
              >
                {procesando && <Spinner size={14} />}
                {procesando ? 'Guardando…' : 'Confirmar'}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {modalHistorial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-[var(--color-bg-card)] p-6 shadow-lg">
            <h2 className="text-base font-semibold text-[var(--color-text)]">
              Historial de «{modalHistorial.nombre}»
            </h2>

            <div className="mt-4 max-h-96 overflow-y-auto">
              {cargandoHistorial && <CargandoPantalla minHeight={100} />}
              {!cargandoHistorial && historial.length === 0 && (
                <p className="py-4 text-sm text-[var(--color-text-faint)]">Sin historial todavía</p>
              )}
              {!cargandoHistorial &&
                historial.map((asignacion) => (
                  <div
                    key={asignacion.id}
                    className="border-b border-[var(--color-border)] py-3 text-sm last:border-b-0"
                  >
                    <p className="font-medium text-[var(--color-text)]">
                      {asignacion.usuario?.nombre ?? asignacion.cliente?.nombre}
                      {!asignacion.fechaDevolucion && (
                        <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-normal text-emerald-700">
                          Vigente
                        </span>
                      )}
                    </p>
                    <p className="text-[var(--color-text-muted)]">
                      Desde {new Date(asignacion.fechaAsignacion).toLocaleDateString()}
                      {asignacion.fechaDevolucion &&
                        ` hasta ${new Date(asignacion.fechaDevolucion).toLocaleDateString()}`}
                    </p>
                    {asignacion.notas && (
                      <p className="text-[var(--color-text-faint)]">{asignacion.notas}</p>
                    )}
                    <p className="text-xs text-[var(--color-text-faint)]">
                      Asignado por {asignacion.asignadoPor.nombre}
                    </p>
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
    </div>
  )
}
