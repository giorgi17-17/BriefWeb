import express from 'express';
import { createOrUpdateUser, testRoute } from '../controllers/userController.js';

const router = express.Router();

router.post('/users/google-signin', createOrUpdateUser);
router.get('/test', testRoute);

export default router; 