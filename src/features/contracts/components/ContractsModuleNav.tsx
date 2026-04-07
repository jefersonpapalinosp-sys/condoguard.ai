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
    <nav className="flex flex-wrap gap-2">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${
              isActive ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-on-surface hover:bg-surface-container-high'
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
