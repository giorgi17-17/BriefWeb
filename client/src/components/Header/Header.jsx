import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {CircleUserRound} from "lucide-react";
function Header() {
  const { user } = useAuth();
  // const navigate = useNavigate();

  // const handleLogout = async () => {
  //   try {
  //     await logout();
  //     navigate("/login");
  //   } catch (error) {
  //     console.error("Error signing out:", error);
  //   }
  // };

  return (
    <header className="bg-white">
      <div className="container mx-auto px-4 py-4">
        <nav className="flex items-center justify-between">
          {user ? (
            <div>
              <Link to="/dashboard" className="font-bold text-xl">
                Brief
              </Link>
            </div>
          ) : (
            <div>
              <Link to="/" className="font-bold text-xl">
                Brief
              </Link>
            </div>
          )}

          <div className="flex items-center gap-4">
            {user ? (
              <div>
                <Link  to="/profile" className="flex items-center gap-2">
                <CircleUserRound />
                </Link>

                {/* <span className="text-sm text-muted-foreground">
                  {user.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm text-red-600 hover:text-red-800 border border-transparent hover:border-red-800 rounded"
                >
                  Logout
                </button> */}
              </div>
            ) : (
              <div>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Login
                </Link>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}

export default Header;
