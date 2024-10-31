import express from 'express';
import {
  createSubject,
  getAllSubjects,
  getUserSubjects,
  updateSubject,
  deleteSubject
} from '../controllers/subjectController.js';

const router = express.Router();

// Subject routes
router.post('/subjects', createSubject);
router.get('/subjects', getAllSubjects);
router.get('/subjects/user/:userId', getUserSubjects);
router.put('/subjects/:id', updateSubject);
router.delete('/subjects/:id', deleteSubject);

export default router; 