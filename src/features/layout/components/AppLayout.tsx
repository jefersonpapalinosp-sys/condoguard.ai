import { Fragment, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';
import { fetchAlertsSummary, type AlertsSummary } from '../../../services/alertsSummaryService';
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
  { id: 'alerts', label: 'Alertas', icon: 'warning' },
  { id: 'cadastros-gerais', label: 'Cadastros Gerais', icon: 'inventory_2' },
  { id: 'chat', label: 'Chat', icon: 'forum' },
  { id: 'settings', label: 'Configuracoes', icon: 'settings' },
  { id: 'consumption', label: 'Consumo', icon: 'energy_savings_leaf' },
  { id: 'contracts', label: 'Contratos', icon: 'description' },
  { id: 'invoices', label: 'Faturas', icon: 'receipt_long', allowedRoles: ['admin', 'sindico'] },
  { id: 'management', label: 'Gestao', icon: 'domain', allowedRoles: ['admin', 'sindico'] },
  { id: 'integrations/enel', label: 'Importacao Enel', icon: 'bolt', allowedRoles: ['admin', 'sindico'] },
  { id: 'integrations/sabesp', label: 'Importacao Sabesp', icon: 'water_drop', allowedRoles: ['admin', 'sindico'] },
  { id: 'observability', label: 'Observabilidade', icon: 'monitoring', allowedRoles: ['admin'] },
  { id: 'comunicados', label: 'Comunicados', icon: 'campaign' },
  { id: 'reports', label: 'Relatorios', icon: 'assessment' },
];

const SEGMENT_LABELS: Record<string, string> = {
  contracts: 'Contratos',
  integrations: 'Integracoes',
  lista: 'Lista',
  novo: 'Novo Contrato',
  auditoria: 'Auditoria',
  vencimentos: 'Vencimentos',
  reajustes: 'Reajustes',
  documentos: 'Documentos',
  editar: 'Editar',
  enel: 'Enel',
  sabesp: 'Sabesp',
};

function toBreadcrumbs(pathname: string): Array<{ label: string; to?: string }> {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length <= 1) return [];
  // Skip if the full multi-segment path is a known top-level nav item (e.g. integrations/enel)
  const fullPath = segments.join('/');
  if (navItems.some((item) => item.id === fullPath)) return [];

  const crumbs: Array<{ label: string; to?: string }> = [];
  let built = '';
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    built = built ? `${built}/${seg}` : seg;
    const isLast = i === segments.length - 1;
    const isId = /^\d+$/.test(seg) || /^[0-9a-f]{8}-[0-9a-f]{4}/.test(seg) || (seg.length >= 8 && /^[0-9a-f-]+$/.test(seg));
    const label = SEGMENT_LABELS[seg] ?? (isId ? 'Detalhes' : seg);
    crumbs.push({ label, to: isLast ? undefined : `/${built}` });
  }
  return crumbs;
}

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

const ALERT_POLL_MS = 30_000;

