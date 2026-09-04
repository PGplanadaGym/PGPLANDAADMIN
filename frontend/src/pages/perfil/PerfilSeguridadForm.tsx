import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { axiosInstance } from '../../lib/axios'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { PasswordInput } from '../../components/ui/PasswordInput'
import { PasswordStrengthMeter } from '../../components/ui/PasswordStrengthMeter'

const schema = z
  .object({
    passwordActual: z.string().min(1, 'Requerido'),
    passwordNueva: z.string().min(8, 'Mínimo 8 caracteres'),
    confirmar: z.string().min(8, 'Mínimo 8 caracteres'),
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
    watch,
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
        <PasswordInput {...register('passwordActual')} />
        {errors.passwordActual && (
          <p className="mt-1 text-xs text-red-600">{errors.passwordActual.message}</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
          Contraseña nueva
        </label>
        <PasswordInput {...register('passwordNueva')} />
        <PasswordStrengthMeter password={watch('passwordNueva') ?? ''} />
        {errors.passwordNueva && (
          <p className="mt-1 text-xs text-red-600">{errors.passwordNueva.message}</p>
        )}
        {!errors.passwordNueva && (
          <p className="mt-1 text-xs text-[var(--color-text-faint)]">Mínimo 8 caracteres</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
          Confirmar contraseña nueva
        </label>
        <PasswordInput {...register('confirmar')} />
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
