interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SearchInput({ value, onChange, placeholder = 'Buscar…' }: Props) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full max-w-xs rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm focus:border-[var(--color-primario)] focus:outline-none"
    />
  )
}
