import express from 'express';
import { registerUser, loginUser, verifyToken } from '../controllers/authController';

const router = express.Router();

// POST /api/auth/register - Register new user
router.post('/register', registerUser);

// POST /api/auth/login - Login user
router.post('/login', loginUser);

// GET /api/auth/verify - Verify token
router.get('/verify', verifyToken, (req, res) => {
  res.json({
    success: true,
    user: (req as any).user
  });
});

export default router;