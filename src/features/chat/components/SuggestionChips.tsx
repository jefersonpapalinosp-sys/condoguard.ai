import type { ChatSuggestion } from '../../../services/mockApi';

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
          className="px-4 py-2 rounded-full text-xs font-bold bg-surface-container-highest hover:opacity-80 transition-opacity"
        >
          {item.label}
        </button>
      ))}
    </section>
  );
}
