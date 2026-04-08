import type { ChatSuggestion } from '../../../services/mockApi';

const CHIP_ICONS: Record<string, string> = {
  'Faturas vencidas': 'receipt_long',
  'Alertas críticos': 'warning',
  'Consumo de energia': 'bolt',
  'Plano de ação': 'checklist',
};

function getIcon(label: string): string {
  for (const [key, icon] of Object.entries(CHIP_ICONS)) {
    if (label.toLowerCase().includes(key.toLowerCase().split(' ')[0])) return icon;
  }
  return 'auto_awesome';
}

type Props = {
  suggestions: ChatSuggestion[];
  onSelect: (prompt: string) => void;
};

export function SuggestionChips({ suggestions, onSelect }: Props) {
  if (suggestions.length === 0) return null;

  return (
    <section className="flex flex-wrap gap-2">
      {suggestions.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item.prompt)}
          className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/30 bg-surface-container-highest px-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface hover:border-primary/30 active:scale-95 transition-all"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[13px] text-primary/70">
            {getIcon(item.label)}
          </span>
          {item.label}
        </button>
      ))}
    </section>
  );
}
