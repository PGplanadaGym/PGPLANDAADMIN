import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useGetIdentity } from '@refinedev/core'
import { axiosInstance } from '../../lib/axios'
import { aplicarColorPrimario } from '../../lib/theme'
import type { Identity } from '../../lib/identity'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { ImageUploadField } from '../../components/ui/ImageUploadField'

const empresaSchema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  logoUrl: z.string().optional(),
  colorPrimario: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Formato hex, ej. #0F172A')
    .optional()
    .or(z.literal('')),
})

type EmpresaValues = z.infer<typeof empresaSchema>

export function EmpresaPage() {
  const { data: identity } = useGetIdentity<Identity>()
  const [cargando, setCargando] = useState(true)
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EmpresaValues>({ resolver: zodResolver(empresaSchema) })

  const colorActual = watch('colorPrimario')

  useEffect(() => {
    if (!identity?.empresaId) return
    axiosInstance
      .get(`/empresas/${identity.empresaId}`)
      .then(({ data }) => {
        reset({
          nombre: data.nombre ?? '',
          logoUrl: data.logoUrl ?? '',
          colorPrimario: data.colorPrimario ?? '',
        })
      })
      .finally(() => setCargando(false))
  }, [identity?.empresaId, reset])

  const onSubmit = handleSubmit(async (values) => {
    if (!identity?.empresaId) return
    try {
      await axiosInstance.patch(`/empresas/${identity.empresaId}`, {
        nombre: values.nombre,
        logoUrl: values.logoUrl || null,
        colorPrimario: values.colorPrimario || null,
      })
      toast.success('Empresa actualizada')
      aplicarColorPrimario(values.colorPrimario)
      // recarga para refrescar el logo/color en toda la app (sidebar, login, etc.)
      window.location.reload()
    } catch {
      toast.error('No se pudo actualizar la empresa')
    }
  })

  if (cargando) {
    return <p className="text-sm text-[var(--color-text-faint)]">Cargando…</p>
  }

  return (
    <div className="max-w-md">
      <h1 className="text-xl font-bold text-[var(--color-text)]">Mi empresa</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Este nombre, logo y color se ven en el sidebar y en la pantalla de login.
      </p>

      <form
        onSubmit={onSubmit}
        className="mt-4 flex flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)] p-6"
      >
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

        <ImageUploadField
          label="Logo"
          value={watch('logoUrl')}
          onChange={(url) => setValue('logoUrl', url, { shouldDirty: true })}
        />

        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
            Color primario
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(colorActual ?? '') ? colorActual : '#0f172a'}
              onChange={(e) =>
                setValue('colorPrimario', e.target.value, { shouldDirty: true })
              }
              className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-[var(--color-border)]"
            />
            <input
              {...register('colorPrimario')}
              placeholder="#0F172A"
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
            />
          </div>
          {errors.colorPrimario && (
            <p className="mt-1 text-xs text-red-600">{errors.colorPrimario.message}</p>
          )}
        </div>

        <PrimaryButton type="submit" disabled={isSubmitting} className="mt-2">
          {isSubmitting ? 'Guardando…' : 'Guardar cambios'}
        </PrimaryButton>
      </form>
    </div>
  )
}
