import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className="bg-liberia-blue text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            to="/"
            className="font-black text-xl tracking-tight hover:text-gray-300 transition-colors flex items-center gap-1"
          >
            <span className="text-liberia-red font-black text-2xl leading-none">lib</span>
            <span className="text-white">lingua</span>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-5 text-sm font-semibold">
            <Link to="/contributors" className="hover:text-gray-300 transition-colors hidden sm:block">
              Contributors
            </Link>
            <a href="/#researchers" className="hover:text-gray-300 transition-colors hidden md:block">
              Researchers
            </a>
            <Link to="/datasets" className="hover:text-gray-300 transition-colors hidden md:block">
              Datasets
            </Link>
            <Link to="/campaigns" className="hover:text-gray-300 transition-colors hidden md:block">
              Campaigns
            </Link>
            <Link to="/api-docs" className="hover:text-gray-300 transition-colors hidden md:block">
              API Docs
            </Link>
            <Link to="/faq" className="hover:text-gray-300 transition-colors hidden md:block">
              FAQ
            </Link>
            <Link to="/donate"
              className="bg-liberia-red hover:bg-red-700 text-white font-bold px-4 py-1.5 rounded-lg transition-colors hidden md:block text-sm">
              Donate
            </Link>
            {user ? (
              <>
                <Link to="/translate" className="hover:text-gray-300 transition-colors hidden sm:block">
                  Translate
                </Link>
                <Link to="/dashboard" className="hover:text-gray-300 transition-colors hidden sm:block">
                  Dashboard
                </Link>
                {(user.is_admin || ['RESEARCHER','MODERATOR','ANALYST'].includes(user.role)) && (
                  <Link to="/admin" className="hover:text-gray-300 transition-colors hidden sm:block">
                    Admin
                  </Link>
                )}
                <span className="text-white/20 hidden sm:block">|</span>
                <span className="text-gray-400 text-xs hidden sm:block truncate max-w-[120px]">
                  {user.name}
                </span>
                <button
                  onClick={handleLogout}
                  className="bg-liberia-red hover:bg-red-800 text-white px-4 py-1.5 rounded text-sm transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/auth" className="hover:text-gray-300 transition-colors">
                  Sign In
                </Link>
                <Link
                  to="/auth?tab=register"
                  className="bg-liberia-red hover:bg-red-800 text-white px-4 py-1.5 rounded transition-colors"
                >
                  Contribute
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
