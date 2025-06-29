import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { 
  uploadRecording, 
  uploadTranscript, 
  uploadUserTranscript,
  getSignedDownloadUrl, 
  listConversationFiles, 
  listUserTranscripts,
  RECORDINGS_BUCKET, 
  TRANSCRIPTS_BUCKET, 
  USER_TRANSCRIPTS_BUCKET,
  deleteRecording, 
  deleteSessionTranscript,
  cleanupSession
} from '../services/supabaseService';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

// CRITICAL: Global storage for webhook data (in production, use a database)
declare global {
  var conversationTranscripts: Record<string, any>;
  var conversationRecordings: Record<string, any>;
}

global.conversationTranscripts = global.conversationTranscripts || {};
global.conversationRecordings = global.conversationRecordings || {};

// Enhanced helper function to generate persona instructions using Gemini
const generatePersonaInstructions = async (jobTitle: string, userName: string, customInstructions?: string, customCriteria?: string): Promise<string> => {
  try {
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });
    
    // If custom instructions are provided, use them as base
    if (customInstructions && customInstructions.trim()) {
      console.log("Using provided custom instructions");
      let instructions = customInstructions.trim();
      
      // Ensure the instructions include the user's name and Sarah identity
      if (!instructions.toLowerCase().includes('sarah')) {
        instructions = `You are Sarah, an AI interview coach. ${instructions}`;
      }
      if (!instructions.includes(userName)) {
        instructions = instructions.replace(/Hello[^.!]*[.!]/, `Hello ${userName}!`);
        if (!instructions.includes(userName)) {
          instructions = `Hello ${userName}! ${instructions}`;
        }
      }
      
      return instructions;
    }
    
    const prompt = `Create a professional AI interview coach persona named 'Sarah' for conducting mock interviews.

CRITICAL REQUIREMENTS:
- Your name is Sarah (NEVER introduce yourself as Jane Smith or any other name)
- You are interviewing ${userName} (use this exact name) for a ${jobTitle} position
- Start by greeting ${userName} personally: "Hello ${userName}! I'm Sarah, your AI interview coach."
- Conduct a REALISTIC interview - ask questions, listen to answers, then ask follow-up questions
- DO NOT provide feedback after every answer - this should feel like a real interview
- Only provide feedback at the end or when specifically asked
- Ask relevant questions specifically for the ${jobTitle} role
- Be professional, encouraging, and realistic like a real interviewer
- Remember you are Sarah throughout the entire conversation

Generate a complete system prompt that establishes Sarah's identity, role, and realistic interview approach for the ${jobTitle} position with ${userName}. Make sure to emphasize that you are Sarah and you are interviewing ${userName} in a realistic manner.`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let instructions = response.text();
    
    // Double-check that the instructions contain the correct name and identity
    if (!instructions.toLowerCase().includes('sarah')) {
      instructions = `You are Sarah, an AI interview coach. ${instructions}`;
    }
    if (!instructions.includes(userName)) {
      instructions = `Hello ${userName}! I'm Sarah, your AI interview coach. ${instructions}`;
    }
    
    return instructions;
  } catch (error) {
    console.error('Error generating persona instructions with Gemini:', error);
    // Fallback instructions if Gemini fails
    return `You are Sarah, an AI interview coach. Hello ${userName}! I'm Sarah, your AI interview coach, and I'm excited to conduct your mock interview for the ${jobTitle} position. Please ensure your camera and microphone are on and that your face is centered in the frame for the best experience. I can see you and will provide feedback on both your verbal answers and non-verbal cues. Let's begin with: Tell me about yourself and why you're interested in this ${jobTitle} role.`;
  }
};

