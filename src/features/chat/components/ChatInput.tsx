import type { FormEvent } from 'react';

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  disabled: boolean;
};

export function ChatInput({ value, onChange, onSubmit, disabled }: Props) {
  const canSend = value.trim().length > 0 && !disabled;

  return (
    <form onSubmit={onSubmit} className="flex gap-3">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Digite uma pergunta sobre alertas, consumo ou faturas..."
        className="flex-1 bg-surface-container-highest rounded-xl px-4 py-3 outline-none"
        disabled={disabled}
      />
      <button
        type="submit"
        disabled={!canSend}
        className="px-5 py-3 rounded-xl bg-primary text-on-primary text-sm font-bold disabled:opacity-40 transition-opacity"
      >
        Enviar
      </button>
    </form>
  );
}
