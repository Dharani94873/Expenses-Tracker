import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, ArrowLeftRight, Target, BarChart3,
  Settings, LogOut, TrendingUp, X
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { to: '/budgets', icon: Target, label: 'Budgets' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      {/* Desktop: fixed; Mobile: slide-in */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 z-30
          flex flex-col transition-transform duration-300
          ${open ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        {/* Logo */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center text-lg shadow-glow-primary">
              💰
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm leading-none">ExpenseTracker</p>
              <p className="text-xs text-slate-500 mt-0.5">Smart Finance</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon btn-ghost lg:hidden">
            <X size={16} />
          </button>
        </div>

        {/* User info */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center text-white font-bold text-sm shadow-glow-primary flex-shrink-0">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Market trend indicator */}
        <div className="p-3 mx-3 mb-2 rounded-xl bg-gradient-card border border-primary-500/20">
          <div className="flex items-center gap-2 text-xs">
            <TrendingUp size={14} className="text-accent-green" />
            <span className="text-slate-500">Track smarter, save more</span>
          </div>
        </div>

        {/* Logout */}
        <div className="p-3 border-t border-slate-200">
          <button
            onClick={handleLogout}
            className="sidebar-link w-full text-accent-red hover:text-accent-red hover:bg-accent-red/10"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
