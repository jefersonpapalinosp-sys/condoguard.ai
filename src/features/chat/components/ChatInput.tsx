import { type FormEvent, type KeyboardEvent, useEffect, useRef } from 'react';

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  disabled: boolean;
};

export function ChatInput({ value, onChange, onSubmit, disabled }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canSend = value.trim().length > 0 && !disabled;

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSend) {
        e.currentTarget.form?.requestSubmit();
      }
    }
  }

  return (
    <form onSubmit={onSubmit} className="relative flex items-end gap-2">
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pergunte sobre alertas, faturas, consumo… (Enter para enviar)"
          disabled={disabled}
          className="w-full resize-none rounded-2xl border border-outline-variant/30 bg-surface-container-highest px-4 py-3 pr-12 text-sm outline-none placeholder:text-on-surface-variant/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 disabled:opacity-50 transition-colors leading-relaxed"
          style={{ minHeight: '48px', maxHeight: '160px' }}
        />
        {value.length > 0 && !disabled && (
          <span className="absolute bottom-3 right-3 text-[10px] text-on-surface-variant/40 pointer-events-none select-none">
            {value.length}
          </span>
        )}
      </div>
      <button
        type="submit"
        disabled={!canSend}
        title="Enviar mensagem"
        className="shrink-0 flex items-center justify-center h-12 w-12 rounded-2xl bg-primary text-on-primary shadow-sm disabled:opacity-35 hover:opacity-90 active:scale-95 transition-all"
      >
        <span className="material-symbols-outlined text-[20px]">send</span>
      </button>
    </form>
  );
}
