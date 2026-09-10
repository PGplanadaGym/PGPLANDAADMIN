import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useGetIdentity } from '@refinedev/core'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil } from 'lucide-react'
import { axiosInstance } from '../../lib/axios'
import { useEntidadMetadata } from '../../hooks/useEntidadMetadata'
import { useConfirm } from '../../components/ui/ConfirmDialog'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { CargandoPantalla } from '../../components/ui/CargandoPantalla'
import { buildAbility } from '../../ability/ability'
import { mensajeError } from '../../lib/errores'
import type { Identity } from '../../lib/identity'
import { buildEntidadSchema } from '../../components/entidad-crud/schema'
import { CampoInput } from '../../components/entidad-crud/CampoInput'

interface Registro {
  id: string
  valores: Record<string, unknown>
  etiquetas?: Record<string, string>
  creadoEn: string
}

export function RegistroDetallePage() {
  const { entidadClave, id } = useParams<{ entidadClave: string; id: string }>()
  const navigate = useNavigate()
  const { entidad, loading: cargandoMeta } = useEntidadMetadata(entidadClave ?? '')
  const { confirmar, dialog } = useConfirm()
  const { data: identity } = useGetIdentity<Identity>()

  const [registro, setRegistro] = useState<Registro | null>(null)
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState(false)

  const ability = useMemo(() => buildAbility(identity?.permisos ?? []), [identity?.permisos])
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

  const cargarRegistro = () => {
    if (!entidadClave || !id) return
    setCargando(true)
    axiosInstance
      .get<Registro>(`/dinamico/${entidadClave}/registros/${id}`)
      .then(({ data }) => setRegistro(data))
      .catch(() => setRegistro(null))
      .finally(() => setCargando(false))
  }

  useEffect(() => {
    cargarRegistro()
    setEditando(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entidadClave, id])

  const abrirEdicion = () => {
    if (!registro) return
    reset(registro.valores)
    setEditando(true)
  }

  const onSubmit = handleSubmit(async (valores) => {
    if (!entidadClave || !id) return
    try {
      await axiosInstance.patch(`/dinamico/${entidadClave}/registros/${id}`, { valores })
      toast.success(`${entidad?.nombre ?? 'Registro'} actualizado`)
      setEditando(false)
      cargarRegistro()
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo guardar el registro'))
    }
  })

  const eliminar = async () => {
    if (!entidadClave || !id) return
    const confirmado = await confirmar(
      'Eliminar registro',
      '¿Seguro que quieres eliminarlo? Esta acción no se puede deshacer.',
    )
    if (!confirmado) return

    try {
      await axiosInstance.delete(`/dinamico/${entidadClave}/registros/${id}`)
      toast.success('Registro eliminado')
      navigate(`/entidades/${entidadClave}`)
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo eliminar el registro'))
    }
  }

  if (!entidadClave || !id) return null

  if (cargandoMeta || cargando) {
    return <CargandoPantalla minHeight={300} />
  }

  if (!entidad || !registro) {
    return (
      <div>
        <Link
          to={`/entidades/${entidadClave}`}
          className="flex items-center gap-1 text-sm text-[var(--color-primario-legible)] hover:underline"
        >
          <ArrowLeft size={14} />
          Volver
        </Link>
        <p className="mt-3 text-sm text-red-600">Registro no encontrado</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      {dialog}

      <Link
        to={`/entidades/${entidadClave}`}
        className="flex items-center gap-1 text-sm text-[var(--color-primario-legible)] hover:underline"
      >
        <ArrowLeft size={14} />
        {entidad.nombre}
      </Link>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-[var(--color-text)]">
          {campos[0] ? formatearValor(registro, campos[0].clave) : 'Detalle'}
        </h1>
        <div className="flex items-center gap-2">
          {puedeEditar && !editando && (
            <button
              type="button"
              onClick={abrirEdicion}
              className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]"
            >
              <Pencil size={14} />
              Editar
            </button>
          )}
          {puedeEliminar && (
            <button
              type="button"
              onClick={eliminar}
              className="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
            >
              Eliminar
            </button>
          )}
        </div>
      </div>

      {editando ? (
        <form
          onSubmit={onSubmit}
          className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)] p-4 sm:p-6"
        >
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
              {isSubmitting ? 'Guardando…' : 'Guardar cambios'}
            </PrimaryButton>
            <button
              type="button"
              onClick={() => setEditando(false)}
              className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)] p-4 sm:p-6">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {campos.map((campo) => (
              <div key={campo.clave}>
                <dt className="text-xs font-medium text-[var(--color-text-muted)]">{campo.etiqueta}</dt>
                <dd className="mt-0.5 text-sm text-[var(--color-text)]">
                  {campo.tipo === 'imagen' && typeof registro.valores[campo.clave] === 'string' && registro.valores[campo.clave] ? (
                    <img
                      src={registro.valores[campo.clave] as string}
                      alt=""
                      className="h-20 w-20 rounded object-cover"
                    />
                  ) : (
                    formatearValor(registro, campo.clave)
                  )}
                </dd>
              </div>
            ))}
            <div>
              <dt className="text-xs font-medium text-[var(--color-text-muted)]">Creado</dt>
              <dd className="mt-0.5 text-sm text-[var(--color-text)]">
                {new Date(registro.creadoEn).toLocaleString()}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  )
}

function formatearValor(registro: Registro, clave: string) {
  const etiqueta = registro.etiquetas?.[clave]
  if (etiqueta) return etiqueta

  const valor = registro.valores[clave]
  if (valor === null || valor === undefined || valor === '') return '—'
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No'
  return String(valor)
}
