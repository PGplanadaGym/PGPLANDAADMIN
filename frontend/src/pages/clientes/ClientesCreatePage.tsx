import { useForm } from '@refinedev/react-hook-form'
import type { HttpError } from '@refinedev/core'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { PrimaryButton } from '../../components/ui/PrimaryButton'

const clienteSchema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefono: z.string().optional(),
})

type ClienteValues = z.infer<typeof clienteSchema>

export function ClientesCreatePage() {
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    refineCore: { onFinish },
  } = useForm<ClienteValues, HttpError, ClienteValues>({
    resolver: zodResolver(clienteSchema),
    refineCoreProps: {
      resource: 'clientes',
      action: 'create',
      successNotification: () => ({
        type: 'success',
        message: 'Cliente creado',
      }),
      errorNotification: (error) => ({
        type: 'error',
        message: error?.message ?? 'No se pudo crear el cliente',
      }),
    },
  })

  return (
    <div className="max-w-md">
      <h1 className="text-xl font-bold text-[var(--color-text)]">Nuevo cliente</h1>

      <form
        onSubmit={handleSubmit(async (values) => {
          try {
            await onFinish(values)
            navigate('/clientes')
          } catch {
            // el error ya se muestra vía notificationProvider
          }
        })}
        className="mt-4 flex flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] shadow-[var(--sombra-sm)] p-6"
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
            Nombre
          </label>
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

        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
            Teléfono
          </label>
          <input
            {...register('telefono')}
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
          />
        </div>

        <PrimaryButton type="submit" disabled={isSubmitting} className="mt-2">
          {isSubmitting ? 'Guardando…' : 'Crear cliente'}
        </PrimaryButton>
      </form>
    </div>
  )
}
