import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useGetIdentity } from '@refinedev/core'
import { useNavigate } from 'react-router-dom'
import { Pencil, Upload } from 'lucide-react'
import { axiosInstance } from '../../lib/axios'
import { parsearCSV } from '../../lib/csv'
import { useEntidadMetadata } from '../../hooks/useEntidadMetadata'
import { useBusquedaPaginada } from '../../hooks/useBusquedaPaginada'
import { useConfirm } from '../ui/ConfirmDialog'
import { SearchInput } from '../ui/SearchInput'
import { Pagination } from '../ui/Pagination'
import { PrimaryButton } from '../ui/PrimaryButton'
import { ExportarCSVButton } from '../ui/ExportarCSVButton'
import { CargandoPantalla } from '../ui/CargandoPantalla'
import { Spinner } from '../ui/Spinner'
import { buildAbility } from '../../ability/ability'
import { mensajeError } from '../../lib/errores'
import type { Identity } from '../../lib/identity'
import type { CampoDinamico } from '../../providers/entidadesContext'
import { buildEntidadSchema } from './schema'
import { CampoInput } from './CampoInput'

interface Registro {
  id: string
  valores: Record<string, unknown>
  etiquetas?: Record<string, string>
  creadoEn: string
}

interface Props {
  entidadClave: string
}

function coercionarValorCSV(campo: CampoDinamico, texto: string): unknown {
  if (texto === '') return undefined
  if (campo.tipo === 'numero') {
    const numero = Number(texto)
    return Number.isNaN(numero) ? texto : numero
  }
  if (campo.tipo === 'booleano') {
    return ['si', 'sí', 'true', '1', 'yes'].includes(texto.trim().toLowerCase())
  }
  return texto
}

