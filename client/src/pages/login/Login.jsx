import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { auth, provider } from '../../config/firebase';
import { signInWithPopup } from '@firebase/auth';

const Login = () => {
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Use useEffect for navigation
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const saveUserToMongoDB = async (userData) => {
    try {
      console.log('Attempting to save user data:', userData);

      const response = await axios.post('http://localhost:5000/api/users/google-signin', {
        uid: userData.uid,
        email: userData.email,
        displayName: userData.displayName,
        photoURL: userData.photoURL
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Server response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error saving user to MongoDB:', error.response?.data || error.message);
      throw error;
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const data = await signInWithPopup(auth, provider);
      console.log('Firebase sign-in result:', data);

      if (data.user) {
        const userData = {
          uid: data.user.uid,
          email: data.user.email,
          displayName: data.user.displayName || data.user.email.split('@')[0],
          photoURL: data.user.photoURL || ''
        };
        
        console.log('Preparing to save user data:', userData);
        await saveUserToMongoDB(userData);
        console.log('User data saved successfully');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      setError(errorMessage);
      console.error('Detailed sign-in error:', error);
    }
  };

  // Don't render anything if user is already logged in
  if (user) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        <div className="mt-8 space-y-6">
          <button
            onClick={handleGoogleSignIn}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 border-gray-300"
          >
            <div className="flex items-center justify-center">
              <img
                className="h-5 w-5 mr-2"
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google logo"
              />
              <span>Sign in with Google</span>
            </div>
          </button>
        </div>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">
                Protected by Firebase Auth
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;