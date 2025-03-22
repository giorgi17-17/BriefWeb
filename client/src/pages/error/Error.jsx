import { Link } from "react-router-dom";
import { useAuth } from "../../utils/authHooks";
import Footer from "../../components/layout/Footer";

export const Error = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-white flex flex-col relative overflow-hidden mt-[150px]">
      {/* Subtle grid background */}
      <div className="absolute inset-0 bg-grid opacity-5" />

      {/* Main content - centered in the viewport */}
      <div className="flex-1 flex items-center justify-center p-4 mb-[300px]">
        <div className="relative z-10 text-center max-w-2xl mx-auto">
          <h1 className="text-[9rem] leading-none font-black text-gray-900 mb-2 tracking-tight">
            404
          </h1>

          <div className="w-16 h-1 mx-auto bg-blue-600 mb-6" />

          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Page Not Found
          </h2>

          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            The resource you&apos;re looking for doesn&apos;t exist or has been
            moved. Please check the URL or navigate back to the home page.
          </p>

          {user ? (
            <Link
              to="/dashboard"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z"
                  clipRule="evenodd"
                />
              </svg>
              Return to Dashboard
            </Link>
          ) : (
            <Link
              to="/"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z"
                  clipRule="evenodd"
                />
              </svg>
              Return to Home
            </Link>
          )}
        </div>
      </div>

      {/* Spacer to push footer down */}
      <div className="h-16"></div>

      {/* Footer at the bottom */}
      <Footer />

      <style>{`
        .bg-grid {
          background-image: 
            linear-gradient(to right, #e5e7eb 1px, transparent 1px),
            linear-gradient(to bottom, #e5e7eb 1px, transparent 1px);
          background-size: 20px 20px;
        }
      `}</style>
    </div>
  );
};
