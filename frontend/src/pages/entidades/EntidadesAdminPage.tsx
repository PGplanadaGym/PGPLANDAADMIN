import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { axiosInstance } from '../../lib/axios'
import { mensajeError } from '../../lib/errores'
import { useEntidades, type TipoCampo } from '../../providers/entidadesContext'
import { useConfirm } from '../../components/ui/ConfirmDialog'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { Spinner } from '../../components/ui/Spinner'
import { CargandoPantalla } from '../../components/ui/CargandoPantalla'

const TIPOS_CAMPO: { value: TipoCampo; label: string }[] = [
  { value: 'texto', label: 'Texto' },
  { value: 'numero', label: 'Número' },
  { value: 'fecha', label: 'Fecha' },
  { value: 'booleano', label: 'Sí/No' },
  { value: 'select', label: 'Lista de opciones' },
]

interface CampoListItem {
  id: string
  clave: string
  etiqueta: string
  tipo: TipoCampo
  requerido: boolean
  opciones: string[] | null
  orden: number
}

interface EntidadListItem {
  id: string
  clave: string
  nombre: string
  campos: CampoListItem[]
}

interface CampoForm {
  clave: string
  etiqueta: string
  tipo: TipoCampo
  requerido: boolean
  opciones: string
}

function slugificar(texto: string) {
  return texto
    .toLowerCase()
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function campoVacio(): CampoForm {
  return { clave: '', etiqueta: '', tipo: 'texto', requerido: false, opciones: '' }
}

export function EntidadesAdminPage() {
  const navigate = useNavigate()
  const { refetch: refetchEntidadesNav } = useEntidades()
  const { confirmar, dialog } = useConfirm()

  const [entidades, setEntidades] = useState<EntidadListItem[]>([])
  const [cargando, setCargando] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoClave, setEditandoClave] = useState<string | null>(null)

  const [clave, setClave] = useState('')
  const [claveEditadaManualmente, setClaveEditadaManualmente] = useState(false)
  const [nombre, setNombre] = useState('')
  const [campos, setCampos] = useState<CampoForm[]>([campoVacio()])
  const [guardando, setGuardando] = useState(false)
  const [eliminandoClave, setEliminandoClave] = useState<string | null>(null)

  const cargar = async () => {
    setCargando(true)
    try {
      const { data } = await axiosInstance.get<EntidadListItem[]>('/entidades-dinamicas')
      setEntidades(data)
    } catch {
      toast.error('No se pudieron cargar las entidades')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  const cambiarNombre = (valor: string) => {
    setNombre(valor)
    if (!claveEditadaManualmente) setClave(slugificar(valor))
  }

  const actualizarCampo = (index: number, cambios: Partial<CampoForm>) => {
    setCampos((prev) => prev.map((c, i) => (i === index ? { ...c, ...cambios } : c)))
  }

  const cambiarEtiquetaCampo = (index: number, etiqueta: string) => {
    setCampos((prev) =>
      prev.map((c, i) => (i === index ? { ...c, etiqueta, clave: slugificar(etiqueta) } : c)),
    )
  }

  const agregarCampo = () => setCampos((prev) => [...prev, campoVacio()])
  const quitarCampo = (index: number) =>
    setCampos((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev))

  const resetForm = () => {
    setClave('')
    setClaveEditadaManualmente(false)
    setNombre('')
    setCampos([campoVacio()])
    setEditandoClave(null)
  }

  const abrirCreacion = () => {
    resetForm()
    setMostrarForm(true)
  }

  const cerrarForm = () => {
    resetForm()
    setMostrarForm(false)
  }

  const iniciarEdicion = (entidad: EntidadListItem) => {
    setEditandoClave(entidad.clave)
    setClave(entidad.clave)
    setClaveEditadaManualmente(true)
    setNombre(entidad.nombre)
    setCampos(
      [...entidad.campos]
        .sort((a, b) => a.orden - b.orden)
        .map((c) => ({
          clave: c.clave,
          etiqueta: c.etiqueta,
          tipo: c.tipo,
          requerido: c.requerido,
          opciones: (c.opciones ?? []).join(', '),
        })),
    )
    setMostrarForm(true)
  }

  const campoInvalido = (c: CampoForm) =>
    !c.clave.trim() || !c.etiqueta.trim() || (c.tipo === 'select' && !c.opciones.trim())

  const clavesCampos = campos.map((c) => c.clave)
  const hayClavesDuplicadas = new Set(clavesCampos).size !== clavesCampos.length

  const formInvalido =
    !clave.trim() ||
    !nombre.trim() ||
    campos.length === 0 ||
    campos.some(campoInvalido) ||
    hayClavesDuplicadas

  const guardarEntidad = async () => {
    if (formInvalido) return
    setGuardando(true)
    try {
      const camposPayload = campos.map((c, index) => ({
        clave: c.clave,
        etiqueta: c.etiqueta,
        tipo: c.tipo,
        requerido: c.requerido,
        opciones:
          c.tipo === 'select'
            ? c.opciones
                .split(',')
                .map((o) => o.trim())
                .filter(Boolean)
            : undefined,
        orden: index,
      }))

      if (editandoClave) {
        await axiosInstance.patch(`/entidades-dinamicas/${editandoClave}`, {
          nombre,
          campos: camposPayload,
        })
        toast.success(`Entidad «${nombre}» actualizada`)
        cerrarForm()
        await Promise.all([cargar(), refetchEntidadesNav()])
      } else {
        await axiosInstance.post('/entidades-dinamicas', { clave, nombre, campos: camposPayload })
        toast.success(`Entidad «${nombre}» creada`)
        const claveCreada = clave
        cerrarForm()
        await Promise.all([cargar(), refetchEntidadesNav()])
        navigate(`/entidades/${claveCreada}`)
      }
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo guardar la entidad'))
    } finally {
      setGuardando(false)
    }
  }

  const eliminarEntidad = async (entidad: EntidadListItem) => {
    const confirmado = await confirmar(
      `Eliminar «${entidad.nombre}»`,
      'Se borra la entidad, sus campos y TODOS sus registros guardados. Esta acción no se puede deshacer.',
    )
    if (!confirmado) return

    setEliminandoClave(entidad.clave)
    try {
      await axiosInstance.delete(`/entidades-dinamicas/${entidad.clave}`)
      toast.success(`Entidad «${entidad.nombre}» eliminada`)
      if (editandoClave === entidad.clave) cerrarForm()
      await Promise.all([cargar(), refetchEntidadesNav()])
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo eliminar la entidad'))
    } finally {
      setEliminandoClave(null)
    }
  }

  return (
    <div>
      {dialog}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text)]">Entidades dinámicas</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Crea tus propias secciones (ej. mascotas, vehículos, equipos) con los campos que
            necesites, sin escribir código. Cada una aparece sola en el menú con su propio CRUD.
          </p>
        </div>
        <PrimaryButton type="button" onClick={mostrarForm ? cerrarForm : abrirCreacion}>
          {mostrarForm ? 'Cancelar' : 'Nueva entidad'}
        </PrimaryButton>
      </div>

      {mostrarForm && (
        <div className="mt-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)] p-4 sm:p-6">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">
            {editandoClave ? `Editando «${nombre}»` : 'Nueva entidad'}
          </h2>

          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                value={nombre}
                onChange={(e) => cambiarNombre(e.target.value)}
                placeholder="Ej: Mascotas"
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                Clave (identificador único) <span className="text-red-500">*</span>
              </label>
              <input
                value={clave}
                disabled={Boolean(editandoClave)}
                onChange={(e) => {
                  setClaveEditadaManualmente(true)
                  setClave(slugificar(e.target.value))
                }}
                placeholder="Ej: mascotas"
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none disabled:cursor-not-allowed disabled:bg-[var(--color-bg-muted)] disabled:text-[var(--color-text-muted)]"
              />
              {editandoClave && (
                <p className="mt-1 text-xs text-[var(--color-text-faint)]">
                  La clave no se puede cambiar una vez creada la entidad.
                </p>
              )}
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[var(--color-text)]">Campos</span>
              <button
                type="button"
                onClick={agregarCampo}
                className="flex items-center gap-1 text-xs text-[var(--color-primario-legible)] hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar campo
              </button>
            </div>

            <div className="mt-2 flex flex-col gap-3">
              {campos.map((campo, index) => (
                <div
                  key={index}
                  className="flex flex-wrap items-end gap-2 rounded-lg border border-[var(--color-border)] p-3"
                >
                  <div className="min-w-[140px] flex-1">
                    <label className="mb-1 block text-xs text-[var(--color-text-muted)]">
                      Etiqueta
                    </label>
                    <input
                      value={campo.etiqueta}
                      onChange={(e) => cambiarEtiquetaCampo(index, e.target.value)}
                      placeholder="Ej: Raza"
                      className="w-full rounded-lg border border-[var(--color-border)] px-2 py-1.5 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                    />
                  </div>
                  <div className="w-36">
                    <label className="mb-1 block text-xs text-[var(--color-text-muted)]">
                      Tipo
                    </label>
                    <select
                      value={campo.tipo}
                      onChange={(e) => actualizarCampo(index, { tipo: e.target.value as TipoCampo })}
                      className="w-full rounded-lg border border-[var(--color-border)] px-2 py-1.5 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                    >
                      {TIPOS_CAMPO.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {campo.tipo === 'select' && (
                    <div className="min-w-[160px] flex-1">
                      <label className="mb-1 block text-xs text-[var(--color-text-muted)]">
                        Opciones (separadas por coma)
                      </label>
                      <input
                        value={campo.opciones}
                        onChange={(e) => actualizarCampo(index, { opciones: e.target.value })}
                        placeholder="Perro, Gato, Otro"
                        className="w-full rounded-lg border border-[var(--color-border)] px-2 py-1.5 text-sm focus:border-[var(--color-primario)] focus:outline-none"
                      />
                    </div>
                  )}
                  <label className="flex items-center gap-1.5 pb-2 text-xs text-[var(--color-text)]">
                    <input
                      type="checkbox"
                      checked={campo.requerido}
                      onChange={(e) => actualizarCampo(index, { requerido: e.target.checked })}
                    />
                    Requerido
                  </label>
                  <button
                    type="button"
                    onClick={() => quitarCampo(index)}
                    disabled={campos.length === 1}
                    className="rounded p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-30"
                    aria-label="Quitar campo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            {editandoClave && (
              <p className="mt-2 text-xs text-[var(--color-text-faint)]">
                Si quitas o le cambias la etiqueta a un campo existente, los datos ya guardados con
                la clave anterior dejan de mostrarse (no se borran de la base).
              </p>
            )}
            {hayClavesDuplicadas && (
              <p className="mt-2 text-xs text-red-600">
                Hay dos campos con la misma etiqueta/clave — cámbiales el nombre para poder guardar.
              </p>
            )}
          </div>

          <PrimaryButton
            type="button"
            onClick={guardarEntidad}
            disabled={guardando || formInvalido}
            className="mt-5 flex items-center gap-2"
          >
            {guardando && <Spinner size={14} />}
            {guardando ? 'Guardando…' : editandoClave ? 'Guardar cambios' : 'Crear entidad'}
          </PrimaryButton>
        </div>
      )}

      <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-2">Nombre</th>
              <th className="px-4 py-2">Clave</th>
              <th className="px-4 py-2">Campos</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {entidades.map((entidad) => (
              <tr key={entidad.id} className="border-t border-[var(--color-border)]">
                <td className="px-4 py-2">{entidad.nombre}</td>
                <td className="px-4 py-2 text-[var(--color-text-muted)]">{entidad.clave}</td>
                <td className="px-4 py-2 text-[var(--color-text-muted)]">{entidad.campos.length}</td>
                <td className="px-4 py-2 text-right">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => navigate(`/entidades/${entidad.clave}`)}
                      className="rounded px-2 py-1 text-xs text-[var(--color-primario-legible)] hover:bg-[var(--color-bg-subtle)]"
                    >
                      Ver registros
                    </button>
                    <button
                      type="button"
                      onClick={() => iniciarEdicion(entidad)}
                      className="rounded p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)]"
                      aria-label={`Editar ${entidad.nombre}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => eliminarEntidad(entidad)}
                      disabled={eliminandoClave === entidad.clave}
                      className="rounded p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-40"
                      aria-label={`Eliminar ${entidad.nombre}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {entidades.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-[var(--color-text-faint)]">
                  {cargando ? <CargandoPantalla minHeight={80} /> : 'Sin entidades todavía'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