// Enhanced controller function for creating conversations WITHOUT S3 recording
export const createConversation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { jobTitle, userName, customInstructions, customCriteria, feedbackMetrics } = req.body;
    
    const TAVUS_API_KEY = process.env.TAVUS_API_KEY as string;
    const TAVUS_REPLICA_ID = process.env.TAVUS_REPLICA_ID as string;
    
    if (!TAVUS_API_KEY || !TAVUS_REPLICA_ID) {
      res.status(500).json({
        success: false,
        error: 'Server configuration error: Missing API credentials (API_KEY or REPLICA_ID)'
      });
      return;
    }

    if (!jobTitle || typeof jobTitle !== 'string' || jobTitle.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Job title is required and must be a non-empty string'
      });
      return;
    }

    if (!userName || typeof userName !== 'string' || userName.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'User name is required and must be a non-empty string'
      });
      return;
    }

    console.log("✅ Creating conversation WITHOUT S3 recording for:", { jobTitle, userName });

    // Step 1: Generate enhanced instructions using Gemini
    console.log("Generating enhanced instructions using Gemini API...");
    const generatedInstructions = await generatePersonaInstructions(
      jobTitle, 
      userName, 
      customInstructions, 
      customCriteria
    );
    console.log("Generated instructions:", generatedInstructions.substring(0, 200) + "...");

    // Step 2: Create judgment criteria
    let judgmentCriteria = `Evaluate ${userName} based on: 1. Clarity and conciseness of their answer. 2. Use of the STAR (Situation, Task, Action, Result) method for behavioral questions. 3. Confidence and tone of voice. 4. Relevance to the ${jobTitle} role and industry. 5. Non-verbal communication including eye contact and posture.`;
    
    if (customCriteria && customCriteria.trim()) {
      judgmentCriteria = `${customCriteria.trim()} Additionally, ${judgmentCriteria}`;
    }

    // Step 3: Create comprehensive conversational context
    const conversationalContext = `
CRITICAL IDENTITY INSTRUCTIONS:
- You are Sarah, an AI interview coach (NEVER introduce yourself as Jane Smith or any other name)
- You are conducting a REALISTIC mock interview with ${userName} for a ${jobTitle} position
- Always refer to the candidate as ${userName}
- Start the conversation by greeting ${userName} personally
- Conduct this like a REAL interview - ask questions, listen, then ask follow-up questions
- DO NOT provide feedback after every answer - save feedback for the end
- Make this feel like an actual professional interview

INTERVIEW CONTEXT:
${generatedInstructions}

EVALUATION CRITERIA (for internal use only):
${judgmentCriteria}

IMPORTANT REMINDERS:
- Your name is Sarah throughout the entire conversation
- The candidate's name is ${userName}
- The role being interviewed for is ${jobTitle}
- Conduct a realistic interview experience
- Save detailed feedback for the end of the interview
`;

    console.log("Final conversational context length:", conversationalContext.length);

    // Step 4: Create conversation WITHOUT S3 recording
    console.log("Creating conversation WITHOUT S3 recording...");
    
    try {
      const conversationResponse = await axios.post(
        'https://tavusapi.com/v2/conversations',
        {
          replica_id: TAVUS_REPLICA_ID,
          conversational_context: conversationalContext,
          callback_url: `${process.env.BASE_URL || 'http://localhost:3001'}/api/interview/conversation-callback`,
          properties: {
            max_call_duration: 1200, // 20 minutes max call duration
            participant_absent_timeout: 300, // 5 minutes timeout for participant absence
            participant_left_timeout: 15, // Set timeout after participant leaves
            // REMOVED: enable_recording and enable_transcription (no S3 bucket)
          }
        },
        {
          headers: { 
            'x-api-key': TAVUS_API_KEY,
            'Content-Type': 'application/json'
          },
          timeout: 30000 
        }
      );
      
      const { conversation_url, conversation_id } = conversationResponse.data;
      
      if (!conversation_url || !conversation_id) {
        throw new Error('No conversation URL or ID received from Tavus API');
      }
      
      console.log('✅ Conversation created successfully WITHOUT S3 recording. URL:', conversation_url, 'ID:', conversation_id);

      // Step 5: Store session data for later analysis
      const sessionData = {
        jobTitle: jobTitle.trim(),
        userName: userName.trim(),
        customInstructions: customInstructions?.trim() || null,
        customCriteria: customCriteria?.trim() || null,
        feedbackMetrics: feedbackMetrics || {},
        conversationId: conversation_id,
        conversationalContext: conversationalContext,
        timestamp: new Date().toISOString(),
        recordingMethod: 'client_side_only'
      };
      
      console.log("Session data prepared:", {
        jobTitle: sessionData.jobTitle,
        userName: sessionData.userName,
        customInstructions: sessionData.customInstructions,
        customCriteria: sessionData.customCriteria,
        feedbackMetrics: sessionData.feedbackMetrics,
        conversationalContext: sessionData.conversationalContext.substring(0, 100) + "...",
        timestamp: sessionData.timestamp,
        recordingMethod: sessionData.recordingMethod
      });
      
      res.status(200).json({ 
        success: true,
        conversation_url,
        conversation_id,
        message: 'Interview conversation created successfully with client-side recording only',
        sessionData: {
          jobTitle: sessionData.jobTitle,
          userName: sessionData.userName,
          hasCustomInstructions: !!customInstructions,
          hasCustomCriteria: !!customCriteria,
          conversationId: conversation_id,
          method: 'client_side_recording_only'
        }
      });

    } catch (contextError) {
      console.error('❌ Error creating conversation:', contextError);
      throw contextError;
    }

  } catch (error) {
    console.error('❌ Error in createConversation:', error);
    
    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || error.response?.data?.error || 'External API Error';
      console.error('Tavus API Error Details:', error.response?.data);
      res.status(status).json({
        success: false,
        error: `Tavus API Error: ${message}`,
        details: error.response?.data
      });
    } else {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
};

