import { useState, type ChangeEvent } from 'react'
import { toast } from 'sonner'
import { axiosInstance } from '../../lib/axios'
import { mensajeError } from '../../lib/errores'

interface Props {
  label: string
  value?: string | null
  onChange: (url: string) => void
  rounded?: boolean
}

export function ImageUploadField({ label, value, onChange, rounded }: Props) {
  const [subiendo, setSubiendo] = useState(false)

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

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
      e.target.value = ''
    }
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">{label}</label>
      <div className="flex items-center gap-3">
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
    </div>
  )
}
