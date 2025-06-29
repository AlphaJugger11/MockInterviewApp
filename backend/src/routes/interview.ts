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

// FIXED: Configure multer with PROPER FILE TYPE DETECTION (Based on Supabase example)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log('📁 FIXED File upload attempt:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
    
    // CRITICAL FIX: Proper MIME type detection and validation (Based on Supabase example)
    const allowedMimeTypes = [
      'video/webm',
      'video/mp4',
      'audio/webm', 
      'audio/mp4',
      'video/x-msvideo', // .avi
      'video/quicktime'  // .mov
    ];
    
    // ENHANCED: Check both MIME type AND file extension
    const isValidMimeType = allowedMimeTypes.includes(file.mimetype);
    const hasValidExtension = file.originalname && (
      file.originalname.toLowerCase().endsWith('.webm') ||
      file.originalname.toLowerCase().endsWith('.mp4') ||
      file.originalname.toLowerCase().endsWith('.avi') ||
      file.originalname.toLowerCase().endsWith('.mov')
    );
    
    console.log('🔍 FIXED File validation:', {
      mimetype: file.mimetype,
      isValidMimeType,
      hasValidExtension,
      filename: file.originalname
    });
    
    // FIXED: Accept if EITHER MIME type is valid OR extension is valid
    if (isValidMimeType || hasValidExtension) {
      console.log('✅ FIXED File type accepted:', file.mimetype, 'Original name:', file.originalname);
      cb(null, true);
    } else {
      console.error('❌ FIXED File type rejected:', {
        mimetype: file.mimetype,
        filename: file.originalname,
        allowedTypes: allowedMimeTypes
      });
      cb(new Error(`File type not allowed: ${file.mimetype}. Only video and audio files are accepted. Supported formats: WebM, MP4, AVI, MOV.`));
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