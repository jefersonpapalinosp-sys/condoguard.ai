import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/contracts', label: 'Dashboard', end: true },
  { to: '/contracts/lista', label: 'Lista' },
  { to: '/contracts/novo', label: 'Novo contrato' },
  { to: '/contracts/auditoria', label: 'Auditoria' },
  { to: '/contracts/vencimentos', label: 'Vencimentos' },
  { to: '/contracts/reajustes', label: 'Reajustes' },
  { to: '/contracts/documentos', label: 'Documentos' },
];

export function ContractsModuleNav() {
  return (
    <nav className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-hide" aria-label="Navegacao do modulo de contratos">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `whitespace-nowrap rounded-full px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors ${
              isActive
                ? 'bg-primary text-on-primary shadow-[0_8px_20px_rgba(19,27,46,0.22)]'
                : 'bg-surface-container-highest text-on-surface hover:bg-surface-container-high'
            } interactive-focus`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
