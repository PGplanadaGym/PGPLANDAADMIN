import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { axiosInstance } from '../../lib/axios'
import { PAISES, banderaDesdeIso, combinarTelefono, separarTelefono } from '../../lib/paises'
import { ImageUploadField } from '../../components/ui/ImageUploadField'
import { PrimaryButton } from '../../components/ui/PrimaryButton'

export const perfilSchema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  cargo: z.string().max(100).optional(),
  telefono: z.string().max(30).optional(),
  bio: z.string().max(300, 'Máximo 300 caracteres').optional(),
  fotoUrl: z.string().optional(),
})

export type PerfilValues = z.infer<typeof perfilSchema>

interface Props {
  valoresIniciales: PerfilValues
  onGuardado: () => void
}

export function PerfilInfoForm({ valoresIniciales, onGuardado }: Props) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PerfilValues>({
    resolver: zodResolver(perfilSchema),
    values: valoresIniciales,
  })

  const [isoTelefono, setIsoTelefono] = useState(
    () => separarTelefono(valoresIniciales.telefono).iso,
  )
  const [numeroTelefono, setNumeroTelefono] = useState(
    () => separarTelefono(valoresIniciales.telefono).numero,
  )

  useEffect(() => {
    const { iso, numero } = separarTelefono(valoresIniciales.telefono)
    setIsoTelefono(iso)
    setNumeroTelefono(numero)
  }, [valoresIniciales.telefono])

  const actualizarTelefono = (iso: string, numero: string) => {
    setIsoTelefono(iso)
    setNumeroTelefono(numero)
    setValue('telefono', combinarTelefono(iso, numero), { shouldDirty: true })
  }

  const bio = watch('bio') ?? ''

  const onSubmit = handleSubmit(async (values) => {
    try {
      await axiosInstance.patch('/usuarios/me', {
        ...values,
        fotoUrl: values.fotoUrl || null,
      })
      toast.success('Perfil actualizado')
      onGuardado()
    } catch {
      toast.error('No se pudo actualizar el perfil')
    }
  })

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <ImageUploadField
        label="Foto de perfil"
        value={watch('fotoUrl')}
        onChange={(url) => setValue('fotoUrl', url, { shouldDirty: true })}
        rounded
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">Nombre</label>
          <input
            {...register('nombre')}
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
          />
          {errors.nombre && (
            <p className="mt-1 text-xs text-red-600">{errors.nombre.message}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
            Cargo / puesto
          </label>
          <input
            {...register('cargo')}
            placeholder="ej. Gerente de ventas"
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">Teléfono</label>
          <div className="flex gap-2">
            <select
              value={isoTelefono}
              onChange={(e) => actualizarTelefono(e.target.value, numeroTelefono)}
              className="w-24 shrink-0 rounded-lg border border-[var(--color-border)] px-1.5 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
            >
              {PAISES.map((pais) => (
                <option key={pais.iso} value={pais.iso}>
                  {banderaDesdeIso(pais.iso)} {pais.codigo}
                </option>
              ))}
            </select>
            <input
              value={numeroTelefono}
              onChange={(e) => actualizarTelefono(isoTelefono, e.target.value)}
              placeholder="99 999 9999"
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
            />
          </div>
          {errors.telefono && (
            <p className="mt-1 text-xs text-red-600">{errors.telefono.message}</p>
          )}
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="block text-sm font-medium text-[var(--color-text)]">
            Acerca de mí
          </label>
          <span className="text-xs text-[var(--color-text-faint)]">{bio.length}/300</span>
        </div>
        <textarea
          {...register('bio')}
          rows={3}
          placeholder="Una breve descripción sobre ti…"
          className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
        />
        {errors.bio && <p className="mt-1 text-xs text-red-600">{errors.bio.message}</p>}
      </div>

      <PrimaryButton type="submit" disabled={isSubmitting} className="self-start">
        {isSubmitting ? 'Guardando…' : 'Guardar cambios'}
      </PrimaryButton>
    </form>
  )
}
