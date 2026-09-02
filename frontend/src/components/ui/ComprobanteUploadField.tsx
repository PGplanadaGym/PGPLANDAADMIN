import { useState, type ChangeEvent } from 'react'
import { toast } from 'sonner'
import { axiosInstance } from '../../lib/axios'

interface Props {
  value?: string | null
  onChange: (url: string) => void
}

export function ComprobanteUploadField({ value, onChange }: Props) {
  const [subiendo, setSubiendo] = useState(false)

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSubiendo(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await axiosInstance.post<{ url: string }>(
        '/uploads/comprobante',
        formData,
      )
      onChange(data.url)
      toast.success('Comprobante adjuntado')
    } catch {
      toast.error('No se pudo subir el archivo (máx. 5MB, imagen o PDF)')
    } finally {
      setSubiendo(false)
      e.target.value = ''
    }
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
        Comprobante (opcional)
      </label>
      <div className="flex items-center gap-3">
        {value && (
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-[var(--color-primario-legible)] hover:underline"
          >
            Ver archivo
          </a>
        )}
        <label className="cursor-pointer rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-subtle)]">
          {subiendo ? 'Subiendo…' : value ? 'Cambiar archivo' : 'Adjuntar foto o PDF'}
          <input
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            disabled={subiendo}
            onChange={handleFile}
          />
        </label>
      </div>
    </div>
  )
}
