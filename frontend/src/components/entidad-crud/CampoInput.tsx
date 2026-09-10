import type {
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from 'react-hook-form'
import type { CampoDinamico } from '../../providers/entidadesContext'
import { useOpcionesRelacion } from '../../hooks/useOpcionesRelacion'
import { ImageUploadField } from '../ui/ImageUploadField'

interface Props {
  campo: CampoDinamico
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  watch: UseFormWatch<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setValue: UseFormSetValue<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors: FieldErrors<any>
}

export function CampoInput({ campo, register, watch, setValue, errors }: Props) {
  const { opciones: opcionesRelacion, cargando: cargandoRelacion, error: errorRelacion } =
    useOpcionesRelacion(campo.tipo === 'relacion' ? campo.relacionCon : null)

  if (campo.tipo === 'imagen') {
    return (
      <ImageUploadField
        label={`${campo.etiqueta}${campo.requerido ? ' *' : ''}`}
        value={watch(campo.clave)}
        onChange={(url) => setValue(campo.clave, url, { shouldDirty: true, shouldValidate: true })}
      />
    )
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-[var(--color-text)]">
        {campo.etiqueta}
        {campo.requerido && <span className="text-red-500"> *</span>}
      </label>

      {campo.tipo === 'select' ? (
        <select
          {...register(campo.clave)}
          defaultValue=""
          className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
        >
          <option value="" disabled>
            Selecciona…
          </option>
          {(campo.opciones ?? []).map((opcion) => (
            <option key={opcion} value={opcion}>
              {opcion}
            </option>
          ))}
        </select>
      ) : campo.tipo === 'relacion' ? (
        <select
          {...register(campo.clave)}
          defaultValue=""
          disabled={cargandoRelacion}
          className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none disabled:opacity-50"
        >
          <option value="" disabled>
            {cargandoRelacion ? 'Cargando…' : 'Selecciona…'}
          </option>
          {opcionesRelacion.map((opcion) => (
            <option key={opcion.value} value={opcion.value}>
              {opcion.label}
            </option>
          ))}
        </select>
      ) : campo.tipo === 'booleano' ? (
        <input type="checkbox" {...register(campo.clave)} className="h-4 w-4" />
      ) : (
        <input
          type={campo.tipo === 'numero' ? 'number' : campo.tipo === 'fecha' ? 'date' : 'text'}
          step={campo.tipo === 'numero' ? 'any' : undefined}
          {...register(campo.clave)}
          className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primario)] focus:outline-none"
        />
      )}

      {campo.tipo === 'relacion' && errorRelacion && (
        <p className="mt-1 text-xs text-[var(--color-text-faint)]">
          No se pudieron cargar las opciones (¿tienes acceso a esa sección?)
        </p>
      )}

      {errors[campo.clave] && (
        <p className="mt-1 text-xs text-red-600">{String(errors[campo.clave]?.message)}</p>
      )}
    </div>
  )
}