export function AppLayout() {
  const location = useLocation();
  const breadcrumbs = toBreadcrumbs(location.pathname);
  const { logout, role, userName } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [alertSummary, setAlertSummary] = useState<AlertsSummary | null>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const mobileMenuId = useId();
  const visibleNavItems = navItems.filter((item) => !item.allowedRoles || (role && item.allowedRoles.includes(role)));
  const avatarIcon = useMemo(() => {
    if (role === 'admin') {
      return 'admin_panel_settings';
    }
    if (role === 'sindico') {
      return 'assignment_ind';
    }
    return 'person';
  }, [role]);
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

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const summary = await fetchAlertsSummary();
        if (!cancelled) setAlertSummary(summary);
      } catch {
        // degrade gracefully — badge stays hidden
      }
    }

    void load();
    const interval = setInterval(() => void load(), ALERT_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!notifOpen) return undefined;

    function onPointerDown(event: PointerEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    }

    function onEsc(event: KeyboardEvent) {
      if (event.key === 'Escape') setNotifOpen(false);
    }

    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onEsc);
    };
  }, [notifOpen]);

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
            {visibleNavItems.map((item) => {
              const isAlerts = item.id === 'alerts';
              const alertBadge = isAlerts && alertSummary && alertSummary.activeCount > 0
                ? alertSummary.activeCount
                : null;
              return (
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
                  <span className="flex-1">{item.label}</span>
                  {alertBadge !== null && (
                    <span className="min-w-[1.25rem] rounded-full bg-error px-1.5 py-0.5 text-center text-[10px] font-bold text-white leading-none">
                      {alertBadge > 99 ? '99+' : alertBadge}
                    </span>
                  )}
                </NavLink>
              );
            })}
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
              <div className="relative" ref={notifRef}>
                <button
                  aria-label="Notificacoes"
                  aria-expanded={notifOpen}
                  onClick={() => setNotifOpen((prev) => !prev)}
                  className={`relative rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-low ${notifOpen ? 'bg-surface-container-low' : ''}`}
                >
                  <span className="material-symbols-outlined">
                    {notifOpen ? 'notifications_active' : 'notifications'}
                  </span>
                  {alertSummary && alertSummary.critical > 0 && (
                    <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-error px-0.5 text-[9px] font-bold text-white ring-2 ring-surface-container-lowest">
                      {alertSummary.critical > 9 ? '9+' : alertSummary.critical}
                    </span>
                  )}
                  {alertSummary && alertSummary.critical === 0 && alertSummary.warning > 0 && (
                    <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-secondary ring-2 ring-surface-container-lowest" />
                  )}
                  {(!alertSummary || (alertSummary.critical === 0 && alertSummary.warning === 0)) && alertSummary === null && (
                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-error ring-2 ring-surface-container-lowest" />
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-2xl">
                    <div className="flex items-center justify-between border-b border-outline-variant/20 px-4 py-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-on-surface">
                        Alertas ativos
                        {alertSummary && (
                          <span className="ml-2 rounded-full bg-error px-1.5 py-0.5 text-[9px] text-white">
                            {alertSummary.activeCount}
                          </span>
                        )}
                      </p>
                      <Link
                        to="/alerts"
                        onClick={() => setNotifOpen(false)}
                        className="text-[10px] font-semibold text-primary hover:underline uppercase tracking-wider"
                      >
                        Ver todos
                      </Link>
                    </div>

                    {!alertSummary || alertSummary.top.length === 0 ? (
                      <p className="px-4 py-4 text-xs text-on-surface-variant">
                        Nenhum alerta ativo no momento.
                      </p>
                    ) : (
                      <ul className="divide-y divide-outline-variant/15">
                        {alertSummary.top.map((alert) => (
                          <li key={alert.id} className="px-4 py-3">
                            <div className="flex items-start gap-2">
                              <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                                alert.severity === 'critical' ? 'bg-error' : alert.severity === 'warning' ? 'bg-secondary' : 'bg-on-tertiary-container'
                              }`} />
                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold text-on-surface">{alert.title}</p>
                                <p className="text-[10px] text-on-surface-variant">{alert.time}</p>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
              <div className="hidden h-8 w-px bg-outline-variant/40 md:block" />
              <div className="flex items-center gap-2 sm:gap-3">
                <div
                  aria-label={`Avatar do usuario ${userName}`}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant/60 bg-surface-container-high text-on-surface-variant"
                >
                  <span className="material-symbols-outlined text-[18px]">{avatarIcon}</span>
                </div>
                <div className="min-w-0 text-right">
                  <p className="truncate text-xs font-semibold text-on-surface sm:text-sm">{userName}</p>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-on-surface-variant">{roleLabel}</p>
                </div>
              </div>
            </div>
          </header>

          {breadcrumbs.length > 0 && (
            <nav
              aria-label="Caminho de navegacao"
              className="flex items-center gap-1 border-b border-outline-variant/20 bg-surface-container-lowest/60 px-4 py-2 text-xs md:px-6"
            >
              {breadcrumbs.map((crumb, i) => (
                <Fragment key={i}>
                  {i > 0 && (
                    <span className="text-outline-variant select-none">›</span>
                  )}
                  {crumb.to ? (
                    <Link
                      to={crumb.to}
                      className="text-primary hover:underline font-medium"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="font-semibold text-on-surface">{crumb.label}</span>
                  )}
                </Fragment>
              ))}
            </nav>
          )}

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
