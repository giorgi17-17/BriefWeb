import express from 'express';
import { 
  getUserByFirebaseUID, 
  addSubject,
  createOrUpdateGoogleUser 
} from '../controllers/userController.js';

const router = express.Router();

// User routes
router.post('/users/google-signin', createOrUpdateGoogleUser);
router.get('/users/:firebaseUID', getUserByFirebaseUID);
router.post('/users/:firebaseUID/subjects', addSubject);

export default router; 