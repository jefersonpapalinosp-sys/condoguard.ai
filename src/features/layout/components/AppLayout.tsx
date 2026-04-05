import { useEffect, useState } from 'react';
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
  { id: 'chat', label: 'Chat', icon: 'forum' },
  { id: 'management', label: 'Gestao', icon: 'domain', allowedRoles: ['admin', 'sindico'] },
  { id: 'observability', label: 'Observabilidade', icon: 'monitoring', allowedRoles: ['admin'] },
  { id: 'reports', label: 'Relatorios', icon: 'assessment' },
  { id: 'settings', label: 'Configuracoes', icon: 'settings' },
];

function toTitle(pathname: string) {
  const current = pathname.split('/').filter(Boolean).at(-1) ?? 'dashboard';
  if (current === 'dashboard') {
    return 'Condominio Mirante do Parque';
  }

  return navItems.find((item) => item.id === current)?.label ?? 'CondoGuard.AI';
}

export function AppLayout() {
  const location = useLocation();
  const { logout, role } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const visibleNavItems = navItems.filter((item) => !item.allowedRoles || (role && item.allowedRoles.includes(role)));

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <>
      <div className="relative flex h-screen overflow-hidden bg-surface text-on-surface font-body">
        {mobileMenuOpen ? (
          <button
            aria-label="Fechar menu"
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        ) : null}

        <aside
          className={`fixed inset-y-0 left-0 z-50 flex h-full w-72 max-w-[85vw] flex-col bg-slate-100 py-6 font-headline text-sm font-medium shadow-xl transition-transform duration-200 md:static md:w-64 md:max-w-none md:translate-x-0 md:shadow-none dark:bg-slate-900 ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="px-6 mb-10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary-container rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-sm">domain</span>
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-950 dark:text-slate-50">CondoGuard.AI</h1>
                <p className="text-[10px] uppercase tracking-widest text-slate-500">Building Intelligence</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
            {visibleNavItems.map((item) => (
              <NavLink
                key={item.id}
                to={`/${item.id}`}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150 ${
                    isActive
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-950 dark:text-white font-bold scale-95'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                  }`
                }
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="px-4 mt-auto space-y-2 border-t border-slate-200/50 dark:border-slate-800/50 pt-6">
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors rounded-xl"
            >
              <span className="material-symbols-outlined">logout</span>
              <span>Sair</span>
            </button>
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="sticky top-0 z-30 flex h-16 w-full shrink-0 items-center justify-between bg-slate-50 px-4 font-headline text-sm font-semibold shadow-sm md:px-8 dark:bg-slate-950 dark:shadow-none">
            <div className="flex items-center gap-3 md:gap-8 min-w-0">
              <button
                aria-label="Abrir menu"
                className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container-low md:hidden"
                onClick={() => setMobileMenuOpen(true)}
              >
                <span className="material-symbols-outlined">menu</span>
              </button>
              <h2 className="truncate text-on-surface font-extrabold text-base tracking-tight capitalize md:text-lg">
                {toTitle(location.pathname)}
              </h2>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <button className="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-full relative">
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full ring-2 ring-slate-50"></span>
              </button>
              <div className="hidden md:block h-8 w-[1px] bg-outline-variant opacity-30 mx-2"></div>
              <div className="flex items-center gap-3">
                <img
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                  alt="Usuario"
                  className="w-8 h-8 rounded-full border border-outline-variant object-cover"
                />
                <span className="text-on-surface font-semibold hidden sm:inline">Ricardo Silva</span>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto bg-surface">
            <Outlet />
          </div>
        </main>
      </div>
      <ChatbotWidget hidden={location.pathname === '/chat'} />
      <ApiFallbackToast />
    </>
  );
}