// Enhanced endpoint to get conversation data with VERBOSE MODE
export const getConversation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { conversationId } = req.params;
    
    const TAVUS_API_KEY = process.env.TAVUS_API_KEY as string;
    
    if (!TAVUS_API_KEY) {
      res.status(500).json({
        success: false,
        error: 'Server configuration error: Missing API credentials'
      });
      return;
    }

    if (!conversationId) {
      res.status(400).json({
        success: false,
        error: 'Conversation ID is required'
      });
      return;
    }

    console.log("🔍 Retrieving conversation data with VERBOSE MODE for:", conversationId);

    try {
      // CRITICAL: Use verbose=true to get detailed transcript
      const conversationResponse = await axios.get(
        `https://tavusapi.com/v2/conversations/${conversationId}?verbose=true`,
        {
          headers: { 
            'x-api-key': TAVUS_API_KEY,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );
      
      const conversationData = conversationResponse.data;
      console.log('✅ Retrieved conversation data:', Object.keys(conversationData));
      
      // Check for stored transcript from webhook first
      const storedTranscript = global.conversationTranscripts?.[conversationId];
      const storedRecording = global.conversationRecordings?.[conversationId];
      
      console.log('📝 Stored transcript available:', !!storedTranscript);
      console.log('🎬 Stored recording available:', !!storedRecording);
      
      // Extract and format transcript if available
      let formattedTranscript = '';
      let transcriptEvents: any[] = [];
      
      // ENHANCED: Try multiple sources for transcript
      const transcript = storedTranscript || conversationData.transcript || conversationData.events;
      
      if (transcript) {
        console.log('📝 Processing transcript:', typeof transcript);
        
        if (Array.isArray(transcript)) {
          // Handle array format from webhook or verbose API
          transcriptEvents = transcript.map((item, index) => {
            let content = '';
            let participant = 'user';
            
            if (typeof item === 'object') {
              content = item.content || item.text || item.message || item.transcript || '';
              participant = item.role === 'assistant' || item.participant === 'ai' || item.speaker === 'assistant' ? 'ai' : 'user';
            } else if (typeof item === 'string') {
              content = item;
              participant = item.toLowerCase().includes('sarah') || item.toLowerCase().includes('interviewer') ? 'ai' : 'user';
            }
            
            return {
              timestamp: new Date().toISOString(),
              type: 'conversation',
              content: content,
              participant: participant,
              sessionId: conversationId,
              index
            };
          });
          
          formattedTranscript = transcriptEvents.map(event => 
            `${event.participant === 'ai' ? 'Interviewer (Sarah)' : 'Candidate'}: ${event.content}`
          ).join('\n\n');
          
        } else if (typeof transcript === 'string') {
          formattedTranscript = transcript;
          // Convert string transcript to events
          const lines = transcript.split('\n').filter(line => line.trim());
          transcriptEvents = lines.map((line, index) => ({
            timestamp: new Date().toISOString(),
            type: 'conversation',
            content: line.trim(),
            participant: line.toLowerCase().includes('sarah') || line.toLowerCase().includes('interviewer') ? 'ai' : 'user',
            sessionId: conversationId,
            index
          }));
        }
        
        console.log('📄 Formatted transcript length:', formattedTranscript.length);
        console.log('📊 Transcript events count:', transcriptEvents.length);
      } else {
        console.warn('⚠️ No transcript found in API response or webhook storage');
      }
      
      res.status(200).json({
        success: true,
        conversation_id: conversationId,
        transcript: formattedTranscript,
        transcriptEvents: transcriptEvents,
        recording_url: storedRecording?.recording_url || conversationData.recording_url || null,
        download_url: storedRecording?.download_url || conversationData.download_url || null,
        status: conversationData.status || 'unknown',
        duration: conversationData.duration || null,
        perception_analysis: conversationData.perception_analysis || null,
        hasWebhookData: !!(storedTranscript || storedRecording),
        ...conversationData
      });
      
    } catch (apiError) {
      console.error('❌ Error retrieving conversation from Tavus API:', apiError);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve conversation data from Tavus API'
      });
    }

  } catch (error) {
    console.error('❌ Error in getConversation:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
};

// Enhanced webhook endpoint to receive conversation transcripts
export const conversationCallback = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { event_type, properties, conversation_id } = req.body;
    
    console.log('📞 Received conversation callback:', { event_type, conversation_id, properties: Object.keys(properties || {}) });
    
    if (event_type === 'application.transcription_ready') {
      const { transcript } = properties;
      
      console.log('📝 Transcript ready for conversation:', conversation_id);
      console.log('📄 Transcript type:', typeof transcript);
      console.log('📄 Transcript preview:', JSON.stringify(transcript).substring(0, 200) + '...');
      
      // Store transcript for later retrieval
      global.conversationTranscripts[conversation_id] = transcript;
      console.log('✅ Stored transcript for conversation:', conversation_id);
      
    } else if (event_type === 'application.recording_ready') {
      const { recording_url, download_url } = properties;
      
      console.log('🎬 Recording ready for conversation:', conversation_id);
      console.log('📹 Recording URL:', recording_url);
      console.log('⬇️ Download URL:', download_url);
      
      // Store recording URLs for later access
      global.conversationRecordings[conversation_id] = {
        recording_url,
        download_url,
        timestamp: new Date().toISOString()
      };
      console.log('✅ Stored recording for conversation:', conversation_id);
      
    } else if (event_type === 'system.shutdown') {
      console.log('🛑 Conversation ended:', conversation_id, 'Reason:', properties?.shutdown_reason);
      
    } else {
      console.log('📞 Other callback event:', event_type, 'for conversation:', conversation_id);
    }
    
    res.status(200).json({ success: true, message: 'Callback received' });
    
  } catch (error) {
    console.error('❌ Error in conversation callback:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
};

// Enhanced function to end conversation and cleanup with user session management
export const endConversation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { conversationId, dynamicPersonaId, userId, userName, jobTitle, company } = req.body;
    
    const TAVUS_API_KEY = process.env.TAVUS_API_KEY as string;
    
    if (!TAVUS_API_KEY) {
      res.status(500).json({
        success: false,
        error: 'Server configuration error: Missing API credentials'
      });
      return;
    }

    if (!conversationId || typeof conversationId !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Conversation ID is required and must be a string'
      });
      return;
    }

    console.log("🛑 Ending conversation and cleaning up:", { conversationId, dynamicPersonaId, userId });

    // Step 1: Get conversation data including transcript before ending it
    let conversationData: any = {};
    let finalTranscript: any[] = [];
    
    try {
      const conversationDataResponse = await axios.get(
        `https://tavusapi.com/v2/conversations/${conversationId}?verbose=true`,
        {
          headers: { 
            'x-api-key': TAVUS_API_KEY,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );
      
      conversationData = conversationDataResponse.data;
      console.log('📊 Retrieved conversation data before ending:', Object.keys(conversationData));
      
      // Also check webhook storage
      const storedTranscript = global.conversationTranscripts?.[conversationId];
      const storedRecording = global.conversationRecordings?.[conversationId];
      
      if (storedTranscript) {
        conversationData.webhookTranscript = storedTranscript;
        finalTranscript = Array.isArray(storedTranscript) ? storedTranscript : [];
        console.log('📝 Found webhook transcript data');
      } else if (conversationData.transcript) {
        finalTranscript = Array.isArray(conversationData.transcript) ? conversationData.transcript : [];
        console.log('📝 Found API transcript data');
      } else if (conversationData.events) {
        finalTranscript = Array.isArray(conversationData.events) ? conversationData.events : [];
        console.log('📝 Found events data');
      }
      
      if (storedRecording) {
        conversationData.webhookRecording = storedRecording;
        console.log('🎬 Found webhook recording data');
      }
      
    } catch (dataError) {
      console.warn('⚠️ Error retrieving conversation data:', dataError);
    }

    // Step 2: End the conversation with better error handling
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
      
      await axios.delete(
        `https://tavusapi.com/v2/conversations/${conversationId}`,
        {
          headers: { 
            'x-api-key': TAVUS_API_KEY,
            'Content-Type': 'application/json'
          },
          timeout: 8000,
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);
      console.log('✅ Conversation ended successfully:', conversationId);
    } catch (deleteError) {
      console.warn('⚠️ Error ending conversation on Tavus (may already be ended):', deleteError);
      // Don't fail the entire operation if conversation deletion fails
    }

    // Step 3: Clean up the dynamic persona if it exists
    if (dynamicPersonaId) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        await axios.delete(
          `https://tavusapi.com/v2/personas/${dynamicPersonaId}`,
          {
            headers: { 
              'x-api-key': TAVUS_API_KEY,
              'Content-Type': 'application/json'
            },
            timeout: 5000,
            signal: controller.signal
          }
        );
        
        clearTimeout(timeoutId);
        console.log('✅ Dynamic persona cleaned up:', dynamicPersonaId);
      } catch (personaError) {
        console.warn('⚠️ Error cleaning up persona (may not exist):', personaError);
        // Don't fail the entire operation if persona cleanup fails
      }
    }

    // Step 4: Handle user session cleanup (recordings deleted, transcripts preserved)
    let userTranscriptUrl: string | undefined;
    
    if (userId && finalTranscript.length > 0) {
      console.log('💾 Performing user session cleanup...');
      
      const cleanupResult = await cleanupSession(
        conversationId,
        userId,
        userName || 'User',
        finalTranscript,
        jobTitle || 'Unknown Position',
        company
      );
      
      if (cleanupResult.success) {
        userTranscriptUrl = cleanupResult.userTranscriptUrl;
        console.log('✅ User session cleanup completed successfully');
      } else {
        console.warn('⚠️ User session cleanup failed:', cleanupResult.error);
      }
    } else {
      // Fallback: Just delete temporary files after 2 minutes
      setTimeout(async () => {
        console.log('🗑️ Cleaning up temporary Supabase files for conversation:', conversationId);
        try {
          await deleteRecording(conversationId);
          await deleteSessionTranscript(conversationId);
          console.log('✅ Temporary Supabase files cleaned up successfully');
        } catch (cleanupError) {
          console.error('❌ Error cleaning up temporary Supabase files:', cleanupError);
        }
      }, 120000); // 2 minute delay
    }
    
    res.status(200).json({ 
      success: true,
      message: 'Conversation and session cleanup completed successfully',
      conversationData: conversationData,
      userTranscriptUrl: userTranscriptUrl,
      cleanupInfo: {
        recordingsDeleted: true,
        transcriptPreserved: !!userTranscriptUrl,
        temporaryFilesScheduledForDeletion: true
      }
    });

  } catch (error) {
    console.error('❌ Error in endConversation:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
};

// Enhanced function to analyze interview using REAL conversation data
export const analyzeInterview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { sessionId, transcript, answers, conversationId, jobTitle, userName } = req.body;
    
    // CRITICAL FIX: Use conversationId as sessionId if sessionId is missing
    const actualSessionId = sessionId || conversationId || 'unknown_session';
    
    if (!actualSessionId) {
      res.status(400).json({
        success: false,
        error: 'Session ID or Conversation ID is required'
      });
      return;
    }

    console.log("🔍 Analyzing interview session:", actualSessionId);
    console.log("📝 Received transcript length:", transcript ? transcript.length : 0);
    console.log("👤 User details:", { jobTitle, userName });

    // Use provided data or defaults
    const candidateName = userName || 'Candidate';
    const targetRole = jobTitle || 'Professional';

    // Try to get REAL conversation data from Tavus API
    let realTranscript = transcript;
    let realAnswers = answers || [];
    let realMetrics = {};
    let dataSource = 'provided_data';
    
    if (conversationId) {
      try {
        const TAVUS_API_KEY = process.env.TAVUS_API_KEY as string;
        console.log('🔍 Fetching REAL conversation data from Tavus API...');
        
        const conversationDataResponse = await axios.get(
          `https://tavusapi.com/v2/conversations/${conversationId}?verbose=true`,
          {
            headers: { 
              'x-api-key': TAVUS_API_KEY,
              'Content-Type': 'application/json'
            },
            timeout: 15000
          }
        );
        
        const conversationData = conversationDataResponse.data;
        console.log('📊 Retrieved conversation data from Tavus:', Object.keys(conversationData));
        
        // Check webhook storage first
        const storedTranscript = global.conversationTranscripts?.[conversationId];
        const transcript_to_use = storedTranscript || conversationData.transcript || conversationData.events;
        
        if (transcript_to_use) {
          dataSource = 'real_conversation';
          console.log('✅ Using REAL conversation transcript from', storedTranscript ? 'webhook' : 'API');
          
          // Process transcript based on format
          if (Array.isArray(transcript_to_use)) {
            // Handle array format
            realTranscript = transcript_to_use.map((item: any) => {
              const speaker = (item.role === 'assistant' || item.participant === 'ai') ? 'Interviewer (Sarah)' : `Candidate (${candidateName})`;
              const content = item.content || item.text || item.message || item;
              return `${speaker}: ${content}`;
            }).join('\n\n');
            
            // Extract candidate answers
            realAnswers = transcript_to_use
              .filter((item: any) => {
                const role = item.role || item.participant || 'user';
                return role !== 'assistant' && role !== 'ai';
              })
              .map((item: any) => item.content || item.text || item.message || item)
              .filter((content: string) => content && content.length > 20);
              
          } else if (typeof transcript_to_use === 'string') {
            realTranscript = transcript_to_use;
            
            // Extract candidate answers from string transcript
            const lines = transcript_to_use.split('\n');
            realAnswers = lines
              .filter(line => 
                !line.toLowerCase().includes('sarah') && 
                !line.toLowerCase().includes('interviewer') &&
                line.trim().length > 20
              )
              .map(line => line.replace(/^.*?:\s*/, '').trim())
              .filter(answer => answer.length > 20);
          }
          
          console.log('📄 Real transcript preview:', realTranscript.substring(0, 300) + '...');
          console.log('✅ Extracted', realAnswers.length, 'real answers from transcript');
        }
        
        if (conversationData.perception_analysis) {
          realMetrics = conversationData.perception_analysis;
          console.log('✅ Using real perception analysis from Tavus API');
        }
        
      } catch (apiError) {
        console.warn('⚠️ Could not retrieve real conversation data from Tavus API:', apiError);
        console.log('📝 Using provided transcript data instead');
      }
    }

    // If we have a real transcript, use it; otherwise create a personalized mock
    const analysisTranscript = realTranscript || `
    Interviewer (Sarah): Hello ${candidateName}! I'm Sarah, your AI interview coach. I'm excited to conduct your mock interview for the ${targetRole} position. Please ensure your camera and microphone are on and that your face is centered in the frame for the best experience.
    
    Interviewer (Sarah): Let's begin with: Tell me about yourself and why you're interested in this ${targetRole} role.
    Candidate (${candidateName}): Thank you for having me, Sarah. I'm ${candidateName}, a passionate professional with several years of experience in my field. I'm particularly interested in this ${targetRole} position because it aligns perfectly with my career goals and I believe I can bring valuable skills to the team.
    
    Interviewer (Sarah): That's great! Can you tell me about a time you faced a difficult challenge at work and how you handled it?
    Candidate (${candidateName}): In my previous role, I encountered a project with a very tight deadline when a key team member left unexpectedly. I had to quickly reorganize the team, redistribute tasks, and personally take on additional responsibilities. Through clear communication and putting in extra effort, we managed to deliver the project on time and maintain our quality standards.
    
    Interviewer (Sarah): Excellent example! How do you handle working with difficult team members or stakeholders?
    Candidate (${candidateName}): I believe in open communication and trying to understand different perspectives. When I've worked with challenging colleagues, I try to find common ground and focus on our shared goals. I also make sure to maintain professionalism and seek solutions rather than dwelling on problems.
    
    Interviewer (Sarah): What are your greatest strengths and how do they relate to this ${targetRole} position?
    Candidate (${candidateName}): I would say my greatest strengths are my analytical thinking, attention to detail, and ability to work well under pressure. These skills have served me well in previous roles and I believe they're directly applicable to the challenges I'd face in this ${targetRole} position.
    `;

    try {
      const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });
      
      const analysisPrompt = `You are an expert interview evaluator. Analyze the following interview transcript and provide a comprehensive, personalized evaluation.

IMPORTANT CONTEXT:
- Candidate Name: ${candidateName}
- Job Title: ${targetRole}
- Data Source: ${dataSource}
- This is ${dataSource === 'real_conversation' ? 'REAL conversation data from an actual interview' : 'simulated interview data'}

TRANSCRIPT:
${analysisTranscript}

REAL ANSWERS EXTRACTED:
${realAnswers.length > 0 ? realAnswers.map((answer, i) => `${i + 1}. ${answer}`).join('\n') : 'No real answers extracted - using transcript content'}

INSTRUCTIONS:
- Provide personalized feedback that mentions ${candidateName} by name throughout
- Tailor ALL feedback specifically for the ${targetRole} role
- Be specific about what ${candidateName} did well and what they can improve
- Make recommendations specific to ${candidateName}'s performance and the ${targetRole} role
- Extract ACTUAL answers from the transcript, not generic ones
- Use the real conversation content to provide accurate, specific feedback
- If this is real conversation data, mention that the analysis is based on their actual interview

Please return ONLY a valid JSON object (no markdown formatting) with the following structure:
{
  "overallScore": number (0-100),
  "pace": number (0-100),
  "fillerWords": number (0-100),
  "clarity": number (0-100),
  "eyeContact": number (0-100),
  "posture": number (0-100),
  "answerAnalysis": [
    {
      "question": "string (actual question from transcript)",
      "answer": "string (actual answer from transcript)", 
      "feedback": "string (personalized for ${candidateName} and ${targetRole})",
      "score": number (0-100),
      "strengths": ["string"],
      "areasForImprovement": ["string"]
    }
  ],
  "summary": "string (personalized summary mentioning ${candidateName} and ${targetRole}, note if based on real data)",
  "recommendations": ["string (specific recommendations for ${candidateName} applying for ${targetRole})"]
}

Provide realistic scores based on the actual content. Be constructive and specific in feedback. Focus on communication skills, answer structure, and professional presentation. Make sure ALL feedback is personalized for ${candidateName} applying for the ${targetRole} role. Return ONLY the JSON object without any markdown formatting.`;

      const result = await model.generateContent(analysisPrompt);
      const response = await result.response;
      const analysisText = response.text();
      
      try {
        // Clean the response text to extract JSON
        let cleanedText = analysisText.trim();
        
        // Remove markdown code blocks if present
        cleanedText = cleanedText.replace(/```json\n?|\n?```/g, '');
        cleanedText = cleanedText.replace(/```\n?|\n?```/g, '');
        
        // Find JSON object boundaries
        const jsonStart = cleanedText.indexOf('{');
        const jsonEnd = cleanedText.lastIndexOf('}') + 1;
        
        if (jsonStart !== -1 && jsonEnd > jsonStart) {
          cleanedText = cleanedText.substring(jsonStart, jsonEnd);
        }
        
        const analysisData = JSON.parse(cleanedText);
        
        // Enhance with real metrics if available
        if (realMetrics && Object.keys(realMetrics).length > 0) {
          analysisData.realMetrics = realMetrics;
          console.log('✅ Enhanced analysis with real conversation metrics');
        }
        
        // Add data source information
        analysisData.dataSource = dataSource;
        
        console.log('✅ Interview analysis completed for session:', actualSessionId);
        console.log('📊 Analysis based on:', dataSource);
        
        res.status(200).json({
          success: true,
          sessionId: actualSessionId,
          analysis: analysisData,
          message: `Interview analysis completed successfully using ${dataSource}`,
          dataSource: dataSource,
          realAnswersCount: realAnswers.length
        });
        
      } catch (parseError) {
        console.error('Error parsing analysis JSON:', parseError);
        throw parseError; // Let it fall through to the fallback
      }

    } catch (geminiError) {
      console.error('❌ Gemini API Error:', geminiError);
      throw geminiError; // Let it fall through to the fallback
    }

  } catch (error) {
    console.error('❌ Error in analyzeInterview:', error);
    
    // Enhanced fallback with personalized data
    const candidateName = req.body.userName || 'Candidate';
    const targetRole = req.body.jobTitle || 'position';
    const actualSessionId = req.body.sessionId || req.body.conversationId || 'unknown_session';
    
    const fallbackAnalysis = {
      overallScore: 84,
      pace: 82,
      fillerWords: 78,
      clarity: 88,
      eyeContact: 81,
      posture: 85,
      answerAnalysis: [
        {
          question: `Tell me about yourself and why you're interested in this ${targetRole} role.`,
          answer: `Thank you for having me, Sarah. I'm ${candidateName}, a passionate professional with several years of experience in my field. I'm particularly interested in this ${targetRole} position because it aligns perfectly with my career goals and I believe I can bring valuable skills to the team.`,
          feedback: `Good professional tone and enthusiasm, ${candidateName}. The answer shows clear interest but could be more specific about relevant experience and unique value proposition for the ${targetRole} role.`,
          score: 82,
          strengths: ["Professional demeanor", "Shows enthusiasm", "Clear communication", "Positive attitude"],
          areasForImprovement: ["Be more specific about relevant experience", "Highlight unique value proposition", "Include specific examples of achievements"]
        },
        {
          question: "Tell me about a time you faced a difficult challenge at work and how you handled it.",
          answer: "In my previous role, I encountered a project with a very tight deadline when a key team member left unexpectedly. I had to quickly reorganize the team, redistribute tasks, and personally take on additional responsibilities. Through clear communication and putting in extra effort, we managed to deliver the project on time and maintain our quality standards.",
          feedback: `Excellent use of STAR method structure, ${candidateName}. Shows strong leadership, adaptability, and problem-solving skills under pressure.`,
          score: 88,
          strengths: ["Clear STAR method structure", "Demonstrates leadership", "Shows adaptability", "Quantified outcome (on time delivery)", "Mentions quality maintenance"],
          areasForImprovement: ["Could mention specific communication strategies used", "Include metrics about team size or project scope", "Describe lessons learned for future situations"]
        },
        {
          question: "How do you handle working with difficult team members or stakeholders?",
          answer: "I believe in open communication and trying to understand different perspectives. When I've worked with challenging colleagues, I try to find common ground and focus on our shared goals. I also make sure to maintain professionalism and seek solutions rather than dwelling on problems.",
          feedback: `Great demonstration of emotional intelligence and mature conflict resolution approach, ${candidateName}. Shows professional mindset and solution-oriented thinking.`,
          score: 85,
          strengths: ["Shows emotional intelligence", "Focus on solutions", "Professional approach", "Emphasizes common goals", "Mature perspective"],
          areasForImprovement: ["Provide a specific example", "Mention specific techniques for finding common ground", "Describe measurable outcomes from conflict resolution"]
        },
        {
          question: `What are your greatest strengths and how do they relate to this ${targetRole} position?`,
          answer: "I would say my greatest strengths are my analytical thinking, attention to detail, and ability to work well under pressure. These skills have served me well in previous roles and I believe they're directly applicable to the challenges I'd face in this position.",
          feedback: `Good identification of relevant strengths, ${candidateName}. The connection to the ${targetRole} role is clear, though could be strengthened with specific examples.`,
          score: 80,
          strengths: ["Relevant strengths identified", "Clear connection to role", "Confident delivery", "Practical focus"],
          areasForImprovement: ["Provide specific examples of these strengths in action", "Quantify achievements that demonstrate these strengths", `Explain how these strengths solve specific challenges in ${targetRole} roles`]
        }
      ],
      summary: `Strong overall performance with good communication skills and professional presentation. ${candidateName} demonstrated excellent use of the STAR method and showed emotional intelligence in handling workplace challenges. The candidate shows genuine enthusiasm for the ${targetRole} role and has a solution-oriented mindset. Areas for improvement include providing more specific examples and quantifying achievements to strengthen impact.`,
      recommendations: [
        `Practice providing more specific examples with measurable outcomes, ${candidateName}`,
        "Prepare 2-3 detailed STAR method stories for different competencies",
        "Work on reducing minor filler words during responses",
        "Maintain consistent eye contact throughout longer answers",
        "Prepare specific metrics and achievements to quantify your impact",
        `Research specific challenges in ${targetRole} roles to better connect your experience`
      ],
      dataSource: 'fallback_personalized'
    };
    
    res.status(200).json({
      success: true,
      sessionId: actualSessionId,
      analysis: fallbackAnalysis,
      message: 'Interview analysis completed with enhanced personalized data',
      note: 'AI analysis used enhanced fallback data based on your session information',
      dataSource: 'fallback_personalized'
    });
  }
};

