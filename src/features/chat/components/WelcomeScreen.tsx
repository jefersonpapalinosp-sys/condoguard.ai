import { AGENT_STYLES, AGENT_TILES } from '../types/chat';
import { BRAND } from '../../../shared/branding/brand';

const TILE_ICONS: Record<string, string> = {
  'Agente Financeiro': 'receipt_long',
  'Agente de Alertas': 'warning',
  'Agente de Consumo': 'bolt',
  'Agente de Gestao': 'domain',
};

type Props = {
  userName?: string;
  onSelectSample: (prompt: string) => void;
};

export function WelcomeScreen({ userName, onSelectSample }: Props) {
  const firstName = userName ? userName.split(' ')[0] : null;

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 py-6 text-center">
      {/* Hero */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
          <span aria-hidden="true" className="material-symbols-outlined text-[28px] text-primary">smart_toy</span>
        </div>
        <div>
          {firstName && (
            <p className="text-sm text-on-surface-variant mb-1">
              Bem-vindo, <span className="font-semibold text-on-surface">{firstName}</span>
            </p>
          )}
          <h3 className="font-headline text-xl font-bold text-on-surface">{BRAND.assistantName}</h3>
          <p className="text-sm text-on-surface-variant mt-1.5 max-w-xs leading-relaxed">
            {BRAND.chatDescription}
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-tertiary-fixed-dim/20 px-3 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-on-tertiary-fixed-variant">
            Gemini AI ativo
          </span>
        </div>
      </div>

      {/* Agent tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-xl">
        {AGENT_TILES.map((tile) => {
          const style = AGENT_STYLES[tile.name];
          const icon = TILE_ICONS[tile.name] ?? 'smart_toy';
          return (
            <button
              key={tile.name}
              type="button"
              onClick={() => onSelectSample(tile.sample)}
              className="group text-left rounded-xl border border-outline-variant/20 bg-surface-container-highest/60 p-3.5 hover:bg-surface-container-high hover:border-outline-variant/40 active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-lg text-[15px] ${style?.badge ?? 'bg-surface-container-high text-on-surface-variant'}`}
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[15px]">{icon}</span>
                </span>
                <span className="text-xs font-bold text-on-surface">{tile.name}</span>
              </div>
              <p className="text-[11px] text-on-surface-variant mb-1.5 leading-relaxed">{tile.desc}</p>
              <p className="text-[10px] italic text-on-surface-variant/50 group-hover:text-on-surface-variant/70 transition-colors truncate">
                "{tile.sample}"
              </p>
            </button>
          );
        })}
      </div>

      <p className="text-[10px] text-on-surface-variant/40 mt-1">
        Digite uma pergunta ou clique em um agente para começar
      </p>
    </div>
  );
}
