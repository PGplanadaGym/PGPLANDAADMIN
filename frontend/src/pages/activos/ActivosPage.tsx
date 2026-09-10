import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Pencil, Archive, ArchiveRestore, Wrench, Trash2 } from 'lucide-react'
import { CanAccess, useGetIdentity } from '@refinedev/core'
import { axiosInstance } from '../../lib/axios'
import { buildAbility } from '../../ability/ability'
import type { Identity } from '../../lib/identity'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { Spinner } from '../../components/ui/Spinner'
import { CargandoPantalla } from '../../components/ui/CargandoPantalla'
import { SearchInput } from '../../components/ui/SearchInput'
import { ImageUploadField } from '../../components/ui/ImageUploadField'
import { useConfirm } from '../../components/ui/ConfirmDialog'

const ESTADOS_ACTIVO = [
  { value: 'disponible', label: 'Disponible' },
  { value: 'asignado', label: 'Asignado' },
  { value: 'baja', label: 'Baja' },
] as const

function diasHasta(fechaIso: string) {
  return Math.ceil((new Date(fechaIso).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function mensajeError(error: unknown, fallback: string) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  )
}

const ESTADO_ESTILO: Record<string, string> = {
  disponible: 'bg-emerald-100 text-emerald-700',
  asignado: 'bg-amber-100 text-amber-700',
  baja: 'bg-red-100 text-red-700',
}

interface CategoriaActivo {
  id: string
  nombre: string
  activo: boolean
  _count: { activos: number }
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

interface CategoriaMovimiento {
  id: string
  nombre: string
}

interface Activo {
  id: string
  nombre: string
  marca: string | null
  modelo: string | null
  codigoInterno: string | null
  numeroSerie: string | null
  estado: string
  valorCompra: string | null
  fechaCompra: string | null
  garantiaHasta: string | null
  notas: string | null
  categoriaActivo: CategoriaActivo
  sucursal: Sucursal | null
  imagenUrl: string | null
  asignaciones: Asignacion[]
  _count: { asignaciones: number; mantenimientos: number }
}

interface Mantenimiento {
  id: string
  fecha: string
  descripcion: string
  costo: string | null
  usuario: UsuarioBasico
}

export function ActivosPage() {
  const { confirmar, dialog } = useConfirm()
  const { data: identity } = useGetIdentity<Identity>()
  const ability = useMemo(() => buildAbility(identity?.permisos ?? []), [identity?.permisos])
  const puedeAsignar = ability.can('activos.asignar', 'all')

  const [activos, setActivos] = useState<Activo[]>([])
  const [categorias, setCategorias] = useState<CategoriaActivo[]>([])
  const [usuarios, setUsuarios] = useState<UsuarioBasico[]>([])
  const [clientes, setClientes] = useState<ClienteBasico[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [cargando, setCargando] = useState(true)

  const [nombreCategoria, setNombreCategoria] = useState('')
  const [creandoCategoria, setCreandoCategoria] = useState(false)

  const [nombre, setNombre] = useState('')
  const [marca, setMarca] = useState('')
  const [modelo, setModelo] = useState('')
  const [categoriaActivoId, setCategoriaActivoId] = useState('')
  const [codigoInterno, setCodigoInterno] = useState('')
  const [numeroSerie, setNumeroSerie] = useState('')
  const [valorCompra, setValorCompra] = useState('')
  const [fechaCompra, setFechaCompra] = useState('')
  const [garantiaHasta, setGarantiaHasta] = useState('')
  const [notas, setNotas] = useState('')
  const [sucursalId, setSucursalId] = useState('')
  const [imagenUrl, setImagenUrl] = useState('')
  const [creandoActivo, setCreandoActivo] = useState(false)

  const [modalAsignar, setModalAsignar] = useState<Activo | 'lote' | null>(null)
  const [tipoDestino, setTipoDestino] = useState<'usuario' | 'cliente'>('usuario')
  const [destinoId, setDestinoId] = useState('')
  const [notasAsignacion, setNotasAsignacion] = useState('')
  const [procesando, setProcesando] = useState(false)

  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())

  const [modalReemplazar, setModalReemplazar] = useState<Activo | null>(null)
  const [activoNuevoId, setActivoNuevoId] = useState('')
  const [motivoReemplazo, setMotivoReemplazo] = useState('')
  const [estadoActivoViejo, setEstadoActivoViejo] = useState<'disponible' | 'baja'>('disponible')
  const [reemplazando, setReemplazando] = useState(false)

  const [modalHistorial, setModalHistorial] = useState<Activo | null>(null)
  const [historial, setHistorial] = useState<Asignacion[]>([])
  const [cargandoHistorial, setCargandoHistorial] = useState(false)

  const [query, setQuery] = useState('')
  const [filtroCategoriaId, setFiltroCategoriaId] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')

  const [mostrarCategoriasArchivadas, setMostrarCategoriasArchivadas] = useState(false)
  const [categoriaEdit, setCategoriaEdit] = useState<CategoriaActivo | null>(null)
  const [nombreCategoriaEdit, setNombreCategoriaEdit] = useState('')
  const [guardandoCategoriaEdit, setGuardandoCategoriaEdit] = useState(false)
  const [cambiandoActivoCategoriaId, setCambiandoActivoCategoriaId] = useState<string | null>(null)
  const [eliminandoCategoriaId, setEliminandoCategoriaId] = useState<string | null>(null)

  const [activoEdit, setActivoEdit] = useState<Activo | null>(null)
  const [nombreEdit, setNombreEdit] = useState('')
  const [marcaEdit, setMarcaEdit] = useState('')
  const [modeloEdit, setModeloEdit] = useState('')
  const [categoriaActivoIdEdit, setCategoriaActivoIdEdit] = useState('')
  const [codigoInternoEdit, setCodigoInternoEdit] = useState('')
  const [numeroSerieEdit, setNumeroSerieEdit] = useState('')
  const [valorCompraEdit, setValorCompraEdit] = useState('')
  const [fechaCompraEdit, setFechaCompraEdit] = useState('')
  const [garantiaHastaEdit, setGarantiaHastaEdit] = useState('')
  const [notasEdit, setNotasEdit] = useState('')
  const [estadoEdit, setEstadoEdit] = useState<(typeof ESTADOS_ACTIVO)[number]['value']>('disponible')
  const [sucursalIdEdit, setSucursalIdEdit] = useState('')
  const [imagenUrlEdit, setImagenUrlEdit] = useState('')
  const [guardandoEdit, setGuardandoEdit] = useState(false)

  const [modalMantenimiento, setModalMantenimiento] = useState<Activo | null>(null)
  const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([])
  const [cargandoMantenimientos, setCargandoMantenimientos] = useState(false)
  const [mantFecha, setMantFecha] = useState('')
  const [mantDescripcion, setMantDescripcion] = useState('')
  const [mantCosto, setMantCosto] = useState('')
  const [categoriasEgreso, setCategoriasEgreso] = useState<CategoriaMovimiento[]>([])
  const [categoriaEgresoId, setCategoriaEgresoId] = useState('')
  const [agregandoMantenimiento, setAgregandoMantenimiento] = useState(false)
  const [eliminandoMantenimientoId, setEliminandoMantenimientoId] = useState<string | null>(null)

  const cargar = async () => {
    setCargando(true)
    try {
      const [a, c] = await Promise.all([
        axiosInstance.get<Activo[]>('/activos'),
        axiosInstance.get<CategoriaActivo[]>('/categorias-activo', {
          params: mostrarCategoriasArchivadas ? { incluirInactivos: 'true' } : {},
        }),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mostrarCategoriasArchivadas])

  useEffect(() => {
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
    axiosInstance
      .get<CategoriaMovimiento[]>('/categorias-movimiento', { params: { tipo: 'egreso' } })
      .then(({ data }) => setCategoriasEgreso(data))
      .catch(() => {
        /* módulo Cuentas puede no estar activo: simplemente no se puede registrar el gasto */
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

  const abrirEdicionCategoria = (categoria: CategoriaActivo) => {
    setCategoriaEdit(categoria)
    setNombreCategoriaEdit(categoria.nombre)
  }

  const guardarEdicionCategoria = async () => {
    if (!categoriaEdit || !nombreCategoriaEdit.trim()) return
    setGuardandoCategoriaEdit(true)
    try {
      await axiosInstance.patch(`/categorias-activo/${categoriaEdit.id}`, {
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

  const alternarActivoCategoria = async (categoria: CategoriaActivo) => {
    setCambiandoActivoCategoriaId(categoria.id)
    try {
      await axiosInstance.patch(`/categorias-activo/${categoria.id}`, {
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

  const eliminarCategoria = async (categoria: CategoriaActivo) => {
    const confirmado = await confirmar(
      'Eliminar categoría',
      `¿Eliminar la categoría «${categoria.nombre}»? Esta acción no se puede deshacer.`,
      'Eliminar',
    )
    if (!confirmado) return
    setEliminandoCategoriaId(categoria.id)
    try {
      await axiosInstance.delete(`/categorias-activo/${categoria.id}`)
      toast.success('Categoría eliminada')
      await cargar()
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo eliminar la categoría'))
    } finally {
      setEliminandoCategoriaId(null)
    }
  }

  const crearActivo = async () => {
    if (!nombre.trim() || !categoriaActivoId) return
    setCreandoActivo(true)
    try {
      await axiosInstance.post('/activos', {
        nombre,
        marca: marca || undefined,
        modelo: modelo || undefined,
        categoriaActivoId,
        codigoInterno: codigoInterno || undefined,
        numeroSerie: numeroSerie || undefined,
        valorCompra: valorCompra ? Number(valorCompra) : undefined,
        fechaCompra: fechaCompra || undefined,
        garantiaHasta: garantiaHasta || undefined,
        notas: notas || undefined,
        sucursalId: sucursalId || undefined,
        imagenUrl: imagenUrl || undefined,
      })
      setNombre('')
      setMarca('')
      setModelo('')
      setCodigoInterno('')
      setNumeroSerie('')
      setValorCompra('')
      setFechaCompra('')
      setGarantiaHasta('')
      setNotas('')
      setSucursalId('')
      setImagenUrl('')
      toast.success('Activo creado')
      await cargar()
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo crear el activo'))
    } finally {
      setCreandoActivo(false)
    }
  }

  const abrirEdicionActivo = (activo: Activo) => {
    setActivoEdit(activo)
    setNombreEdit(activo.nombre)
    setMarcaEdit(activo.marca ?? '')
    setModeloEdit(activo.modelo ?? '')
    setCategoriaActivoIdEdit(activo.categoriaActivo.id)
    setCodigoInternoEdit(activo.codigoInterno ?? '')
    setNumeroSerieEdit(activo.numeroSerie ?? '')
    setValorCompraEdit(activo.valorCompra ?? '')
    setFechaCompraEdit(activo.fechaCompra ? activo.fechaCompra.slice(0, 10) : '')
    setGarantiaHastaEdit(activo.garantiaHasta ? activo.garantiaHasta.slice(0, 10) : '')
    setNotasEdit(activo.notas ?? '')
    setEstadoEdit(activo.estado as (typeof ESTADOS_ACTIVO)[number]['value'])
    setSucursalIdEdit(activo.sucursal?.id ?? '')
    setImagenUrlEdit(activo.imagenUrl ?? '')
  }

  const guardarEdicionActivo = async () => {
    if (!activoEdit || !nombreEdit.trim() || !categoriaActivoIdEdit) return
    setGuardandoEdit(true)
    try {
      await axiosInstance.patch(`/activos/${activoEdit.id}`, {
        nombre: nombreEdit,
        marca: marcaEdit || null,
        modelo: modeloEdit || null,
        categoriaActivoId: categoriaActivoIdEdit,
        codigoInterno: codigoInternoEdit || null,
        numeroSerie: numeroSerieEdit || null,
        valorCompra: valorCompraEdit ? Number(valorCompraEdit) : null,
        fechaCompra: fechaCompraEdit || null,
        garantiaHasta: garantiaHastaEdit || null,
        notas: notasEdit || null,
        sucursalId: sucursalIdEdit || null,
        imagenUrl: imagenUrlEdit || null,
        // "Asignado" no se puede tocar desde aquí — si el activo ya está asignado, no se
        // manda estado (así no se corre el riesgo de cerrar la asignación sin querer).
        estado: activoEdit.estado === 'asignado' ? undefined : estadoEdit,
      })
      toast.success('Activo actualizado')
      setActivoEdit(null)
      await cargar()
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo actualizar el activo'))
    } finally {
      setGuardandoEdit(false)
    }
  }

  const abrirAsignar = (activo: Activo) => {
    setModalAsignar(activo)
    setTipoDestino('usuario')
    setDestinoId('')
    setNotasAsignacion('')
  }

  const abrirAsignarLote = () => {
    if (seleccionados.size === 0) return
    setModalAsignar('lote')
    setTipoDestino('usuario')
    setDestinoId('')
    setNotasAsignacion('')
  }

  const toggleSeleccionado = (activoId: string) => {
    setSeleccionados((prev) => {
      const next = new Set(prev)
      if (next.has(activoId)) next.delete(activoId)
      else next.add(activoId)
      return next
    })
  }

  const confirmarAsignacion = async () => {
    if (!modalAsignar || !destinoId) return
    setProcesando(true)
    try {
      if (modalAsignar === 'lote') {
        await axiosInstance.post('/activos/asignar-varios', {
          activoIds: Array.from(seleccionados),
          usuarioId: tipoDestino === 'usuario' ? destinoId : undefined,
          clienteId: tipoDestino === 'cliente' ? destinoId : undefined,
          notas: notasAsignacion || undefined,
        })
        toast.success(`${seleccionados.size} activos asignados`)
        setSeleccionados(new Set())
      } else {
        await axiosInstance.post(`/activos/${modalAsignar.id}/asignar`, {
          usuarioId: tipoDestino === 'usuario' ? destinoId : undefined,
          clienteId: tipoDestino === 'cliente' ? destinoId : undefined,
          notas: notasAsignacion || undefined,
        })
        toast.success('Activo asignado')
      }
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

  const abrirReemplazar = (activo: Activo) => {
    setModalReemplazar(activo)
    setActivoNuevoId('')
    setMotivoReemplazo('')
    setEstadoActivoViejo('disponible')
  }

  const confirmarReemplazo = async () => {
    if (!modalReemplazar || !activoNuevoId) return
    setReemplazando(true)
    try {
      await axiosInstance.post(`/activos/${modalReemplazar.id}/reemplazar`, {
        activoNuevoId,
        motivo: motivoReemplazo || undefined,
        estadoActivoViejo,
      })
      toast.success('Activo reemplazado')
      setModalReemplazar(null)
      await cargar()
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo reemplazar el activo'))
    } finally {
      setReemplazando(false)
    }
  }

  const eliminarActivo = async (activo: Activo) => {
    const confirmado = await confirmar(
      'Eliminar activo',
      `¿Eliminar «${activo.nombre}»? Esta acción no se puede deshacer.`,
      'Eliminar',
    )
    if (!confirmado) return
    setProcesando(true)
    try {
      await axiosInstance.delete(`/activos/${activo.id}`)
      toast.success('Activo eliminado')
      await cargar()
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo eliminar el activo'))
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

  const abrirMantenimiento = async (activo: Activo) => {
    setModalMantenimiento(activo)
    setMantFecha('')
    setMantDescripcion('')
    setMantCosto('')
    setCategoriaEgresoId('')
    setCargandoMantenimientos(true)
    try {
      const { data } = await axiosInstance.get<Mantenimiento[]>(
        `/activos/${activo.id}/mantenimientos`,
      )
      setMantenimientos(data)
    } catch {
      toast.error('No se pudo cargar el historial de mantenimiento')
    } finally {
      setCargandoMantenimientos(false)
    }
  }

  const agregarMantenimiento = async () => {
    if (!modalMantenimiento || !mantFecha || !mantDescripcion.trim()) return
    setAgregandoMantenimiento(true)
    try {
      const { data } = await axiosInstance.post<Mantenimiento[]>(
        `/activos/${modalMantenimiento.id}/mantenimientos`,
        {
          fecha: mantFecha,
          descripcion: mantDescripcion,
          costo: mantCosto ? Number(mantCosto) : undefined,
          categoriaEgresoId: mantCosto && categoriaEgresoId ? categoriaEgresoId : undefined,
        },
      )
      toast.success('Mantenimiento registrado')
      setMantenimientos(data)
      setMantFecha('')
      setMantDescripcion('')
      setMantCosto('')
      setCategoriaEgresoId('')
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo registrar el mantenimiento'))
    } finally {
      setAgregandoMantenimiento(false)
    }
  }

  const quitarMantenimiento = async (mantenimientoId: string) => {
    if (!modalMantenimiento) return
    setEliminandoMantenimientoId(mantenimientoId)
    try {
      const { data } = await axiosInstance.delete<Mantenimiento[]>(
        `/activos/${modalMantenimiento.id}/mantenimientos/${mantenimientoId}`,
      )
      toast.success('Registro eliminado')
      setMantenimientos(data)
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo eliminar el registro'))
    } finally {
      setEliminandoMantenimientoId(null)
    }
  }

  const activosFiltrados = activos.filter((activo) => {
    const q = query.trim().toLowerCase()
    const coincideQuery =
      !q ||
      activo.nombre.toLowerCase().includes(q) ||
      (activo.codigoInterno?.toLowerCase().includes(q) ?? false) ||
      (activo.marca?.toLowerCase().includes(q) ?? false) ||
      (activo.modelo?.toLowerCase().includes(q) ?? false)
    const coincideCategoria = !filtroCategoriaId || activo.categoriaActivo.id === filtroCategoriaId
    const coincideEstado = !filtroEstado || activo.estado === filtroEstado
    return coincideQuery && coincideCategoria && coincideEstado
  })

  const valorTotalInventario = activos
    .filter((a) => a.estado !== 'baja')
    .reduce((suma, a) => suma + Number(a.valorCompra ?? 0), 0)

  const activosConGarantiaPorVencer = activos.filter(
    (a) => a.garantiaHasta && a.estado !== 'baja' && diasHasta(a.garantiaHasta) <= 30,
  )

  return (
    <div>
      <h1 className="text-xl font-bold text-[var(--color-text)]">Activos</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Equipos, herramientas o vehículos que se asignan a una persona o cliente, con historial
        completo de quién tuvo cada uno y cuándo.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[var(--sombra-sm)]">
          <p className="text-xs text-[var(--color-text-muted)]">Valor total del inventario</p>
          <p className="text-lg font-bold text-[var(--color-text)]">
            ${valorTotalInventario.toFixed(2)}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 shadow-[var(--sombra-sm)]">
          <p className="text-xs text-[var(--color-text-muted)]">Garantías por vencer (30 días)</p>
          <p
            className={`text-lg font-bold ${activosConGarantiaPorVencer.length > 0 ? 'text-amber-600' : 'text-[var(--color-text)]'}`}
          >
            {activosConGarantiaPorVencer.length}
          </p>
          {activosConGarantiaPorVencer.length > 0 && (
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              {activosConGarantiaPorVencer.map((a) => a.nombre).join(', ')}
            </p>
          )}
        </div>
      </div>

      <CanAccess resource="activos" action="create">
      <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)] p-4">
        <div className="flex flex-wrap items-end gap-3">
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
                {c._count.activos === 0 ? (
                  <button
                    type="button"
                    onClick={() => eliminarCategoria(c)}
                    disabled={eliminandoCategoriaId === c.id}
                    title="Eliminar (no tiene activos asociados)"
                    className="rounded p-0.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {eliminandoCategoriaId === c.id ? <Spinner size={12} /> : <Trash2 size={12} />}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    title={`Tiene ${c._count.activos} activo(s) asociado(s) — archívala en su lugar`}
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
            Marca
          </label>
          <input
            value={marca}
            onChange={(e) => setMarca(e.target.value)}
            placeholder="Ej: Dell"
            className="w-28 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
            Modelo
          </label>
          <input
            value={modelo}
            onChange={(e) => setModelo(e.target.value)}
            placeholder="Ej: Latitude 5420"
            className="w-32 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
          />
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
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
            Valor de compra
          </label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={valorCompra}
            onChange={(e) => setValorCompra(e.target.value)}
            placeholder="$"
            className="w-28 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
            Fecha de compra
          </label>
          <input
            type="date"
            value={fechaCompra}
            onChange={(e) => setFechaCompra(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
            Garantía hasta
          </label>
          <input
            type="date"
            value={garantiaHasta}
            onChange={(e) => setGarantiaHasta(e.target.value)}
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
        <ImageUploadField label="Foto del activo" value={imagenUrl} onChange={setImagenUrl} />
        <div className="w-full">
          <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
            Notas (opcional)
          </label>
          <input
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
          />
        </div>
      </div>
      </CanAccess>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Buscar por nombre, código, marca o modelo…"
        />
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
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm focus:border-[var(--color-primario)] focus:outline-none"
        >
          <option value="">Todos los estados</option>
          {ESTADOS_ACTIVO.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </select>
      </div>

      {puedeAsignar && seleccionados.size > 0 && (
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] px-4 py-2 text-sm shadow-[var(--sombra-sm)]">
          <span className="text-[var(--color-text)]">
            {seleccionados.size} activo{seleccionados.size > 1 ? 's' : ''} seleccionado
            {seleccionados.size > 1 ? 's' : ''}
          </span>
          <PrimaryButton type="button" onClick={abrirAsignarLote} className="text-xs">
            Asignar seleccionados
          </PrimaryButton>
          <button
            type="button"
            onClick={() => setSeleccionados(new Set())}
            className="text-xs text-[var(--color-text-muted)] hover:underline"
          >
            Cancelar selección
          </button>
        </div>
      )}

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
              {puedeAsignar && (
                <th className="w-8 px-4 py-2">
                  <input
                    type="checkbox"
                    checked={
                      activosFiltrados.some((a) => a.estado !== 'baja') &&
                      activosFiltrados
                        .filter((a) => a.estado !== 'baja')
                        .every((a) => seleccionados.has(a.id))
                    }
                    onChange={(e) =>
                      setSeleccionados(
                        e.target.checked
                          ? new Set(activosFiltrados.filter((a) => a.estado !== 'baja').map((a) => a.id))
                          : new Set(),
                      )
                    }
                  />
                </th>
              )}
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
            {activosFiltrados.map((activo) => (
              <tr key={activo.id} className="border-t border-[var(--color-border)]">
                {puedeAsignar && (
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={seleccionados.has(activo.id)}
                      disabled={activo.estado === 'baja'}
                      title={activo.estado === 'baja' ? 'No se puede asignar: está dado de baja' : undefined}
                      onChange={() => toggleSeleccionado(activo.id)}
                    />
                  </td>
                )}
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    {activo.imagenUrl ? (
                      <img
                        src={activo.imagenUrl}
                        alt=""
                        className="h-8 w-8 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 shrink-0 rounded bg-[var(--color-bg)]" />
                    )}
                    <div>
                      <div>
                        {activo.nombre}
                        {activo.garantiaHasta &&
                          activo.estado !== 'baja' &&
                          diasHasta(activo.garantiaHasta) <= 30 && (
                            <span
                              className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700"
                              title={`Garantía ${diasHasta(activo.garantiaHasta) < 0 ? 'vencida' : 'vence pronto'}`}
                            >
                              {diasHasta(activo.garantiaHasta) < 0 ? 'Garantía vencida' : 'Garantía por vencer'}
                            </span>
                          )}
                      </div>
                      {(activo.marca || activo.modelo) && (
                        <div className="text-xs text-[var(--color-text-faint)]">
                          {[activo.marca, activo.modelo].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
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
                    <CanAccess resource="activos" action="edit">
                      <button
                        type="button"
                        onClick={() => abrirEdicionActivo(activo)}
                        title="Editar activo"
                        className="rounded p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)]"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => abrirMantenimiento(activo)}
                        title="Mantenimiento"
                        className="rounded p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)]"
                      >
                        <Wrench size={14} />
                      </button>
                    </CanAccess>
                    {puedeAsignar && (
                      <button
                        type="button"
                        onClick={() => abrirAsignar(activo)}
                        className="rounded px-2 py-1 text-xs text-[var(--color-primario-legible)] hover:bg-[var(--color-bg-subtle)]"
                      >
                        {activo.asignaciones.length > 0 ? 'Reasignar' : 'Asignar'}
                      </button>
                    )}
                    {puedeAsignar && activo.asignaciones.length > 0 && (
                      <button
                        type="button"
                        onClick={() => devolver(activo)}
                        disabled={procesando}
                        className="rounded px-2 py-1 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-50"
                      >
                        Devolver
                      </button>
                    )}
                    {puedeAsignar && activo.asignaciones.length > 0 && (
                      <button
                        type="button"
                        onClick={() => abrirReemplazar(activo)}
                        title="Reemplazar por otro activo (daño, robo, upgrade…)"
                        className="rounded px-2 py-1 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)]"
                      >
                        Reemplazar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => abrirHistorial(activo)}
                      className="rounded px-2 py-1 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)]"
                    >
                      Historial
                    </button>
                    <CanAccess resource="activos" action="delete">
                      {activo._count.asignaciones === 0 && activo._count.mantenimientos === 0 ? (
                        <button
                          type="button"
                          onClick={() => eliminarActivo(activo)}
                          disabled={procesando}
                          title="Eliminar (solo activos sin historial)"
                          className="rounded p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled
                          title="Tiene historial de asignaciones o mantenimientos — usa Dar de baja en su lugar"
                          className="rounded p-1.5 text-[var(--color-text-faint)] opacity-40"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </CanAccess>
                  </div>
                </td>
              </tr>
            ))}
            {activosFiltrados.length === 0 && (
              <tr>
                <td
                  colSpan={(sucursales.length > 0 ? 7 : 6) + (puedeAsignar ? 1 : 0)}
                  className="px-4 py-6 text-center text-[var(--color-text-faint)]"
                >
                  {cargando ? (
                    <CargandoPantalla minHeight={80} />
                  ) : query || filtroCategoriaId || filtroEstado ? (
                    'Sin resultados para tu búsqueda'
                  ) : (
                    'Sin activos todavía'
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalAsignar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-lg bg-[var(--color-bg-card)] p-6 shadow-lg">
            <h2 className="text-base font-semibold text-[var(--color-text)]">
              {modalAsignar === 'lote'
                ? `Asignar ${seleccionados.size} activos`
                : `Asignar «${modalAsignar.nombre}»`}
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

      {modalReemplazar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-lg bg-[var(--color-bg-card)] p-6 shadow-lg">
            <h2 className="text-base font-semibold text-[var(--color-text)]">
              Reemplazar «{modalReemplazar.nombre}»
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              Se devuelve este activo y se asigna el de reemplazo a{' '}
              {titularActual(modalReemplazar)}, en un solo paso.
            </p>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                Activo de reemplazo
              </label>
              <select
                value={activoNuevoId}
                onChange={(e) => setActivoNuevoId(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
              >
                <option value="">Selecciona…</option>
                {activos
                  .filter((a) => a.estado === 'disponible' && a.id !== modalReemplazar.id)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre}
                      {a.codigoInterno ? ` (${a.codigoInterno})` : ''}
                    </option>
                  ))}
              </select>
              {activos.filter((a) => a.estado === 'disponible' && a.id !== modalReemplazar.id).length ===
                0 && (
                <p className="mt-1 text-xs text-[var(--color-text-faint)]">
                  No hay otro activo disponible para usar como reemplazo.
                </p>
              )}
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                Motivo (opcional)
              </label>
              <input
                value={motivoReemplazo}
                onChange={(e) => setMotivoReemplazo(e.target.value)}
                placeholder="Ej: Dañado por caída, robo, actualización…"
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
              />
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                ¿Qué pasa con «{modalReemplazar.nombre}»?
              </label>
              <select
                value={estadoActivoViejo}
                onChange={(e) => setEstadoActivoViejo(e.target.value as typeof estadoActivoViejo)}
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
              >
                <option value="disponible">Vuelve al inventario (disponible)</option>
                <option value="baja">Se da de baja (inservible)</option>
              </select>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalReemplazar(null)}
                className="rounded px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]"
              >
                Cancelar
              </button>
              <PrimaryButton
                type="button"
                onClick={confirmarReemplazo}
                disabled={reemplazando || !activoNuevoId}
                className="flex items-center gap-2"
              >
                {reemplazando && <Spinner size={14} />}
                {reemplazando ? 'Guardando…' : 'Confirmar reemplazo'}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {modalHistorial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg bg-[var(--color-bg-card)] p-6 shadow-lg">
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

      {activoEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-lg bg-[var(--color-bg-card)] p-6 shadow-lg">
            <h2 className="text-base font-semibold text-[var(--color-text)]">Editar activo</h2>
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
                    Marca
                  </label>
                  <input
                    value={marcaEdit}
                    onChange={(e) => setMarcaEdit(e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                    Modelo
                  </label>
                  <input
                    value={modeloEdit}
                    onChange={(e) => setModeloEdit(e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                  />
                </div>
              </div>
              <ImageUploadField label="Foto del activo" value={imagenUrlEdit} onChange={setImagenUrlEdit} />
              <div className="flex flex-wrap gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                    Categoría
                  </label>
                  <select
                    value={categoriaActivoIdEdit}
                    onChange={(e) => setCategoriaActivoIdEdit(e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                  >
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                    Estado
                  </label>
                  {activoEdit?.estado === 'asignado' ? (
                    <p className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2 text-sm text-[var(--color-text-muted)]">
                      Asignado — usa "Devolver" para liberarlo
                    </p>
                  ) : (
                    <select
                      value={estadoEdit}
                      onChange={(e) => setEstadoEdit(e.target.value as typeof estadoEdit)}
                      className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                    >
                      {ESTADOS_ACTIVO.filter((e) => e.value !== 'asignado').map((e) => (
                        <option key={e.value} value={e.value}>
                          {e.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              {sucursales.length > 0 && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                    Sucursal
                  </label>
                  <select
                    value={sucursalIdEdit}
                    onChange={(e) => setSucursalIdEdit(e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                  >
                    <option value="">Sin asignar</option>
                    {sucursales.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>
                  {activoEdit?.estado === 'asignado' && (
                    <p className="mt-1 text-xs text-[var(--color-text-faint)]">
                      Mientras esté asignado, la sucursal se actualiza automáticamente según a
                      quién se le asigne.
                    </p>
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                    Código interno
                  </label>
                  <input
                    value={codigoInternoEdit}
                    onChange={(e) => setCodigoInternoEdit(e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                    N° de serie
                  </label>
                  <input
                    value={numeroSerieEdit}
                    onChange={(e) => setNumeroSerieEdit(e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                    Valor de compra
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={valorCompraEdit}
                    onChange={(e) => setValorCompraEdit(e.target.value)}
                    placeholder="$"
                    className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                    Fecha de compra
                  </label>
                  <input
                    type="date"
                    value={fechaCompraEdit}
                    onChange={(e) => setFechaCompraEdit(e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                    Garantía hasta
                  </label>
                  <input
                    type="date"
                    value={garantiaHastaEdit}
                    onChange={(e) => setGarantiaHastaEdit(e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                  />
                </div>
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
                onClick={() => setActivoEdit(null)}
                className="rounded px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]"
              >
                Cancelar
              </button>
              <PrimaryButton
                type="button"
                onClick={guardarEdicionActivo}
                disabled={guardandoEdit || !nombreEdit.trim() || !categoriaActivoIdEdit}
                className="flex items-center gap-2"
              >
                {guardandoEdit && <Spinner size={14} />}
                {guardandoEdit ? 'Guardando…' : 'Guardar cambios'}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {modalMantenimiento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-lg bg-[var(--color-bg-card)] p-6 shadow-lg">
            <h2 className="text-base font-semibold text-[var(--color-text)]">
              Mantenimiento de «{modalMantenimiento.nombre}»
            </h2>

            <div className="mt-3 max-h-72 overflow-y-auto">
              {cargandoMantenimientos && <CargandoPantalla minHeight={80} />}
              {!cargandoMantenimientos && mantenimientos.length === 0 && (
                <p className="py-2 text-sm text-[var(--color-text-faint)]">
                  Sin mantenimientos registrados
                </p>
              )}
              {!cargandoMantenimientos &&
                mantenimientos.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-start justify-between gap-2 border-b border-[var(--color-border)] py-2 text-sm last:border-b-0"
                  >
                    <div>
                      <p className="text-[var(--color-text)]">
                        {new Date(m.fecha).toLocaleDateString()} — {m.descripcion}
                        {m.costo && (
                          <span className="text-[var(--color-text-muted)]">
                            {' '}
                            (${Number(m.costo).toFixed(2)})
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-[var(--color-text-faint)]">
                        Registrado por {m.usuario.nombre}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => quitarMantenimiento(m.id)}
                      disabled={eliminandoMantenimientoId === m.id}
                      className="shrink-0 rounded p-1 text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {eliminandoMantenimientoId === m.id ? (
                        <Spinner size={13} />
                      ) : (
                        <Trash2 size={13} />
                      )}
                    </button>
                  </div>
                ))}
            </div>

            <div className="mt-4 border-t border-[var(--color-border)] pt-4">
              <p className="mb-2 text-sm font-medium text-[var(--color-text)]">
                Registrar mantenimiento
              </p>
              <div className="flex flex-wrap items-end gap-2">
                <div>
                  <label className="mb-1 block text-xs text-[var(--color-text-muted)]">Fecha</label>
                  <input
                    type="date"
                    value={mantFecha}
                    onChange={(e) => setMantFecha(e.target.value)}
                    className="rounded-lg border border-[var(--color-border)] px-2 py-1.5 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[var(--color-text-muted)]">
                    Costo (opcional)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={mantCosto}
                    onChange={(e) => setMantCosto(e.target.value)}
                    placeholder="$"
                    className="w-24 rounded-lg border border-[var(--color-border)] px-2 py-1.5 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                  />
                </div>
              </div>
              <div className="mt-2">
                <label className="mb-1 block text-xs text-[var(--color-text-muted)]">
                  Descripción
                </label>
                <input
                  value={mantDescripcion}
                  onChange={(e) => setMantDescripcion(e.target.value)}
                  placeholder="Ej: Cambio de aceite, reparación de pantalla…"
                  className="w-full rounded-lg border border-[var(--color-border)] px-2 py-1.5 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                />
              </div>
              {mantCosto && categoriasEgreso.length > 0 && (
                <div className="mt-2">
                  <label className="mb-1 block text-xs text-[var(--color-text-muted)]">
                    Registrar como gasto en Cuentas (opcional)
                  </label>
                  <select
                    value={categoriaEgresoId}
                    onChange={(e) => setCategoriaEgresoId(e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-border)] px-2 py-1.5 text-sm focus:border-[var(--color-primario)] focus:outline-none"
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
              <PrimaryButton
                type="button"
                onClick={agregarMantenimiento}
                disabled={agregandoMantenimiento || !mantFecha || !mantDescripcion.trim()}
                className="mt-3 flex items-center gap-2"
              >
                {agregandoMantenimiento && <Spinner size={14} />}
                {agregandoMantenimiento ? 'Agregando…' : 'Registrar'}
              </PrimaryButton>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setModalMantenimiento(null)}
                className="rounded px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg)]"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {dialog}
    </div>
  )
}
