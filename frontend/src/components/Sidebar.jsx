import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: HomeIcon },
  { to: '/translate', label: 'Translate',  icon: PenIcon },
];

const ADMIN_NAV = [
  { to: '/admin', label: 'Admin Panel', icon: ShieldIcon },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
     ${isActive
       ? 'bg-liberia-red text-white'
       : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`;

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col bg-white border-r border-gray-200 min-h-screen">
      {/* Logo */}
      <a href="/" className="flex items-center gap-2 px-4 py-5 border-b border-gray-100 hover:bg-gray-50 transition-colors">
        <span className="text-liberia-red font-black text-2xl leading-none">L</span>
        <span className="font-bold text-sm text-gray-800 leading-tight">lib<span className="text-liberia-red">lingua</span></span>
      </a>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={linkClass} end>
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}

        {user?.is_admin && (
          <>
            <div className="pt-3 pb-1 px-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Admin</p>
            </div>
            {ADMIN_NAV.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={linkClass}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-gray-100">
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="w-7 h-7 rounded-full bg-liberia-red text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-800 truncate">{user?.name}</p>
            <p className="text-[10px] text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
        >
          <LogoutIcon className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}

// Minimal inline SVG icons (no external icon lib dependency)
function HomeIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function PenIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function ShieldIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function LogoutIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}
