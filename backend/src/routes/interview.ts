import express from 'express';
import { startInterview } from '../controllers/interviewController';
import { validateInterviewRequest } from '../middleware/validation';

const router = express.Router();

// POST /api/interview/start
router.post('/start', validateInterviewRequest, startInterview);

// GET /api/interview/status/:sessionId (placeholder for future use)
router.get('/status/:sessionId', (req, res) => {
  res.json({
    message: 'Interview status endpoint - coming soon',
    sessionId: req.params.sessionId,
  });
});

// POST /api/interview/end (placeholder for future use)
router.post('/end', (req, res) => {
  res.json({
    message: 'Interview end endpoint - coming soon',
  });
});

export default router;