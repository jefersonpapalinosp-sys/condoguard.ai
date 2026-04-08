type Props = { agentName?: string | null };

export function TypingIndicator({ agentName }: Props) {
  const label = agentName ?? 'Copiloto';

  return (
    <div className="flex items-center gap-2 px-1">
      <span className="text-xs text-on-surface-variant">{label} digitando</span>
      <span className="flex items-center gap-[3px]">
        <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant animate-bounce [animation-delay:300ms]" />
      </span>
    </div>
  );
}