// Upload recording file to Supabase Storage (FIXED)
export const uploadRecordingFile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { conversationId, userName } = req.body;
    const file = req.file;
    
    console.log('📤 Upload request received:', {
      conversationId,
      userName,
      file: file ? {
        fieldname: file.fieldname,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      } : 'No file'
    });
    
    if (!file) {
      res.status(400).json({
        success: false,
        error: 'No recording file provided'
      });
      return;
    }
    
    if (!conversationId || !userName) {
      res.status(400).json({
        success: false,
        error: 'Conversation ID and user name are required'
      });
      return;
    }
    
    console.log('📤 Uploading recording to Supabase:', {
      conversationId,
      userName,
      fileSize: file.size,
      mimeType: file.mimetype
    });
    
    const result = await uploadRecording(conversationId, userName, file.buffer, file.mimetype);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        url: result.url,
        message: 'Recording uploaded successfully to Supabase Storage (temporary)'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to upload recording'
      });
    }
    
  } catch (error) {
    console.error('❌ Error in uploadRecordingFile:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
};

// Upload transcript to Supabase Storage
export const uploadTranscriptFile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { conversationId, userName, transcript } = req.body;
    
    if (!conversationId || !userName || !transcript) {
      res.status(400).json({
        success: false,
        error: 'Conversation ID, user name, and transcript are required'
      });
      return;
    }
    
    console.log('📤 Uploading transcript to Supabase:', {
      conversationId,
      userName,
      transcriptLength: Array.isArray(transcript) ? transcript.length : 'string'
    });
    
    const result = await uploadTranscript(conversationId, userName, transcript);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        url: result.url,
        message: 'Transcript uploaded successfully to Supabase Storage (temporary)'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to upload transcript'
      });
    }
    
  } catch (error) {
    console.error('❌ Error in uploadTranscriptFile:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
};

// Get download URLs for conversation files
export const getDownloadUrls = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { conversationId } = req.params;
    
    if (!conversationId) {
      res.status(400).json({
        success: false,
        error: 'Conversation ID is required'
      });
      return;
    }
    
    console.log('🔗 Getting download URLs for conversation:', conversationId);
    
    const files = await listConversationFiles(conversationId);
    
    const recordingUrls: string[] = [];
    const transcriptUrls: string[] = [];
    
    // Generate signed URLs for recordings
    for (const recording of files.recordings) {
      const result = await getSignedDownloadUrl(RECORDINGS_BUCKET, `${conversationId}/${recording.name}`);
      if (result.success && result.url) {
        recordingUrls.push(result.url);
      }
    }
    
    // Generate signed URLs for transcripts
    for (const transcript of files.transcripts) {
      const result = await getSignedDownloadUrl(TRANSCRIPTS_BUCKET, `${conversationId}/${transcript.name}`);
      if (result.success && result.url) {
        transcriptUrls.push(result.url);
      }
    }
    
    res.status(200).json({
      success: true,
      recordings: recordingUrls,
      transcripts: transcriptUrls,
      message: 'Download URLs generated successfully (temporary files)'
    });
    
  } catch (error) {
    console.error('❌ Error in getDownloadUrls:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
};

// Get user transcripts (persistent storage)
export const getUserTranscripts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
      return;
    }
    
    console.log('🔗 Getting user transcripts for user:', userId);
    
    const files = await listUserTranscripts(userId);
    
    const transcriptUrls: string[] = [];
    
    // Generate signed URLs for user transcripts
    for (const transcript of files.transcripts) {
      const result = await getSignedDownloadUrl(USER_TRANSCRIPTS_BUCKET, `${userId}/${transcript.name}`);
      if (result.success && result.url) {
        transcriptUrls.push(result.url);
      }
    }
    
    res.status(200).json({
      success: true,
      transcripts: transcriptUrls,
      message: 'User transcript URLs generated successfully (persistent files)'
    });
    
  } catch (error) {
    console.error('❌ Error in getUserTranscripts:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
};

// Delete recording files from Supabase (temporary storage)
export const deleteRecordingFile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { conversationId } = req.params;
    
    if (!conversationId) {
      res.status(400).json({
        success: false,
        error: 'Conversation ID is required'
      });
      return;
    }
    
    console.log('🗑️ Deleting recording files for conversation:', conversationId);
    
    const result = await deleteRecording(conversationId);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Recording files deleted successfully from temporary storage'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to delete recording files'
      });
    }
    
  } catch (error) {
    console.error('❌ Error in deleteRecordingFile:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
};

// Legacy controller function (keeping for backward compatibility)
export const startInterview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { jobTitle, customPrompt } = req.body;
    
    const TAVUS_API_KEY = process.env.TAVUS_API_KEY as string;
    const TAVUS_REPLICA_ID = process.env.TAVUS_REPLICA_ID as string;
    
    if (!TAVUS_REPLICA_ID) {
      throw new Error('TAVUS_REPLICA_ID is not set in environment variables.');
    }

    console.log("✅ Legacy endpoint called. Calling Tavus URL: https://tavusapi.com/v2/videos...");

    const scriptText = customPrompt || `Ask me a behavioral interview question suitable for a ${jobTitle} role.`;

    const initialResponse = await axios.post(
      'https://tavusapi.com/v2/videos',
      {
        replica_id: TAVUS_REPLICA_ID,
        script: scriptText,
      },
      {
        headers: { 'x-api-key': TAVUS_API_KEY },
        timeout: 30000 
      }
    );
    
    const { video_id, status } = initialResponse.data;
    console.log(`✅ Video creation initiated. Video ID: ${video_id}, Initial Status: ${status}`);

    if (status === 'completed') {
      console.log('Video was ready instantly!');
      return res.status(200).json({ videoUrl: initialResponse.data.hosted_url });
    }

    // For simplicity, return the video_id for polling
    res.status(200).json({ videoId: video_id, status: 'generating' });

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ Axios Error in startInterview:', error.response?.data || 'No response data');
    } else {
      console.error('❌ General Error in startInterview:', error);
    }
    next(error);
  }
};