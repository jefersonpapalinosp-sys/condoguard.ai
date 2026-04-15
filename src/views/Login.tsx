import { FormEvent, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/context/AuthContext';
import { loginWithPassword } from '../services/authService';
import { ApiError } from '../services/http';
import { BRAND } from '../shared/branding/brand';
import { BrandMark } from '../shared/ui/BrandMark';

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
  const [traceId, setTraceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const routeState = location.state as { from?: string; reason?: string } | null;

  useEffect(() => {
    if (routeState?.reason === 'session_expired') {
      setError('Sessao expirada. Faca login novamente.');
    }
  }, [routeState?.reason]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setTraceId(null);
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
        setTraceId(rawError.traceId ?? null);
        if (rawError.code === 'AUTH_EXTERNAL_PROVIDER_REQUIRED') {
          setError('Login por senha desabilitado. Use o provedor corporativo configurado.');
        } else if (rawError.code === 'SESSION_EXPIRED') {
          setError('Sessao expirada. Faca login novamente.');
        } else if (rawError.status === 401) {
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
    <main className="min-h-[100dvh] overflow-x-hidden bg-surface text-on-surface font-body antialiased lg:grid lg:grid-cols-[1.2fr_minmax(24rem,32rem)]">
      <section className="relative hidden min-h-[100dvh] overflow-hidden bg-primary-container lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(194,233,227,0.26),transparent_0%,transparent_32%),radial-gradient(circle_at_78%_18%,rgba(201,141,72,0.34),transparent_0%,transparent_24%),linear-gradient(150deg,#08161a_0%,#10343a_48%,#0f262b_100%)]" />
        <div className="absolute inset-y-0 right-0 w-px bg-white/12" />
        <div className="absolute inset-x-[10%] top-[14%] h-[17rem] rounded-[3rem] border border-white/10 bg-white/6 rotate-[-7deg]" />
        <div className="absolute inset-x-[26%] top-[36%] h-[14rem] rounded-[3rem] border border-white/8 bg-white/5 rotate-[8deg]" />
        <div className="absolute right-[12%] top-[14%] grid gap-3">
          <div className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-white/82 backdrop-blur-sm">
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/48">Pulso operacional</p>
            <p className="mt-2 text-2xl font-headline font-bold text-white">24 eventos</p>
            <p className="mt-1 text-sm">Incidentes, contratos e tarefas em atualizacao continua.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/18 px-4 py-3 text-white/82 backdrop-blur-sm">
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/48">Base visual</p>
            <p className="mt-2 text-sm leading-6">Layout inicial para substituir a marca antiga por uma shell mais institucional e modular.</p>
          </div>
        </div>

        <div className="relative z-10 flex h-full w-full flex-col justify-between px-12 py-12 xl:px-16 xl:py-16">
          <div className="flex items-center gap-4">
            <BrandMark size="lg" />
            <div>
              <p className="font-headline text-3xl font-bold tracking-tight text-white">{BRAND.name}</p>
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/58">{BRAND.tagline}</p>
            </div>
          </div>

          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-white/78">
              <span className="h-2 w-2 rounded-full bg-[#a8f2cb]" />
              {BRAND.loginBadge}
            </span>
            <h1 className="mt-6 max-w-xl font-headline text-5xl font-bold leading-[1.04] tracking-[-0.03em] text-white">
              {BRAND.loginHeadline}
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-white/74">
              {BRAND.loginDescription}
            </p>
          </div>

          <div className="grid max-w-3xl grid-cols-3 gap-3">
            {BRAND.loginHighlights.map((item) => (
              <article key={item.label} className="rounded-[1.7rem] border border-white/12 bg-white/9 px-4 py-4 text-white/86 backdrop-blur-sm">
                <p className="text-[11px] uppercase tracking-[0.22em] text-white/46">{item.label}</p>
                <p className="mt-3 text-sm leading-6">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative flex min-h-[100dvh] items-center justify-center overflow-y-auto px-4 py-8 sm:px-6 lg:px-10">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_0%,rgba(17,96,102,0.10),transparent_36%),radial-gradient(circle_at_84%_10%,rgba(201,141,72,0.12),transparent_28%),linear-gradient(180deg,#f8f5ef_0%,#f3efe6_100%)]" />

        <div className="atlas-panel w-full max-w-xl rounded-[2rem] border border-white/60 p-5 shadow-[0_28px_70px_rgba(15,34,39,0.14)] md:p-8">
          <header className="mb-6 flex flex-col gap-5">
            <div className="flex items-center gap-4">
              <BrandMark />
              <div>
                <p className="font-headline text-xl font-bold tracking-tight text-on-surface">{BRAND.name}</p>
                <p className="text-[11px] uppercase tracking-[0.22em] text-on-surface-variant">{BRAND.tagline}</p>
              </div>
            </div>

            <div className="rounded-[1.6rem] border border-outline-variant/45 bg-surface-container-lowest/75 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-on-surface-variant">Esboco inicial</p>
              <h2 className="mt-2 font-headline text-3xl font-bold tracking-tight text-on-surface">Acessar nucleo operacional</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-on-surface-variant">
                Login reescrito para a nova identidade visual, com base pronta para shell, chatbot e modulos do projeto.
              </p>
            </div>
          </header>

          <form className="space-y-5" onSubmit={onSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <label htmlFor="email" className="block text-[11px] font-label font-bold uppercase tracking-[0.22em] text-on-surface-variant">
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
                    placeholder={BRAND.demoAdminEmail}
                    required
                    defaultValue={IS_DEV ? BRAND.demoAdminEmail : ''}
                    className="interactive-focus h-14 w-full rounded-[1.25rem] border border-outline-variant/45 bg-surface-container-lowest/85 pl-12 pr-4 text-sm text-on-surface outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <label htmlFor="password" className="block text-[11px] font-label font-bold uppercase tracking-[0.22em] text-on-surface-variant">
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
                    className="interactive-focus h-14 w-full rounded-[1.25rem] border border-outline-variant/45 bg-surface-container-lowest/85 pl-12 pr-4 text-sm text-on-surface outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr]">
              <div className="rounded-[1.4rem] border border-outline-variant/45 bg-surface-container-low px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.22em] text-on-surface-variant">Acesso seguro</p>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                  Sessao protegida, rastreavel e preparada para evoluir com identidade visual unificada.
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-outline-variant/45 bg-surface-container-low px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.22em] text-on-surface-variant">Status</p>
                <p className="mt-2 text-sm font-semibold text-on-surface">Preview pronta</p>
                <p className="mt-1 text-xs text-on-surface-variant">Login, shell e assistente ja reescritos.</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="atlas-gradient flex h-14 w-full items-center justify-center gap-2 rounded-[1.25rem] px-4 text-sm font-headline font-bold uppercase tracking-[0.22em] text-white shadow-[0_18px_40px_rgba(15,34,39,0.16)] transition-transform active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? 'Entrando...' : 'Entrar'}
              <span className="material-symbols-outlined text-lg">north_east</span>
            </button>

            {error ? (
              <div className="rounded-[1.2rem] border border-error/20 bg-error-container/85 px-4 py-3">
                <p className="text-sm text-on-error-container">{error}</p>
                {traceId ? <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-on-error-container/80">Trace ID: {traceId}</p> : null}
              </div>
            ) : null}
          </form>
        </div>
      </section>
    </main>
  );
}
