import { AGENT_STYLES, AGENT_TILES } from '../types/chat';

type Props = {
  onSelectSample: (prompt: string) => void;
};

export function WelcomeScreen({ onSelectSample }: Props) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 py-8 text-center">
      <div>
        <p className="text-4xl mb-3">🏢</p>
        <h3 className="font-headline text-xl font-bold">CondoGuard Copiloto</h3>
        <p className="text-sm text-on-surface-variant mt-1 max-w-sm">
          Assistente com múltiplos agentes especializados para acelerar a gestão do seu condomínio.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
        {AGENT_TILES.map((tile) => {
          const style = AGENT_STYLES[tile.name];
          return (
            <button
              key={tile.name}
              type="button"
              onClick={() => onSelectSample(tile.sample)}
              className="text-left rounded-xl bg-surface-container-highest p-4 hover:opacity-80 transition-opacity group"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{tile.icon}</span>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${style?.badge ?? 'bg-gray-100 text-gray-700'}`}
                >
                  {tile.name}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mb-2">{tile.desc}</p>
              <p className="text-[11px] italic text-on-surface-variant/70 group-hover:text-on-surface-variant transition-colors">
                "{tile.sample}"
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
