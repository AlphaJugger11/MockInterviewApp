import express from 'express';
import { startInterview, createConversation, endConversation, analyzeInterview } from '../controllers/interviewController';
import { validateInterviewRequest, validateConversationRequest } from '../middleware/validation';

const router = express.Router();

// POST /api/interview/create-conversation - Enhanced dynamic persona endpoint
router.post('/create-conversation', validateConversationRequest, createConversation);

// POST /api/interview/end-conversation - New endpoint to terminate sessions
router.post('/end-conversation', endConversation);

// POST /api/interview/analyze - New endpoint for AI-powered analysis
router.post('/analyze', analyzeInterview);

// POST /api/interview/start - Legacy endpoint
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