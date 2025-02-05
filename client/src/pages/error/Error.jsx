import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export const Error = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <h1 className="text-6xl font-extrabold text-gray-800">404</h1>
      <p className="mt-4 text-xl text-gray-600">Oops! Page not found.</p>
      <p className="mt-2 text-gray-500 text-center max-w-md">
        The page you&apos;re looking for might have been removed or is
        temporarily unavailable.
      </p>

      {user ? (
        <div  className="mt-6 inline-block px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
          <Link to="/dashboard" className="font-bold text-xl">
          Go Home
          </Link>
        </div>
      ) : (
        <div  className="mt-6 inline-block px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
          <Link to="/" className="font-bold text-xl">
          Go Home
          </Link>
        </div>
      )}
      
    </div>
  );
};
