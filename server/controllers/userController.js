import User from '../models/User.js';

export const createOrUpdateUser = async (req, res) => {
  try {
    console.log('Received request body:', req.body);
    const { uid, email, displayName, photoURL } = req.body;

    if (!uid || !email || !displayName) {
      console.log('Missing required fields:', { uid, email, displayName });
      return res.status(400).json({ 
        message: 'Missing required fields' 
      });
    }

    // Find user by Firebase UID or create new one
    const user = await User.findOneAndUpdate(
      { uid }, 
      {
        username: displayName,
        email,
        photoURL,
        uid
      },
      { new: true, upsert: true }
    );

    console.log('User saved/updated:', user);

    res.status(200).json({
      message: 'User saved successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        photoURL: user.photoURL
      }
    });

  } catch (error) {
    console.error('Detailed error in createOrUpdateUser:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
};

export const testRoute = (req, res) => {
  res.json({ message: 'Backend is working!' });
}; 