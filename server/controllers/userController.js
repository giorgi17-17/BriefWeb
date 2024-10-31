import User from '../models/User.js';

// Get user data
export const getUser = async (req, res) => {
  console.log("USERRRRRRRRRRR" + req.params)
  try {
    const { firebaseUID } = req.params;
    console.log('Getting user data for:', firebaseUID);

    const user = await User.findOne({ firebaseUID });
    
    if (!user) {
      console.log('User not found: GET USER', firebaseUID);
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }

    console.log('User found:', user);
    res.status(200).json(user);

  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ 
      message: 'Error getting user data',
      error: error.message 
    });
  }
};

// Update user with new subject
export const addSubject = async (req, res) => {
  try {
    const { firebaseUID } = req.params;
    const { title, description } = req.body;

    console.log('Adding subject for user:', firebaseUID, { title, description });

    const user = await User.findOne({ uid: firebaseUID });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Add new subject
    user.subjects = user.subjects || [];
    user.subjects.push({
      title,
      description,
      createdAt: new Date()
    });

    await user.save();
    console.log('Subject added successfully');

    res.status(200).json({
      message: 'Subject added successfully',
      user: user
    });

  } catch (error) {
    console.error('Error adding subject:', error);
    res.status(500).json({ 
      message: 'Error adding subject',
      error: error.message 
    });
  }
};

// Get user's subjects
export const getUserSubjects = async (req, res) => {
  try {
    const { firebaseUID } = req.params;
    
    const user = await User.findOne({ firebaseUID });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Return empty array if no subjects yet
    res.status(200).json(user.subjects || []);

  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ 
      message: 'Error fetching subjects',
      error: error.message 
    });
  }
};

// Update a subject
export const updateSubject = async (req, res) => {
  try {
    const { firebaseUID, subjectId } = req.params;
    const { title, description } = req.body;

    const user = await User.findOne({ firebaseUID });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const subject = user.subjects.id(subjectId);
    
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    subject.title = title;
    subject.description = description;

    await user.save();

    res.status(200).json({
      message: 'Subject updated successfully',
      subject
    });

  } catch (error) {
    console.error('Error updating subject:', error);
    res.status(500).json({ 
      message: 'Error updating subject',
      error: error.message 
    });
  }
};

// Delete a subject
export const deleteSubject = async (req, res) => {
  try {
    const { firebaseUID, subjectId } = req.params;

    const user = await User.findOne({ firebaseUID });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.subjects.pull(subjectId);
    await user.save();

    res.status(200).json({
      message: 'Subject deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting subject:', error);
    res.status(500).json({ 
      message: 'Error deleting subject',
      error: error.message 
    });
  }
};

export const getUserByFirebaseUID = async (req, res) => {
  console.log("firebase user")
  try {
    const { firebaseUID } = req.params;
    console.log('Fetching user data for:', firebaseUID);

    const user = await User.findOne({ uid: firebaseUID });
    
    if (!user) {
      console.log('User not found:', firebaseUID);
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }

    res.status(200).json(user);

  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ 
      message: 'Error fetching user data',
      error: error.message 
    });
  }
};

// Create or update user after Google sign-in
export const createOrUpdateGoogleUser = async (req, res) => {
  try {
    const { uid, email, displayName, photoURL } = req.body;
    console.log('Creating/Updating user:', { uid, email, displayName, photoURL });

    const user = await User.findOneAndUpdate(
      { uid }, // find by uid
      {
        uid,
        email,
        username: displayName,
        photoURL,
        createdAt: new Date()
      },
      { 
        new: true, // return updated doc
        upsert: true // create if doesn't exist
      }
    );

    console.log('User saved:', user);
    res.status(200).json(user);

  } catch (error) {
    console.error('Error saving user:', error);
    res.status(500).json({ 
      message: 'Error saving user',
      error: error.message 
    });
  }
}; 