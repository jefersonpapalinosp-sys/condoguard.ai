import { FormEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/context/AuthContext';
import { loginWithPassword } from '../services/authService';
import { ApiError } from '../services/http';

const IS_DEV = import.meta.env.VITE_APP_ENV === 'dev' || import.meta.env.DEV;

function deriveNameFromEmail(email: string) {
  const localPart = String(email ?? '')
    .split('@')[0]
    ?.replace(/[._-]+/g, ' ')
    .replace(/\d+/g, ' ')
    .trim();
  if (!localPart) return 'Usuario logado';
  return localPart
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') || '');
    const password = String(form.get('password') || '');

    try {
      const session = await loginWithPassword(email, password);
      login({
        ...session,
        userName: session.userName ?? session.name ?? deriveNameFromEmail(email),
      });
      const nextPath = (location.state as { from?: string } | null)?.from ?? '/dashboard';
      navigate(nextPath, { replace: true });
    } catch (rawError) {
      if (rawError instanceof ApiError) {
        if (rawError.status === 401) {
          setError('Credenciais invalidas.');
        } else if (rawError.status === 429) {
          setError('Muitas tentativas de login. Aguarde e tente novamente.');
        } else {
          setError('Servico de autenticacao indisponivel. Verifique se a API esta ativa.');
        }
      } else {
        setError('Credenciais invalidas ou servico indisponivel.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[100dvh] overflow-x-hidden bg-surface text-on-surface font-body antialiased lg:flex">
      <section className="relative hidden min-h-[100dvh] overflow-hidden bg-primary-container lg:flex lg:w-7/12">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop"
            alt="Detalhe arquitetonico de um predio"
            className="w-full h-full object-cover opacity-60 grayscale"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-tr from-primary via-transparent to-primary-container opacity-90 z-10" />

        <div className="relative z-20 flex flex-col justify-between p-10 xl:p-16 h-full">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-fixed flex items-center justify-center rounded-lg">
                <span className="material-symbols-outlined text-on-primary-fixed">domain</span>
              </div>
              <h1 className="font-headline text-2xl md:text-3xl font-extrabold tracking-tight text-white">CondoGuard.AI</h1>
            </div>
            <p className="mt-4 text-on-primary-container font-headline text-lg max-w-sm">
              Inteligencia predial para operacoes modernas.
            </p>
          </div>

          <div className="space-y-6">
            <div className="max-w-md">
              <span className="inline-block px-3 py-1 mb-4 text-xs font-bold tracking-widest uppercase bg-tertiary-fixed text-on-tertiary-fixed rounded-full">
                ESTATE INTELLIGENCE
              </span>
              <h2 className="text-3xl md:text-4xl font-headline font-bold text-white leading-tight">
                Monitoramento avancado para ativos de alto valor.
              </h2>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-3 text-sm text-white/85">
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                <p className="text-[11px] uppercase tracking-widest text-white/70">Tempo real</p>
                <p className="mt-1 font-semibold">Alertas e status operacionais com atualizacao continua.</p>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3">
                <p className="text-[11px] uppercase tracking-widest text-white/70">Governanca</p>
                <p className="mt-1 font-semibold">Controle por perfil para moradores, sindico e administracao.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative flex w-full items-center justify-center overflow-y-auto px-4 py-6 md:px-8 md:py-10 lg:w-5/12 lg:px-12">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_0%,rgba(19,27,46,0.08),transparent_35%),linear-gradient(180deg,#faf8ff_0%,#f1f4ff_100%)]" />

        <div className="w-full max-w-md space-y-5 rounded-3xl border border-outline-variant/30 bg-surface-container-lowest/90 p-5 shadow-xl backdrop-blur-sm md:p-7">
          <header>
            <div className="mb-4 flex items-center gap-3 lg:hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-container">
                <span className="material-symbols-outlined text-sm text-white">domain</span>
              </div>
              <div>
                <p className="font-headline text-base font-extrabold tracking-tight">CondoGuard.AI</p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">Building Intelligence</p>
              </div>
            </div>

            <h2 className="text-2xl font-headline font-extrabold tracking-tight text-on-surface md:text-3xl">Acessar Plataforma</h2>
            <p className="mt-2 font-body text-on-surface-variant">Acesso autenticado no backend com credenciais validas.</p>
          </header>

          <form className="space-y-5" onSubmit={onSubmit}>
            <div className="space-y-2">
              <label htmlFor="email" className="block text-xs font-label font-bold text-on-surface-variant uppercase tracking-widest">
                E-mail
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-primary-container text-lg">
                  alternate_email
                </span>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="nome@organizacao.ai"
                  required
                  defaultValue={IS_DEV ? 'admin@condoguard.ai' : ''}
                  className="w-full pl-12 pr-4 py-4 bg-surface-container border-0 focus:ring-2 focus:ring-primary-fixed rounded-lg transition-all text-on-surface"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-xs font-label font-bold text-on-surface-variant uppercase tracking-widest">
                Senha
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-primary-container text-lg">
                  lock
                </span>
                <input
                  type="password"
                  id="password"
                  name="password"
                  placeholder="************"
                  required
                  defaultValue={IS_DEV ? 'password123' : ''}
                  className="w-full pl-12 pr-4 py-4 bg-surface-container border-0 focus:ring-2 focus:ring-primary-fixed rounded-lg transition-all text-on-surface"
                />
              </div>
            </div>

            <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-2">
              <p className="text-[11px] uppercase tracking-widest text-on-surface-variant">Acesso seguro</p>
              <p className="mt-1 text-xs text-on-surface-variant">Sessao protegida por autenticacao e politicas de perfil.</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg py-4 text-sm font-headline font-bold uppercase tracking-widest text-white shadow-xl shadow-primary-container/10 transition-all active:scale-[0.98] monolith-gradient hover:shadow-primary-container/20"
            >
              {loading ? 'Entrando...' : 'Entrar'}
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </button>
            {error ? <p className="mt-1 text-sm text-error">{error}</p> : null}
          </form>
        </div>
      </section>
    </main>
  );
}
