import { useAuth } from "../../utils/authHooks";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Future feature: Edit profile functionality
  const handleEditProfile = () => {
    console.log("Edit profile clicked");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-100 to-purple-100">
      <h1 className="text-3xl font-bold text-gray-800 mb-20">
        We will make this page better soon. PROMISE!!
      </h1>
      <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-md">
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-3xl text-gray-400">
                {user.email.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <h2 className="mt-4 text-xl font-semibold text-gray-800">
            Hello, {user.displayName || user.email.split("@")[0]}
          </h2>
          <p className="text-gray-600 mt-1">Welcome to your profile</p>
        </div>
        <div className="mt-6 border-t pt-4">
          <div className="mb-4">
            <label className="block text-gray-700 text-sm mb-1">Email</label>
            <input
              type="email"
              value={user.email}
              readOnly
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
          {/* Future feature: Editable fields can be added here */}
          <div className="flex gap-4">
            <button
              onClick={handleEditProfile}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Edit Profile
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