export function EntidadCRUD({ entidadClave }: Props) {
  const { entidad, loading: cargandoMeta } = useEntidadMetadata(entidadClave)
  const navigate = useNavigate()
  const [registros, setRegistros] = useState<Registro[]>([])
  const [cargandoRegistros, setCargandoRegistros] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState<Registro | null>(null)
  const [importando, setImportando] = useState(false)
  const inputImportarRef = useRef<HTMLInputElement>(null)
  const { confirmar, dialog } = useConfirm()
  const { data: identity } = useGetIdentity<Identity>()

  const ability = useMemo(() => buildAbility(identity?.permisos ?? []), [identity?.permisos])
  const puedeCrear = ability.can('entidades.registros.crear', 'all')
  const puedeEditar = ability.can('entidades.registros.actualizar', 'all')
  const puedeEliminar = ability.can('entidades.registros.eliminar', 'all')

  const campos = entidad?.campos ?? []
  const schema = buildEntidadSchema(campos)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
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
    setEditando(null)
    reset({})
    cargarRegistros()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entidadClave])

  const abrirNuevo = () => {
    setEditando(null)
    reset({})
    setMostrarForm(true)
  }

  const abrirEdicion = (registro: Registro) => {
    setEditando(registro)
    reset(registro.valores)
    setMostrarForm(true)
  }

  const cancelar = () => {
    setEditando(null)
    reset({})
    setMostrarForm(false)
  }

  const onSubmit = handleSubmit(async (valores) => {
    try {
      if (editando) {
        await axiosInstance.patch(`/dinamico/${entidadClave}/registros/${editando.id}`, { valores })
        toast.success(`${entidad?.nombre ?? 'Registro'} actualizado`)
      } else {
        await axiosInstance.post(`/dinamico/${entidadClave}/registros`, { valores })
        toast.success(`${entidad?.nombre ?? 'Registro'} creado`)
      }
      reset({})
      setEditando(null)
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
      if (editando?.id === registro.id) cancelar()
      await cargarRegistros()
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo eliminar el registro'))
    }
  }

  const importarCSV = async (file: File) => {
    const texto = await file.text()
    const filas = parsearCSV(texto)
    if (filas.length === 0) {
      toast.error('El archivo no tiene filas para importar')
      return
    }

    setImportando(true)
    let importados = 0
    const errores: string[] = []

    for (const [index, fila] of filas.entries()) {
      const valores: Record<string, unknown> = {}
      for (const campo of campos) {
        if (campo.tipo === 'relacion' || campo.tipo === 'imagen') continue
        const textoValor = fila[campo.clave]
        if (textoValor === undefined) continue
        const valor = coercionarValorCSV(campo, textoValor)
        if (valor !== undefined) valores[campo.clave] = valor
      }

      try {
        await axiosInstance.post(`/dinamico/${entidadClave}/registros`, { valores })
        importados++
      } catch (error) {
        errores.push(`Fila ${index + 2}: ${mensajeError(error, 'error desconocido')}`)
      }
    }

    setImportando(false)
    await cargarRegistros()

    if (errores.length === 0) {
      toast.success(`${importados} registro${importados === 1 ? '' : 's'} importado${importados === 1 ? '' : 's'}`)
    } else {
      toast.error(
        `${importados} importados, ${errores.length} con error. Primero: ${errores[0]}`,
      )
    }
  }

  if (cargandoMeta) {
    return <CargandoPantalla minHeight={300} />
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
          {puedeCrear && (
            <>
              <input
                ref={inputImportarRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) importarCSV(file)
                  e.target.value = ''
                }}
              />
              <button
                type="button"
                onClick={() => inputImportarRef.current?.click()}
                disabled={importando}
                className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-50"
              >
                {importando ? <Spinner size={14} /> : <Upload size={14} />}
                {importando ? 'Importando…' : 'Importar CSV'}
              </button>
              <PrimaryButton type="button" onClick={() => (mostrarForm ? cancelar() : abrirNuevo())}>
                {mostrarForm ? 'Cancelar' : 'Nuevo'}
              </PrimaryButton>
            </>
          )}
        </div>
      </div>

      {mostrarForm && (
        <form
          onSubmit={onSubmit}
          className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)] p-4 sm:p-6"
        >
          <p className="mb-3 text-sm font-semibold text-[var(--color-text)]">
            {editando ? `Editar ${entidad.nombre.toLowerCase()}` : `Nuevo ${entidad.nombre.toLowerCase()}`}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {campos.map((campo) => (
              <CampoInput
                key={campo.clave}
                campo={campo}
                register={register}
                watch={watch}
                setValue={setValue}
                errors={errors}
              />
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2">
            <PrimaryButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando…' : editando ? 'Guardar cambios' : 'Guardar'}
            </PrimaryButton>
            <button
              type="button"
              onClick={cancelar}
              className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]"
            >
              Cancelar
            </button>
          </div>
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
              <tr
                key={registro.id}
                onClick={() => navigate(`/entidades/${entidadClave}/${registro.id}`)}
                className="cursor-pointer border-t border-[var(--color-border)] hover:bg-[var(--color-bg-hover)]"
              >
                {campos.map((campo) => (
                  <td key={campo.clave} className="px-4 py-2">
                    {formatearValor(campo, registro)}
                  </td>
                ))}
                <td className="px-4 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-3">
                    {puedeEditar && (
                      <button
                        type="button"
                        onClick={() => abrirEdicion(registro)}
                        className="flex items-center gap-1 text-xs text-[var(--color-primario-legible)] hover:underline"
                      >
                        <Pencil size={12} />
                        Editar
                      </button>
                    )}
                    {puedeEliminar && (
                      <button
                        type="button"
                        onClick={() => eliminar(registro)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {pageItems.length === 0 && (
              <tr>
                <td
                  colSpan={campos.length + 1}
                  className="px-4 py-6 text-center text-[var(--color-text-faint)]"
                >
                  {cargandoRegistros ? (
                    <CargandoPantalla minHeight={80} />
                  ) : query ? (
                    'Sin resultados para tu búsqueda'
                  ) : (
                    'Sin registros todavía'
                  )}
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

function formatearValor(campo: CampoDinamico, registro: Registro) {
  if (campo.tipo === 'relacion' && registro.etiquetas?.[campo.clave]) {
    return registro.etiquetas[campo.clave]
  }

  const valor = registro.valores[campo.clave]
  if (valor === null || valor === undefined || valor === '') return '—'
  if (campo.tipo === 'imagen' && typeof valor === 'string') {
    return <img src={valor} alt="" className="h-8 w-8 rounded object-cover" />
  }
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No'
  return String(valor)
}
