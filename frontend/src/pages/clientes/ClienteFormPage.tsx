import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CanAccess } from '@refinedev/core'
import { toast } from 'sonner'
import { axiosInstance } from '../../lib/axios'
import { useSucursalActiva, type SucursalBasica } from '../../hooks/useSucursalActiva'
import { normalizarTexto, sinEspacios, soloLetras, soloDigitos } from '../../lib/validacionInputs'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { Spinner } from '../../components/ui/Spinner'
import { CargandoPantalla } from '../../components/ui/CargandoPantalla'
import { ImageUploadField } from '../../components/ui/ImageUploadField'

interface ClienteDetalle {
  nombres: string
  apellidos: string
  email: string | null
  telefono: string | null
  notas: string | null
  etiqueta: string | null
  fotoUrl: string | null
  sexo: string | null
  sucursal: SucursalBasica | null
}

const SUGERENCIAS_ETIQUETA = ['VIP', 'Frecuente', 'Nuevo']
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
  const { puedeVerTodasSucursales: puedeElegirSucursal, sucursales, sucursalIdPorDefecto } =
    useSucursalActiva()

  const [cargando, setCargando] = useState(!esNuevo)
  const [guardando, setGuardando] = useState(false)

  const [nombres, setNombres] = useState('')
  const [apellidos, setApellidos] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [notas, setNotas] = useState('')
  const [etiqueta, setEtiqueta] = useState('')
  const [fotoUrl, setFotoUrl] = useState('')
  const [sexo, setSexo] = useState('')
  const [sucursalId, setSucursalId] = useState('')

  const [errorNombres, setErrorNombres] = useState('')
  const [errorApellidos, setErrorApellidos] = useState('')
  const [errorEmail, setErrorEmail] = useState('')
  const [errorSucursal, setErrorSucursal] = useState('')

  // Precarga la sucursal activa (o la propia del usuario) como valor por defecto al crear —
  // sin pisar una elección manual que ya haya hecho.
  useEffect(() => {
    if (esNuevo && !sucursalId && sucursalIdPorDefecto) {
      setSucursalId(sucursalIdPorDefecto)
    }
  }, [esNuevo, sucursalId, sucursalIdPorDefecto])

  useEffect(() => {
    if (esNuevo || !id) return
    axiosInstance
      .get<ClienteDetalle>(`/clientes/${id}`)
      .then(({ data }) => {
        setNombres(data.nombres)
        setApellidos(data.apellidos)
        setEmail(data.email ?? '')
        setTelefono(data.telefono ?? '')
        setNotas(data.notas ?? '')
        setEtiqueta(data.etiqueta ?? '')
        setFotoUrl(data.fotoUrl ?? '')
        setSexo(data.sexo ?? '')
        setSucursalId(data.sucursal?.id ?? '')
      })
      .catch(() => toast.error('No se pudo cargar el cliente'))
      .finally(() => setCargando(false))
  }, [id, esNuevo])

  const validar = () => {
    let valido = true
    if (nombres.trim().length < 2) {
      setErrorNombres('Mínimo 2 caracteres')
      valido = false
    } else {
      setErrorNombres('')
    }
    if (apellidos.trim().length < 2) {
      setErrorApellidos('Mínimo 2 caracteres')
      valido = false
    } else {
      setErrorApellidos('')
    }
    if (email && !REGEX_EMAIL.test(email)) {
      setErrorEmail('Email inválido')
      valido = false
    } else {
      setErrorEmail('')
    }
    if (esNuevo && puedeElegirSucursal && !sucursalId) {
      setErrorSucursal('Selecciona una sucursal')
      valido = false
    } else {
      setErrorSucursal('')
    }
    return valido
  }

  const guardar = async () => {
    if (!validar()) return
    setGuardando(true)
    try {
      const payload = {
        nombres: normalizarTexto(nombres).trim(),
        apellidos: normalizarTexto(apellidos).trim(),
        email: email.trim().toLowerCase() || undefined,
        telefono: telefono || undefined,
        notas: notas || undefined,
        etiqueta: etiqueta || undefined,
        fotoUrl: fotoUrl || undefined,
        sexo: sexo || undefined,
        // Al crear siempre se manda (obligatorio en el servidor; si el usuario no puede elegir
        // sucursal, el backend igual la fuerza a la suya). Al editar solo se manda si puede
        // elegir — si no, no se toca la sucursal del cliente.
        sucursalId:
          esNuevo || puedeElegirSucursal ? sucursalId || sucursalIdPorDefecto || undefined : undefined,
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
        <ImageUploadField
          label="Foto (opcional)"
          value={fotoUrl}
          onChange={setFotoUrl}
          rounded
          permitirCamara
        />

        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
            Nombres
          </label>
          <input
            value={nombres}
            onChange={(e) => setNombres(soloLetras(e.target.value))}
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
          />
          {errorNombres && <p className="mt-1 text-xs text-red-600">{errorNombres}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
            Apellidos
          </label>
          <input
            value={apellidos}
            onChange={(e) => setApellidos(soloLetras(e.target.value))}
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
          />
          {errorApellidos && <p className="mt-1 text-xs text-red-600">{errorApellidos}</p>}
        </div>

        {esNuevo && puedeElegirSucursal && (
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
              Sucursal
            </label>
            <select
              value={sucursalId}
              onChange={(e) => setSucursalId(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
            >
              <option value="">Selecciona una sucursal</option>
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
            {errorSucursal && <p className="mt-1 text-xs text-red-600">{errorSucursal}</p>}
          </div>
        )}
        {esNuevo && !puedeElegirSucursal && (
          <p className="text-xs text-[var(--color-text-faint)]">
            El cliente se creará en tu sucursal.
          </p>
        )}
        {!esNuevo && puedeElegirSucursal && (
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
              Sucursal
            </label>
            <select
              value={sucursalId}
              onChange={(e) => setSucursalId(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
            >
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(sinEspacios(e.target.value))}
            onBlur={() => {
              if (email && !REGEX_EMAIL.test(email)) setErrorEmail('Email inválido')
              else setErrorEmail('')
            }}
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
          />
          {errorEmail && <p className="mt-1 text-xs text-red-600">{errorEmail}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
            Celular
          </label>
          <input
            type="tel"
            inputMode="numeric"
            value={telefono}
            onChange={(e) => setTelefono(soloDigitos(e.target.value).slice(0, 10))}
            maxLength={10}
            placeholder="0993210108"
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
            Sexo (opcional)
          </label>
          <select
            value={sexo}
            onChange={(e) => setSexo(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
          >
            <option value="">Prefiere no decir</option>
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
          </select>
          <p className="mt-1 text-xs text-[var(--color-text-faint)]">
            Solo se usa para calcular el % de grasa corporal en Seguimiento físico.
          </p>
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
