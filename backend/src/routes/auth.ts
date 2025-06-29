import express from 'express';
import { registerUser, loginUser, verifyToken, getCurrentUser } from '../controllers/authController';

const router = express.Router();

// POST /api/auth/register - Register new user
router.post('/register', registerUser);

// POST /api/auth/login - Login user
router.post('/login', loginUser);

// GET /api/auth/verify - Verify token
router.get('/verify', verifyToken, getCurrentUser);

// GET /api/auth/me - Get current user (protected route)
router.get('/me', verifyToken, getCurrentUser);

export default router;