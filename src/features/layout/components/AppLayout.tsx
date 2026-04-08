import { useEffect, useId, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';
import type { AuthRole } from '../../auth/context/AuthContext';
import { ApiFallbackToast } from '../../../shared/ui/ApiFallbackToast';
import { ChatbotWidget } from '../../../shared/ui/ChatbotWidget';

type NavItem = {
  id: string;
  label: string;
  icon: string;
  allowedRoles?: AuthRole[];
};

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'cadastros-gerais', label: 'Cadastros Gerais', icon: 'inventory_2' },
  { id: 'alerts', label: 'Alertas', icon: 'warning' },
  { id: 'consumption', label: 'Consumo', icon: 'energy_savings_leaf' },
  { id: 'contracts', label: 'Contratos', icon: 'description' },
  { id: 'invoices', label: 'Faturas', icon: 'receipt_long', allowedRoles: ['admin', 'sindico'] },
  { id: 'integrations/enel', label: 'Importacao Enel', icon: 'bolt', allowedRoles: ['admin', 'sindico'] },
  { id: 'chat', label: 'Chat', icon: 'forum' },
  { id: 'management', label: 'Gestao', icon: 'domain', allowedRoles: ['admin', 'sindico'] },
  { id: 'observability', label: 'Observabilidade', icon: 'monitoring', allowedRoles: ['admin'] },
  { id: 'reports', label: 'Relatorios', icon: 'assessment' },
  { id: 'settings', label: 'Configuracoes', icon: 'settings' },
];

function toTitle(pathname: string) {
  const segments = pathname.split('/').filter(Boolean);
  const current = segments.at(-1) ?? 'dashboard';
  if (current === 'dashboard') {
    return 'Condominio Mirante do Parque';
  }

  const direct = navItems.find((item) => item.id === current)?.label;
  if (direct) {
    return direct;
  }

  const root = segments[0];
  const rootMatch = navItems.find((item) => item.id === root)?.label;
  if (rootMatch) return rootMatch;

  // Match multi-segment nav ids like "integrations/enel"
  const fullPath = segments.join('/');
  return navItems.find((item) => item.id === fullPath)?.label ?? 'CondoGuard.AI';
}

export function AppLayout() {
  const location = useLocation();
  const { logout, role, userName } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuId = useId();
  const visibleNavItems = navItems.filter((item) => !item.allowedRoles || (role && item.allowedRoles.includes(role)));
  const roleLabel = useMemo(() => {
    if (role === 'admin') {
      return 'Administrador';
    }
    if (role === 'sindico') {
      return 'Sindico';
    }
    return 'Morador';
  }, [role]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onEsc);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onEsc);
    };
  }, [mobileMenuOpen]);

  return (
    <>
      <div className="relative flex min-h-[100dvh] overflow-hidden bg-surface text-on-surface font-body">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(19,27,46,0.10),transparent_45%),radial-gradient(circle_at_85%_0%,rgba(74,225,118,0.10),transparent_40%),linear-gradient(180deg,#faf8ff_0%,#f3f6ff_100%)]" />

        {mobileMenuOpen ? (
          <button
            aria-label="Fechar menu"
            className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px] md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        ) : null}

        <aside
          id={mobileMenuId}
          className={`fixed inset-y-0 left-0 z-50 flex h-[100dvh] w-[18rem] max-w-[88vw] flex-col border-r border-outline-variant/30 bg-surface-container-lowest/95 py-4 font-headline text-sm font-medium shadow-2xl backdrop-blur-lg transition-transform duration-300 ease-out md:static md:h-auto md:w-[17rem] md:max-w-none md:translate-x-0 md:shadow-none ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="mb-6 px-5">
            <div className="flex items-center gap-3 rounded-2xl bg-surface-container px-3 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-container">
                <span className="material-symbols-outlined text-sm text-white">domain</span>
              </div>
              <div>
                <h1 className="text-base font-extrabold tracking-tight text-on-surface">CondoGuard.AI</h1>
                <p className="text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">Building Intelligence</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-3">
            {visibleNavItems.map((item) => (
              <NavLink
                key={item.id}
                to={`/${item.id}`}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                    isActive
                      ? 'bg-primary-container text-white shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                  }`
                }
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto space-y-3 border-t border-outline-variant/30 px-4 pb-2 pt-4">
            <div className="rounded-xl bg-surface-container-high px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.15em] text-on-surface-variant">Perfil em uso</p>
              <p className="mt-1 text-xs font-bold text-on-surface">{roleLabel}</p>
            </div>
            <button
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
            >
              <span className="material-symbols-outlined">logout</span>
              <span>Sair</span>
            </button>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 w-full shrink-0 items-center justify-between border-b border-outline-variant/30 bg-surface-container-lowest/85 px-3 font-headline text-sm font-semibold shadow-[0_2px_12px_rgba(19,27,46,0.05)] backdrop-blur md:px-6">
            <div className="flex min-w-0 items-center gap-2 md:gap-5">
              <button
                aria-label="Abrir menu"
                aria-controls={mobileMenuId}
                aria-expanded={mobileMenuOpen}
                className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container-low md:hidden"
                onClick={() => setMobileMenuOpen(true)}
              >
                <span className="material-symbols-outlined">menu</span>
              </button>
              <h2 className="truncate text-on-surface font-extrabold text-base tracking-tight capitalize md:text-lg">
                {toTitle(location.pathname)}
              </h2>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2.5">
              <button
                aria-label="Notificacoes"
                className="relative rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-low"
              >
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-error ring-2 ring-surface-container-lowest" />
              </button>
              <div className="hidden h-8 w-px bg-outline-variant/40 md:block" />
              <div className="flex items-center gap-2 sm:gap-3">
                <img
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                  alt={`Avatar de ${userName}`}
                  className="h-8 w-8 rounded-full border border-outline-variant/60 object-cover"
                />
                <div className="min-w-0 text-right">
                  <p className="truncate text-xs font-semibold text-on-surface sm:text-sm">{userName}</p>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-on-surface-variant">{roleLabel}</p>
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto bg-transparent pb-8">
            <Outlet />
          </div>
        </main>
      </div>
      <ChatbotWidget hidden={location.pathname === '/chat'} />
      <ApiFallbackToast />
    </>
  );
}
