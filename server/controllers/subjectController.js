import Subject from '../models/Subject.js';
import User from '../models/User.js';

// Create a new subject
export const createSubject = async (req, res) => {
  try {
    console.log('Creating subject with data:', req.body);
    const { title, description, userId: firebaseUID } = req.body;

    // First, find the user by their Firebase UID
    const user = await User.findOne({ firebaseUID });
    
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }

    if (!title || !description) {
      return res.status(400).json({ 
        message: 'Missing required fields' 
      });
    }

    const newSubject = new Subject({
      title,
      description,
      createdBy: user._id // Use the MongoDB _id instead of Firebase UID
    });

    await newSubject.save();
    console.log('Subject created:', newSubject);

    // Populate the createdBy field with user data
    await newSubject.populate('createdBy', 'username email');

    res.status(201).json({
      message: 'Subject created successfully',
      subject: newSubject
    });

  } catch (error) {
    console.error('Error creating subject:', error);
    res.status(500).json({ 
      message: 'Error creating subject',
      error: error.message 
    });
  }
};

// Get all subjects
export const getAllSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find()
      .populate('createdBy', 'username email') // This will include user details
      .sort({ createdAt: -1 }); // Sort by newest first

    res.status(200).json(subjects);

  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ 
      message: 'Error fetching subjects',
      error: error.message 
    });
  }
};

// Get subjects by user ID
export const getUserSubjects = async (req, res) => {
  try {
    const { userId } = req.params;
    const subjects = await Subject.find({ createdBy: userId })
      .populate('createdBy', 'username email')
      .sort({ createdAt: -1 });

    res.status(200).json(subjects);

  } catch (error) {
    console.error('Error fetching user subjects:', error);
    res.status(500).json({ 
      message: 'Error fetching user subjects',
      error: error.message 
    });
  }
};

// Update a subject
export const updateSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;

    const updatedSubject = await Subject.findByIdAndUpdate(
      id,
      { title, description },
      { new: true }
    ).populate('createdBy', 'username email');

    if (!updatedSubject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    res.status(200).json({
      message: 'Subject updated successfully',
      subject: updatedSubject
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
    const { id } = req.params;
    const deletedSubject = await Subject.findByIdAndDelete(id);

    if (!deletedSubject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    res.status(200).json({
      message: 'Subject deleted successfully',
      subject: deletedSubject
    });

  } catch (error) {
    console.error('Error deleting subject:', error);
    res.status(500).json({ 
      message: 'Error deleting subject',
      error: error.message 
    });
  }
}; 