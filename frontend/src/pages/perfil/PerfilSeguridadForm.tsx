import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { axiosInstance } from '../../lib/axios'
import { PrimaryButton } from '../../components/ui/PrimaryButton'

const schema = z
  .object({
    passwordActual: z.string().min(1, 'Requerido'),
    passwordNueva: z.string().min(6, 'Mínimo 6 caracteres'),
    confirmar: z.string().min(6, 'Mínimo 6 caracteres'),
  })
  .refine((values) => values.passwordNueva === values.confirmar, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmar'],
  })

type Values = z.infer<typeof schema>

export function PerfilSeguridadForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) })

  const onSubmit = handleSubmit(async (values) => {
    try {
      await axiosInstance.patch('/usuarios/me/password', {
        passwordActual: values.passwordActual,
        passwordNueva: values.passwordNueva,
      })
      toast.success('Contraseña actualizada')
      reset()
    } catch (error) {
      const mensaje =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'No se pudo cambiar la contraseña'
      toast.error(mensaje)
    }
  })

  return (
    <form onSubmit={onSubmit} className="flex max-w-sm flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
          Contraseña actual
        </label>
        <input
          type="password"
          {...register('passwordActual')}
          className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
        />
        {errors.passwordActual && (
          <p className="mt-1 text-xs text-red-600">{errors.passwordActual.message}</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
          Contraseña nueva
        </label>
        <input
          type="password"
          {...register('passwordNueva')}
          className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
        />
        {errors.passwordNueva && (
          <p className="mt-1 text-xs text-red-600">{errors.passwordNueva.message}</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
          Confirmar contraseña nueva
        </label>
        <input
          type="password"
          {...register('confirmar')}
          className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
        />
        {errors.confirmar && (
          <p className="mt-1 text-xs text-red-600">{errors.confirmar.message}</p>
        )}
      </div>

      <PrimaryButton type="submit" disabled={isSubmitting} className="self-start">
        {isSubmitting ? 'Guardando…' : 'Cambiar contraseña'}
      </PrimaryButton>
    </form>
  )
}
