import axios from 'axios';

const BACKEND_URL = 'http://localhost:5000';

export async function getUserByFirebaseUID(firebaseUID) {
  const options = {
    method: "GET",
    url: `${BACKEND_URL}/api/users/${firebaseUID}`,
    headers: {
      accept: "application/json",
    },
  };

  try {
    const response = await axios.request(options);
    console.log('User data fetched:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching user data:', error);
    throw error;
  }
} 