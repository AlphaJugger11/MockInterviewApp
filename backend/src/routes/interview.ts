import express from 'express';
import multer from 'multer';
import { 
  startInterview, 
  createConversation, 
  endConversation, 
  analyzeInterview, 
  conversationCallback, 
  getConversation, 
  uploadRecordingFile, 
  uploadTranscriptFile, 
  getDownloadUrls, 
  getUserTranscripts,
  deleteRecordingFile 
} from '../controllers/interviewController';
import { validateInterviewRequest, validateConversationRequest } from '../middleware/validation';

const router = express.Router();

// Configure multer for file uploads with FIXED file filter for WebM files
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit (Supabase free tier maximum)
  },
  fileFilter: (req, file, cb) => {
    console.log('📁 File upload attempt:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
    
    // FIXED: Accept WebM video files specifically and handle MIME type issues
    const allowedMimeTypes = [
      'video/webm',
      'video/mp4',
      'audio/webm',
      'audio/mp4',
      'video/x-msvideo', // .avi
      'video/quicktime'  // .mov
    ];
    
    // CRITICAL FIX: Handle cases where MIME type might be incorrectly detected
    const isVideoFile = file.mimetype.startsWith('video/') || 
                       file.mimetype.startsWith('audio/') ||
                       allowedMimeTypes.includes(file.mimetype) ||
                       file.originalname.toLowerCase().endsWith('.webm') ||
                       file.originalname.toLowerCase().endsWith('.mp4');
    
    if (isVideoFile) {
      console.log('✅ File type accepted:', file.mimetype, 'Original name:', file.originalname);
      cb(null, true);
    } else {
      console.error('❌ File type rejected:', file.mimetype, 'Original name:', file.originalname);
      cb(new Error(`File type not allowed: ${file.mimetype}. Only video and audio files are accepted. Supported formats: WebM, MP4.`));
    }
  }
});

// POST /api/interview/create-conversation - Enhanced conversation endpoint with webhook transcription
router.post('/create-conversation', validateConversationRequest, createConversation);

// GET /api/interview/get-conversation/:conversationId - Get conversation data with webhook transcript
router.get('/get-conversation/:conversationId', getConversation);

// POST /api/interview/end-conversation - Endpoint to terminate sessions with cleanup
router.post('/end-conversation', endConversation);

// POST /api/interview/analyze - Endpoint for AI-powered analysis with real webhook data
router.post('/analyze', analyzeInterview);

// POST /api/interview/conversation-callback - CRITICAL: Webhook for conversation transcripts from Tavus
router.post('/conversation-callback', conversationCallback);

// POST /api/interview/upload-recording - Upload recording to Supabase (FIXED file handling)
router.post('/upload-recording', upload.single('recording'), uploadRecordingFile);

// POST /api/interview/upload-transcript - Upload transcript to Supabase
router.post('/upload-transcript', uploadTranscriptFile);

// GET /api/interview/download-urls/:conversationId - Get download URLs for session files
router.get('/download-urls/:conversationId', getDownloadUrls);

// GET /api/interview/user-transcripts/:userId - Get user transcripts (persistent storage)
router.get('/user-transcripts/:userId', getUserTranscripts);

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