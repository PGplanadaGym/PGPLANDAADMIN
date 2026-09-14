import { useEffect, useState } from 'react'
import { useForm } from '@refinedev/react-hook-form'
import type { HttpError } from '@refinedev/core'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { axiosInstance } from '../../lib/axios'
import { PrimaryButton } from '../../components/ui/PrimaryButton'

const usuarioSchema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
})

type UsuarioValues = z.infer<typeof usuarioSchema>

interface Rol {
  id: string
  empresaId: string | null
  nombre: string
}

export function UsuariosCreatePage() {
  const navigate = useNavigate()
  const [roles, setRoles] = useState<Rol[]>([])
  const [rolIds, setRolIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    axiosInstance
      .get<Rol[]>('/roles')
      .then(({ data }) => setRoles(data.filter((r) => r.empresaId !== null)))
      .catch(() => {
        /* si no tiene permiso para ver roles, se puede invitar igual sin asignar uno */
      })
  }, [])

  const alternarRol = (rolId: string) => {
    setRolIds((prev) => {
      const nuevo = new Set(prev)
      if (nuevo.has(rolId)) nuevo.delete(rolId)
      else nuevo.add(rolId)
      return nuevo
    })
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    refineCore: { onFinish },
  } = useForm<UsuarioValues, HttpError, UsuarioValues>({
    resolver: zodResolver(usuarioSchema),
    refineCoreProps: {
      resource: 'usuarios',
      action: 'create',
      successNotification: () => ({
        type: 'success',
        message: 'Invitación enviada por email',
      }),
      errorNotification: (error) => ({
        type: 'error',
        message: error?.message ?? 'No se pudo crear el usuario',
      }),
    },
  })

  return (
    <div className="max-w-md">
      <h1 className="text-xl font-bold text-[var(--color-text)]">Nuevo usuario</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Le enviaremos un email para que configure su propia contraseña.
      </p>

      <form
        onSubmit={handleSubmit(async (values) => {
          try {
            await onFinish({ ...values, rolIds: [...rolIds] } as UsuarioValues)
            navigate('/usuarios')
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

        {roles.length > 0 && (
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
              Rol (opcional)
            </label>
            <div className="flex flex-col gap-1.5">
              {roles.map((rol) => (
                <label
                  key={rol.id}
                  className="flex items-center gap-2 text-sm text-[var(--color-text)]"
                >
                  <input
                    type="checkbox"
                    checked={rolIds.has(rol.id)}
                    onChange={() => alternarRol(rol.id)}
                  />
                  {rol.nombre}
                </label>
              ))}
            </div>
          </div>
        )}

        <PrimaryButton type="submit" disabled={isSubmitting} className="mt-2">
          {isSubmitting ? 'Enviando invitación…' : 'Invitar usuario'}
        </PrimaryButton>
      </form>
    </div>
  )
}
