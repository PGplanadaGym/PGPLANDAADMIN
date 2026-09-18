interface Tab {
  id: string
  label: string
}

interface Props {
  tabs: Tab[]
  value: string
  onChange: (id: string) => void
}

export function Tabs({ tabs, value, onChange }: Props) {
  return (
    <div className="flex gap-1 border-b border-[var(--color-border)]">
      {tabs.map((tab) => {
        const activa = tab.id === value
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              activa
                ? 'border-[var(--color-primario)] text-[var(--color-text)]'
                : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
