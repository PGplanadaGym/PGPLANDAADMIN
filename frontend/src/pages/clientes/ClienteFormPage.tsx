import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CanAccess } from '@refinedev/core'
import { toast } from 'sonner'
import { axiosInstance } from '../../lib/axios'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { Spinner } from '../../components/ui/Spinner'
import { CargandoPantalla } from '../../components/ui/CargandoPantalla'

interface ClienteDetalle {
  nombre: string
  email: string | null
  telefono: string | null
  notas: string | null
  etiqueta: string | null
}

const SUGERENCIAS_ETIQUETA = ['VIP', 'Frecuente', 'Moroso', 'Nuevo']
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function mensajeError(error: unknown, fallback: string) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback
  )
}

export function ClienteFormPage() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const esNuevo = !id

  const [cargando, setCargando] = useState(!esNuevo)
  const [guardando, setGuardando] = useState(false)

  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [notas, setNotas] = useState('')
  const [etiqueta, setEtiqueta] = useState('')

  const [errorNombre, setErrorNombre] = useState('')
  const [errorEmail, setErrorEmail] = useState('')

  useEffect(() => {
    if (esNuevo || !id) return
    axiosInstance
      .get<ClienteDetalle>(`/clientes/${id}`)
      .then(({ data }) => {
        setNombre(data.nombre)
        setEmail(data.email ?? '')
        setTelefono(data.telefono ?? '')
        setNotas(data.notas ?? '')
        setEtiqueta(data.etiqueta ?? '')
      })
      .catch(() => toast.error('No se pudo cargar el cliente'))
      .finally(() => setCargando(false))
  }, [id, esNuevo])

  const validar = () => {
    let valido = true
    if (nombre.trim().length < 2) {
      setErrorNombre('Mínimo 2 caracteres')
      valido = false
    } else {
      setErrorNombre('')
    }
    if (email && !REGEX_EMAIL.test(email)) {
      setErrorEmail('Email inválido')
      valido = false
    } else {
      setErrorEmail('')
    }
    return valido
  }

  const guardar = async () => {
    if (!validar()) return
    setGuardando(true)
    try {
      const payload = {
        nombre,
        email: email || undefined,
        telefono: telefono || undefined,
        notas: notas || undefined,
        etiqueta: etiqueta || undefined,
      }
      if (esNuevo) {
        await axiosInstance.post('/clientes', payload)
        toast.success('Cliente creado')
        navigate('/clientes')
      } else {
        await axiosInstance.patch(`/clientes/${id}`, payload)
        toast.success('Cliente actualizado')
        navigate(`/clientes/${id}`)
      }
    } catch (error) {
      toast.error(
        mensajeError(
          error,
          esNuevo ? 'No se pudo crear el cliente' : 'No se pudo actualizar el cliente',
        ),
      )
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) {
    return <CargandoPantalla minHeight={300} />
  }

  return (
    <div className="max-w-md">
      <h1 className="text-xl font-bold text-[var(--color-text)]">
        {esNuevo ? 'Nuevo cliente' : 'Editar cliente'}
      </h1>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          guardar()
        }}
        className="mt-4 flex flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)] p-6"
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
            Nombre
          </label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
          />
          {errorNombre && <p className="mt-1 text-xs text-red-600">{errorNombre}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
          />
          {errorEmail && <p className="mt-1 text-xs text-red-600">{errorEmail}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
            Teléfono
          </label>
          <input
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
            Etiqueta (opcional)
          </label>
          <input
            list="sugerencias-etiqueta-cliente"
            value={etiqueta}
            onChange={(e) => setEtiqueta(e.target.value)}
            placeholder="Ej: VIP, Frecuente…"
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
          />
          <datalist id="sugerencias-etiqueta-cliente">
            {SUGERENCIAS_ETIQUETA.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
            Notas (opcional)
          </label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={3}
            placeholder="Preferencias, observaciones…"
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
          />
        </div>

        <CanAccess resource="clientes" action={esNuevo ? 'create' : 'edit'}>
          <PrimaryButton
            type="submit"
            disabled={guardando}
            className="mt-2 flex items-center justify-center gap-2"
          >
            {guardando && <Spinner size={14} />}
            {guardando ? 'Guardando…' : esNuevo ? 'Crear cliente' : 'Guardar cambios'}
          </PrimaryButton>
        </CanAccess>
      </form>
    </div>
  )
}
