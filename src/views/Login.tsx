import { FormEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/context/AuthContext';
import { loginWithPassword } from '../services/authService';

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
      login(session);
      const nextPath = (location.state as { from?: string } | null)?.from ?? '/dashboard';
      navigate(nextPath, { replace: true });
    } catch {
      setError('Credenciais invalidas ou servico indisponivel.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex bg-surface text-on-surface font-body antialiased overflow-hidden">
      <section className="hidden lg:flex lg:w-7/12 relative overflow-hidden bg-primary-container">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop"
            alt="Detalhe arquitetonico de um predio"
            className="w-full h-full object-cover opacity-60 grayscale"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-tr from-primary via-transparent to-primary-container opacity-90 z-10"></div>

        <div className="relative z-20 flex flex-col justify-between p-16 h-full">
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
          </div>
        </div>
      </section>

      <section className="w-full lg:w-5/12 bg-surface flex items-center justify-center px-4 md:px-8 lg:px-16 py-12 relative">
        <div className="absolute inset-0 bg-surface-container-low opacity-40 -z-10"></div>

        <div className="w-full max-w-md">
          <header className="mb-10">
            <h2 className="text-2xl md:text-3xl font-headline font-extrabold text-on-surface tracking-tight">Acessar Plataforma</h2>
            <p className="mt-2 text-on-surface-variant font-body">Acesso autenticado no backend com credenciais validas.</p>
          </header>

          <form className="space-y-6" onSubmit={onSubmit}>
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
                  defaultValue="admin@condoguard.ai"
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
                  defaultValue="password123"
                  className="w-full pl-12 pr-4 py-4 bg-surface-container border-0 focus:ring-2 focus:ring-primary-fixed rounded-lg transition-all text-on-surface"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 monolith-gradient text-white font-headline font-bold text-sm uppercase tracking-widest rounded-lg shadow-xl shadow-primary-container/10 hover:shadow-primary-container/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {loading ? 'Entrando...' : 'Entrar'}
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </button>
            {error ? <p className="text-sm text-error mt-2">{error}</p> : null}
          </form>
        </div>
      </section>
    </main>
  );
}
