import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { axiosInstance } from '../../lib/axios'
import { PrimaryButton } from '../../components/ui/PrimaryButton'

const schema = z.object({
  email: z.string().email('Email inválido'),
})

type Values = z.infer<typeof schema>

export function ForgotPasswordPage() {
  const [enviado, setEnviado] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) })

  const onSubmit = handleSubmit(async (values) => {
    await axiosInstance.post('/auth/forgot-password', values)
    setEnviado(true)
  })

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)]">
      <div className="w-full max-w-sm rounded-lg bg-[var(--color-bg-card)] p-8 shadow-md">
        <h1 className="text-xl font-bold text-[var(--color-text)]">Recuperar contraseña</h1>

        {enviado ? (
          <>
            <p className="mt-4 text-sm text-[var(--color-text-muted)]">
              Si existe una cuenta con ese email, te enviamos un link para restablecer
              tu contraseña. Revisa tu bandeja de entrada (y spam).
            </p>
            <Link
              to="/login"
              className="mt-6 inline-block text-sm text-[var(--color-text-muted)] hover:underline"
            >
              Volver al login
            </Link>
          </>
        ) : (
          <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-4">
            <p className="text-sm text-[var(--color-text-muted)]">
              Ingresa tu email y te enviamos un link para restablecer tu contraseña.
            </p>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                Email
              </label>
              <input
                type="email"
                {...register('email')}
                className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>

            <PrimaryButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Enviando…' : 'Enviar link de recuperación'}
            </PrimaryButton>

            <Link to="/login" className="text-center text-sm text-[var(--color-text-muted)] hover:underline">
              Volver al login
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
