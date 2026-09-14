import { evaluarFortaleza } from '../../lib/passwordStrength'

export function PasswordStrengthMeter({ password }: { password: string }) {
  const fortaleza = evaluarFortaleza(password)
  if (!fortaleza) return null

  return (
    <div className="mt-1.5">
      <div className="flex gap-1">
        {([1, 2, 3, 4] as const).map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-colors"
            style={{
              backgroundColor: i <= fortaleza.score ? fortaleza.color : 'var(--color-bg-muted)',
            }}
          />
        ))}
      </div>
      <p className="mt-1 text-xs" style={{ color: fortaleza.color }}>
        {fortaleza.etiqueta}
      </p>
    </div>
  )
}
