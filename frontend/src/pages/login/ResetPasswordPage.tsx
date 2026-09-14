import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { axiosInstance } from '../../lib/axios'
import { PrimaryButton } from '../../components/ui/PrimaryButton'
import { PasswordInput } from '../../components/ui/PasswordInput'
import { PasswordStrengthMeter } from '../../components/ui/PasswordStrengthMeter'

const schema = z
  .object({
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    confirmar: z.string().min(8, 'Mínimo 8 caracteres'),
  })
  .refine((values) => values.password === values.confirmar, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmar'],
  })

type Values = z.infer<typeof schema>

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) })

  const onSubmit = handleSubmit(async (values) => {
    if (!token) return
    try {
      await axiosInstance.post('/auth/reset-password', {
        token,
        password: values.password,
      })
      toast.success('Contraseña actualizada, ya puedes iniciar sesión')
      navigate('/login')
    } catch {
      toast.error('El link es inválido o ya venció. Solicita uno nuevo.')
    }
  })

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)]">
        <div className="w-full max-w-sm rounded-lg bg-[var(--color-bg-card)] p-8 text-center shadow-md">
          <p className="text-sm text-red-600">Este link no es válido.</p>
          <Link
            to="/forgot-password"
            className="mt-4 inline-block text-sm text-[var(--color-text-muted)] hover:underline"
          >
            Solicitar uno nuevo
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)]">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-lg bg-[var(--color-bg-card)] p-8 shadow-md"
      >
        <h1 className="text-xl font-bold text-[var(--color-text)]">Nueva contraseña</h1>

        <div className="mt-6 flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
              Contraseña nueva
            </label>
            <PasswordInput {...register('password')} />
            <PasswordStrengthMeter password={watch('password') ?? ''} />
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
            )}
            {!errors.password && (
              <p className="mt-1 text-xs text-[var(--color-text-faint)]">Mínimo 8 caracteres</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
              Confirmar contraseña
            </label>
            <PasswordInput {...register('confirmar')} />
            {errors.confirmar && (
              <p className="mt-1 text-xs text-red-600">{errors.confirmar.message}</p>
            )}
          </div>

          <PrimaryButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando…' : 'Restablecer contraseña'}
          </PrimaryButton>
        </div>
      </form>
    </div>
  )
}
