import { useState, type ChangeEvent } from 'react'
import { toast } from 'sonner'
import { Camera } from 'lucide-react'
import { axiosInstance } from '../../lib/axios'
import { mensajeError } from '../../lib/errores'
import { CapturaCamaraModal } from './CapturaCamaraModal'

interface Props {
  label: string
  value?: string | null
  onChange: (url: string) => void
  rounded?: boolean
  /** Además de subir un archivo, deja tomar la foto con la cámara del dispositivo. */
  permitirCamara?: boolean
}

export function ImageUploadField({ label, value, onChange, rounded, permitirCamara }: Props) {
  const [subiendo, setSubiendo] = useState(false)
  const [mostrarCamara, setMostrarCamara] = useState(false)

  const subirArchivo = async (file: File) => {
    setSubiendo(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await axiosInstance.post<{ url: string }>(
        '/uploads/imagen',
        formData,
      )
      onChange(data.url)
      toast.success('Imagen subida')
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo subir la imagen (máx. 5MB, formato imagen)'))
    } finally {
      setSubiendo(false)
    }
  }

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await subirArchivo(file)
    e.target.value = ''
  }

  const handleCapturada = async (file: File) => {
    setMostrarCamara(false)
    await subirArchivo(file)
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">{label}</label>
      <div className="flex flex-wrap items-center gap-3">
        {value ? (
          <img
            src={value}
            alt=""
            className={`h-14 w-14 object-cover ${rounded ? 'rounded-full' : 'rounded'}`}
          />
        ) : (
          <div
            className={`h-14 w-14 bg-[var(--color-bg)] ${rounded ? 'rounded-full' : 'rounded'}`}
          />
        )}
        <label className="cursor-pointer rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]">
          {subiendo ? 'Subiendo…' : value ? 'Cambiar imagen' : 'Subir imagen'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={subiendo}
            onChange={handleFile}
          />
        </label>
        {permitirCamara && (
          <button
            type="button"
            onClick={() => setMostrarCamara(true)}
            disabled={subiendo}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)] disabled:opacity-50"
          >
            <Camera size={14} />
            Usar cámara
          </button>
        )}
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            disabled={subiendo}
            className="text-xs text-red-600 hover:underline disabled:opacity-40"
          >
            Quitar
          </button>
        )}
      </div>

      {mostrarCamara && (
        <CapturaCamaraModal onCapturar={handleCapturada} onCerrar={() => setMostrarCamara(false)} />
      )}
    </div>
  )
}
