import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white shadow-md mb-8">
      <div className="container mx-auto px-4 py-4">
        <nav className="flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-gray-800">
            Brief
          </Link>
          
          <div className="flex items-center gap-4">
          <div className="space-x-4">
            <Link 
              to="/" 
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Home
            </Link>
          </div>
            {user ? (
              <>
                <span className="text-gray-600">{user.email}</span>
                <button
                  onClick={logout}
                  className="px-4 py-2 text-sm text-red-600 hover:text-red-800"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800"
              >
                Login
              </Link>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}

export default Header; 