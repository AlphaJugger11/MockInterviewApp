import express from 'express';
import multer from 'multer';
import { startInterview, createConversation, endConversation, analyzeInterview, conversationCallback, getConversation, uploadRecordingFile, uploadTranscriptFile, getDownloadUrls, deleteRecordingFile } from '../controllers/interviewController';
import { validateInterviewRequest, validateConversationRequest } from '../middleware/validation';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video and audio files are allowed'));
    }
  }
});

// POST /api/interview/create-conversation - Enhanced dynamic persona endpoint WITHOUT S3 recording
router.post('/create-conversation', validateConversationRequest, createConversation);

// GET /api/interview/get-conversation/:conversationId - Get conversation data
router.get('/get-conversation/:conversationId', getConversation);

// POST /api/interview/end-conversation - Endpoint to terminate sessions
router.post('/end-conversation', endConversation);

// POST /api/interview/analyze - Endpoint for AI-powered analysis with real data
router.post('/analyze', analyzeInterview);

// POST /api/interview/conversation-callback - Webhook for conversation transcripts
router.post('/conversation-callback', conversationCallback);

// POST /api/interview/upload-recording - Upload recording to Supabase
router.post('/upload-recording', upload.single('recording'), uploadRecordingFile);

// POST /api/interview/upload-transcript - Upload transcript to Supabase
router.post('/upload-transcript', uploadTranscriptFile);

// GET /api/interview/download-urls/:conversationId - Get download URLs for files
router.get('/download-urls/:conversationId', getDownloadUrls);

// DELETE /api/interview/delete-recording/:conversationId - Delete recording from Supabase
router.delete('/delete-recording/:conversationId', deleteRecordingFile);

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