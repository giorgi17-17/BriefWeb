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

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const saveUserToMongoDB = async (userData) => {
    try {
      console.log('Saving user data to MongoDB:', userData);
      
      const response = await axios.post('http://localhost:5000/api/users/google-signin', {
        uid: userData.uid,
        email: userData.email,
        displayName: userData.displayName,
        photoURL: userData.photoURL
      });
      
      console.log('User saved to MongoDB:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error saving user to MongoDB:', error);
      throw error;
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      console.log('Google sign-in result:', result);

      if (result.user) {
        await saveUserToMongoDB({
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName || result.user.email.split('@')[0],
          photoURL: result.user.photoURL || ''
        });
        
        // Navigate after successful save
        navigate('/');
      }
    } catch (error) {
      console.error('Sign in error:', error);
      setError(error.message);
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
      </div>
    </div>
  );
};

export default Login;