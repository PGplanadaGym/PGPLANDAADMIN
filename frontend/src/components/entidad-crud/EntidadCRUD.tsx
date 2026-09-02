import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { axiosInstance } from '../../lib/axios'
import { useEntidadMetadata } from '../../hooks/useEntidadMetadata'
import { useBusquedaPaginada } from '../../hooks/useBusquedaPaginada'
import { useConfirm } from '../ui/ConfirmDialog'
import { SearchInput } from '../ui/SearchInput'
import { Pagination } from '../ui/Pagination'
import { PrimaryButton } from '../ui/PrimaryButton'
import { ExportarCSVButton } from '../ui/ExportarCSVButton'
import { buildEntidadSchema } from './schema'

interface Registro {
  id: string
  valores: Record<string, unknown>
  creadoEn: string
}

interface Props {
  entidadClave: string
}

export function EntidadCRUD({ entidadClave }: Props) {
  const { entidad, loading: cargandoMeta } = useEntidadMetadata(entidadClave)
  const [registros, setRegistros] = useState<Registro[]>([])
  const [cargandoRegistros, setCargandoRegistros] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const { confirmar, dialog } = useConfirm()

  const campos = entidad?.campos ?? []
  const schema = buildEntidadSchema(campos)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<Record<string, any>>({ resolver: zodResolver(schema) })

  const {
    query,
    setQuery,
    pageItems,
    filtrados,
    pagina,
    setPagina,
    totalPaginas,
    totalFiltrados,
  } = useBusquedaPaginada(registros, (r) => Object.values(r.valores).join(' '))

  const cargarRegistros = async () => {
    setCargandoRegistros(true)
    try {
      const { data } = await axiosInstance.get<Registro[]>(
        `/dinamico/${entidadClave}/registros`,
      )
      setRegistros(data)
    } finally {
      setCargandoRegistros(false)
    }
  }

  useEffect(() => {
    setMostrarForm(false)
    reset({})
    cargarRegistros()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entidadClave])

  const onSubmit = handleSubmit(async (valores) => {
    try {
      await axiosInstance.post(`/dinamico/${entidadClave}/registros`, { valores })
      toast.success(`${entidad?.nombre ?? 'Registro'} creado`)
      reset({})
      setMostrarForm(false)
      await cargarRegistros()
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo guardar el registro'))
    }
  })

  const eliminar = async (registro: Registro) => {
    const confirmado = await confirmar(
      'Eliminar registro',
      '¿Seguro que quieres eliminarlo? Esta acción no se puede deshacer.',
    )
    if (!confirmado) return

    try {
      await axiosInstance.delete(`/dinamico/${entidadClave}/registros/${registro.id}`)
      toast.success('Registro eliminado')
      await cargarRegistros()
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo eliminar el registro'))
    }
  }

  if (cargandoMeta) {
    return <p className="text-sm text-[var(--color-text-faint)]">Cargando…</p>
  }

  if (!entidad) {
    return <p className="text-sm text-red-600">Entidad no encontrada</p>
  }

  return (
    <div>
      {dialog}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-[var(--color-text)]">{entidad.nombre}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <ExportarCSVButton
            nombreArchivo={`${entidadClave}.csv`}
            filas={filtrados.map((r) => r.valores)}
          />
          <PrimaryButton type="button" onClick={() => setMostrarForm((valor) => !valor)}>
            {mostrarForm ? 'Cancelar' : 'Nuevo'}
          </PrimaryButton>
        </div>
      </div>

      {mostrarForm && (
        <form
          onSubmit={onSubmit}
          className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)] p-4 sm:p-6"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {campos.map((campo) => (
            <div key={campo.clave}>
              <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                {campo.etiqueta}
                {campo.requerido && <span className="text-red-500"> *</span>}
              </label>

              {campo.tipo === 'select' ? (
                <select
                  {...register(campo.clave)}
                  defaultValue=""
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                >
                  <option value="" disabled>
                    Selecciona…
                  </option>
                  {(campo.opciones ?? []).map((opcion) => (
                    <option key={opcion} value={opcion}>
                      {opcion}
                    </option>
                  ))}
                </select>
              ) : campo.tipo === 'booleano' ? (
                <input type="checkbox" {...register(campo.clave)} className="h-4 w-4" />
              ) : (
                <input
                  type={
                    campo.tipo === 'numero'
                      ? 'number'
                      : campo.tipo === 'fecha'
                        ? 'date'
                        : 'text'
                  }
                  step={campo.tipo === 'numero' ? 'any' : undefined}
                  {...register(campo.clave)}
                  className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                />
              )}

              {errors[campo.clave] && (
                <p className="mt-1 text-xs text-red-600">
                  {String(errors[campo.clave]?.message)}
                </p>
              )}
            </div>
          ))}
          </div>

          <PrimaryButton type="submit" disabled={isSubmitting} className="mt-4">
            {isSubmitting ? 'Guardando…' : 'Guardar'}
          </PrimaryButton>
        </form>
      )}

      <div className="mt-4">
        <SearchInput value={query} onChange={setQuery} />
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]">
            <tr>
              {campos.map((campo) => (
                <th key={campo.clave} className="px-4 py-2">
                  {campo.etiqueta}
                </th>
              ))}
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {pageItems.map((registro) => (
              <tr key={registro.id} className="border-t border-[var(--color-border)]">
                {campos.map((campo) => (
                  <td key={campo.clave} className="px-4 py-2">
                    {formatearValor(registro.valores[campo.clave])}
                  </td>
                ))}
                <td className="px-4 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => eliminar(registro)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {pageItems.length === 0 && (
              <tr>
                <td
                  colSpan={campos.length + 1}
                  className="px-4 py-6 text-center text-[var(--color-text-faint)]"
                >
                  {cargandoRegistros
                    ? 'Cargando…'
                    : query
                      ? 'Sin resultados para tu búsqueda'
                      : 'Sin registros todavía'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination
          pagina={pagina}
          totalPaginas={totalPaginas}
          onChange={setPagina}
          total={totalFiltrados}
        />
      </div>
    </div>
  )
}

function formatearValor(valor: unknown) {
  if (valor === null || valor === undefined || valor === '') return '—'
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No'
  return String(valor)
}

function mensajeError(error: unknown, fallback: string) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: { data?: { message?: string } } }).response?.data
      ?.message === 'string'
  ) {
    return (error as { response: { data: { message: string } } }).response.data.message
  }
  return fallback
}
