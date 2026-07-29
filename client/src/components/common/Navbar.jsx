import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Bell, Search, ChevronDown, User, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { formatDistanceToNow } from 'date-fns';

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/transactions': 'Transactions',
  '/budgets': 'Budgets',
  '/reports': 'Reports',
  '/settings': 'Settings',
};

const notificationColors = {
  budget_alert: 'text-accent-amber',
  budget_exceeded: 'text-accent-red',
  info: 'text-primary-400',
  success: 'text-accent-green',
};

export default function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const pageTitle = pageTitles[location.pathname] || 'ExpenseTracker';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-200 px-4 md:px-6 h-16 flex items-center justify-between gap-4">
      {/* Left: menu + title */}
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="btn-icon btn-ghost lg:hidden" aria-label="Open menu">
          <Menu size={20} />
        </button>
        <h1 className="text-lg font-bold text-slate-900 hidden sm:block">{pageTitle}</h1>
      </div>

      {/* Right: notifications + profile */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="btn-icon btn-ghost relative"
            aria-label="Notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="notification-dot">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-12 w-80 glass-card shadow-2xl z-50 animate-slide-down overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h3 className="font-semibold text-sm">Notifications</h3>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-primary-400 hover:text-primary-300">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-sm">No notifications yet</div>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <button
                      key={n._id}
                      onClick={() => { markRead(n._id); if (n.link) navigate(n.link); setShowNotifs(false); }}
                      className={`w-full text-left px-4 py-3 hover:bg-slate-100 transition-colors border-b border-slate-100 ${!n.isRead ? 'bg-slate-100/50' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 ${notificationColors[n.type] || 'text-primary-400'}`}>
                          {n.type === 'budget_exceeded' ? '🔴' : n.type === 'budget_alert' ? '⚠️' : '🔔'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-800 line-clamp-1">{n.title}</p>
                          <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{n.message}</p>
                          <p className="text-xs text-slate-600 mt-1">
                            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        {!n.isRead && <div className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-1.5" />}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center text-white text-xs font-bold">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <span className="text-sm font-medium text-slate-800 hidden md:block max-w-[100px] truncate">
              {user?.name}
            </span>
            <ChevronDown size={14} className="text-slate-500 hidden md:block" />
          </button>

          {showProfile && (
            <div className="absolute right-0 top-12 w-48 glass-card shadow-2xl z-50 animate-slide-down overflow-hidden">
              <div className="p-3 border-b border-slate-200">
                <p className="text-sm font-semibold text-slate-900 truncate">{user?.name}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
              <div className="p-2 space-y-1">
                <button onClick={() => { navigate('/settings'); setShowProfile(false); }}
                  className="sidebar-link w-full">
                  <Settings size={15} />Profile & Settings
                </button>
                <button onClick={handleLogout}
                  className="sidebar-link w-full text-accent-red hover:text-accent-red hover:bg-accent-red/10">
                  <LogOut size={15} />Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
