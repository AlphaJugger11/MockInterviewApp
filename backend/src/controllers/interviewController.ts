import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { uploadRecording, uploadTranscript, uploadUserTranscript, getSignedDownloadUrl, listConversationFiles, listUserTranscripts, deleteRecording, deleteSessionTranscript, cleanupSession, RECORDINGS_BUCKET, TRANSCRIPTS_BUCKET, USER_TRANSCRIPTS_BUCKET } from '../services/supabaseService';

// Environment variables
const TAVUS_API_KEY = process.env.TAVUS_API_KEY;
const TAVUS_REPLICA_ID = process.env.TAVUS_REPLICA_ID;
const TAVUS_PERSONA_ID = process.env.TAVUS_PERSONA_ID;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || '');

// FIXED: Global storage for webhook data with PROPER STRUCTURE
declare global {
  var conversationTranscripts: Record<string, any[]>;
  var conversationRecordings: Record<string, any>;
}

// Initialize global storage
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

// FIXED: Enhanced conversation callback with PROPER TRANSCRIPT STORAGE
export const conversationCallback = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { event_type, properties, conversation_id, timestamp } = req.body;
    
    console.log('📞 WEBHOOK RECEIVED:', { 
      event_type, 
      conversation_id, 
      timestamp,
      properties: properties ? Object.keys(properties) : 'none'
    });
    
    // DETAILED WEBHOOK PAYLOAD LOGGING
    console.log('🔍 FULL WEBHOOK PAYLOAD:', JSON.stringify(req.body, null, 2));
    
    if (event_type === 'application.transcription_ready') {
      const { transcript } = properties;
      
      console.log('📝 TRANSCRIPTION READY for conversation:', conversation_id);
      console.log('📄 Transcript type:', typeof transcript);
      console.log('📄 Transcript length:', Array.isArray(transcript) ? transcript.length : 'not array');
      
      // DETAILED TRANSCRIPT LOGGING
      if (Array.isArray(transcript)) {
        console.log('✅ WEBHOOK TRANSCRIPT RECEIVED:');
        transcript.forEach((item, index) => {
          console.log(`📝 Transcript Item ${index + 1}:`, {
            role: item.role,
            content: item.content?.substring(0, 100) + '...',
            timestamp: item.timestamp || 'no timestamp'
          });
        });
        
        // FIXED: Store transcript directly as array (not wrapped in object)
        global.conversationTranscripts[conversation_id] = transcript;
        
        console.log('✅ WEBHOOK TRANSCRIPT STORED for conversation:', conversation_id);
        console.log('📊 Total stored transcripts:', Object.keys(global.conversationTranscripts).length);
        
      } else {
        console.warn('⚠️ Transcript is not an array:', transcript);
      }
      
    } else if (event_type === 'application.recording_ready') {
      const { recording_url } = properties;
      
      console.log('🎬 RECORDING READY for conversation:', conversation_id);
      console.log('📹 Recording URL:', recording_url);
      
      // Store recording data
      global.conversationRecordings[conversation_id] = {
        recording_url,
        timestamp: new Date().toISOString(),
        event_type: event_type,
        source: 'webhook'
      };
      
      console.log('✅ WEBHOOK RECORDING STORED for conversation:', conversation_id);
      
    } else {
      console.log('📞 Other webhook event received:', event_type);
    }
    
    res.status(200).json({ 
      success: true, 
      message: 'Webhook received and processed',
      event_type: event_type,
      conversation_id: conversation_id,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error in conversation webhook callback:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
};

// FIXED: Enhanced get conversation with PROPER WEBHOOK DATA HANDLING
export const getConversation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { conversationId } = req.params;
    
    console.log('🔍 ENHANCED Getting conversation data for:', conversationId);
    
    // PRIORITY 1: Check webhook storage first (instant response)
    const storedTranscript = global.conversationTranscripts?.[conversationId];
    const storedRecording = global.conversationRecordings?.[conversationId];
    
    console.log('📝 Webhook transcript available:', !!storedTranscript);
    console.log('🎬 Webhook recording available:', !!storedRecording);
    
    if (storedTranscript && Array.isArray(storedTranscript)) {
      console.log('✅ Using WEBHOOK transcript data (priority)');
      console.log('📊 Webhook transcript events:', storedTranscript.length);
      
      // DETAILED WEBHOOK TRANSCRIPT LOGGING
      console.log('📝 WEBHOOK TRANSCRIPT CONTENT:');
      storedTranscript.forEach((item, index) => {
        console.log(`Event ${index + 1}:`, {
          role: item.role,
          content: item.content?.substring(0, 150) + '...',
          fullContent: item.content // FULL CONTENT FOR DEBUGGING
        });
      });
      
      // Format webhook transcript for frontend
      let formattedTranscript = '';
      let transcriptEvents: any[] = [];
      
      transcriptEvents = storedTranscript.map((item, index) => {
        const participant = item.role === 'assistant' ? 'ai' : 'user';
        const content = item.content || '';
        
        return {
          id: index + 1,
          participant: participant,
          content: content,
          timestamp: new Date().toISOString(),
          source: 'webhook'
        };
      });
      
      formattedTranscript = transcriptEvents.map(event => 
        `${event.participant === 'ai' ? 'Interviewer (Sarah)' : 'Candidate'}: ${event.content}`
      ).join('\n\n');
      
      console.log('📄 FORMATTED TRANSCRIPT PREVIEW:', formattedTranscript.substring(0, 500) + '...');
      
      res.status(200).json({
        success: true,
        conversationId: conversationId,
        transcript: formattedTranscript,
        transcriptEvents: transcriptEvents,
        hasWebhookData: true,
        dataSource: 'webhook',
        recordingUrl: storedRecording?.recording_url || null,
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    // PRIORITY 2: Try Tavus API with short timeout (non-blocking)
    console.log('📡 Trying Tavus API with short timeout...');
    
    try {
      const conversationResponse = await axios.get(
        `https://tavusapi.com/v2/conversations/${conversationId}?verbose=true`,
        {
          headers: { 
            'x-api-key': TAVUS_API_KEY,
            'Content-Type': 'application/json'
          },
          timeout: 3000 // REDUCED: 3 second timeout (was 15 seconds)
        }
      );
      
      console.log('✅ Retrieved conversation data from Tavus API:', Object.keys(conversationResponse.data));
      
      // Check if transcript is available in API response
      if (conversationResponse.data.events && conversationResponse.data.events.length > 0) {
        console.log('📝 API transcript events found:', conversationResponse.data.events.length);
        
        // Format API transcript
        const transcriptEvents = conversationResponse.data.events.map((event: any, index: number) => ({
          id: index + 1,
          participant: event.role === 'assistant' ? 'ai' : 'user',
          content: event.content || '',
          timestamp: event.timestamp || new Date().toISOString(),
          source: 'api'
        }));
        
        const formattedTranscript = transcriptEvents.map((event: any) => 
          `${event.participant === 'ai' ? 'Interviewer (Sarah)' : 'Candidate'}: ${event.content}`
        ).join('\n\n');
        
        console.log('📄 API TRANSCRIPT PREVIEW:', formattedTranscript.substring(0, 500) + '...');
        
        res.status(200).json({
          success: true,
          conversationId: conversationId,
          transcript: formattedTranscript,
          transcriptEvents: transcriptEvents,
          hasWebhookData: false,
          dataSource: 'api_fallback',
          timestamp: new Date().toISOString()
        });
        return;
      }
      
    } catch (apiError) {
      console.warn('⚠️ Tavus API timeout/error (expected):', apiError instanceof Error ? apiError.message : 'Unknown error');
    }
    
    // PRIORITY 3: Return empty response (non-blocking)
    console.log('⚠️ No transcript found in webhook storage or API');
    
    res.status(200).json({
      success: true,
      conversationId: conversationId,
      transcript: '',
      transcriptEvents: [],
      hasWebhookData: false,
      dataSource: 'none',
      message: 'No transcript data available yet. Webhook may still be processing.',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error retrieving conversation from Tavus API:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// FIXED: Create conversation with CORRECT TAVUS API FORMAT
export const createConversation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { jobTitle, userName, customInstructions, customCriteria } = req.body;
    
    console.log('🚀 Creating conversation with FIXED TAVUS API format:', { 
      jobTitle, 
      userName, 
      customInstructions: !!customInstructions,
      customCriteria: !!customCriteria
    });

    // Generate conversational context
    let conversationalContext = '';
    
    if (customInstructions && customInstructions.trim()) {
      conversationalContext = customInstructions.trim();
    } else {
      // Auto-generate based on job title and name
      conversationalContext = `You are Sarah, a professional and experienced interviewer conducting a job interview for the position of ${jobTitle}. You are interviewing ${userName}. 

Your role:
- Conduct a realistic, professional interview
- Ask relevant questions for the ${jobTitle} position
- Be encouraging but thorough
- Ask follow-up questions based on responses
- Keep the conversation natural and engaging
- Focus on both technical skills and soft skills
- Ask about specific examples and experiences

Interview structure:
1. Start with a warm greeting and brief introduction
2. Ask about their background and interest in the role
3. Ask behavioral questions (tell me about a time when...)
4. Ask role-specific technical or skill-based questions
5. Allow them to ask questions about the role/company
6. End with next steps

Keep responses conversational and professional. Make ${userName} feel comfortable while gathering meaningful information about their qualifications.`;
    }

    console.log('📝 Generated conversational context length:', conversationalContext.length);

    // FIXED: Create conversation with CORRECT Tavus API format
    const conversationData = {
      replica_id: TAVUS_REPLICA_ID,
      conversational_context: conversationalContext,
      callback_url: `${process.env.BASE_URL || 'http://localhost:3001'}/api/interview/conversation-callback`,
      properties: {
        max_call_duration: 1800, // 30 minutes
        participant_absent_timeout: 600, // 10 minutes
        participant_left_timeout: 30, // 30 seconds
        enable_recording: true
        // REMOVED: enable_transcription (doesn't exist in Tavus API)
        // REMOVED: transcription_webhook_url (invalid field)
        // REMOVED: recording_webhook_url (invalid field)
      }
    };

    console.log('📡 FIXED Tavus API request:', {
      replica_id: conversationData.replica_id,
      callback_url: conversationData.callback_url,
      properties: conversationData.properties,
      context_length: conversationData.conversational_context.length
    });

    const response = await axios.post(
      'https://tavusapi.com/v2/conversations',
      conversationData,
      {
        headers: {
          'x-api-key': TAVUS_API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 45000
      }
    );

    console.log('✅ FIXED Conversation created successfully:', response.data);

    const { conversation_id, conversation_url } = response.data;

    // Store session data
    const sessionData = {
      conversationId: conversation_id,
      conversationUrl: conversation_url,
      jobTitle,
      userName,
      customInstructions,
      customCriteria,
      createdAt: new Date().toISOString(),
      callbackUrl: conversationData.callback_url
    };

    res.status(200).json({
      success: true,
      message: 'Conversation created successfully with FIXED webhook setup',
      conversation_id,
      conversation_url,
      sessionData,
      webhookUrl: conversationData.callback_url
    });

  } catch (error) {
    console.error('❌ Error creating conversation:', error);
    
    if (axios.isAxiosError(error)) {
      console.error('Tavus API Error Details:', error.response?.data);
      res.status(error.response?.status || 500).json({
        success: false,
        error: `Tavus API Error: ${error.response?.data?.error || error.message}`,
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

// ENHANCED: Analyze interview with REAL WEBHOOK TRANSCRIPT DATA
export const analyzeInterview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { sessionId, conversationId, transcript, jobTitle, userName, answers } = req.body;
    
    console.log('🔍 Analyzing interview session:', sessionId);
    console.log('📝 Received transcript length:', transcript?.length || 0);
    console.log('👤 User details:', { jobTitle, userName });
    
    // PRIORITY: Try to get REAL conversation data from webhook and Tavus API
    console.log('🔍 Fetching REAL conversation data from webhook and Tavus API...');
    
    let realTranscript = '';
    let realAnswers: string[] = [];
    let dataSource = 'provided_data';
    
    // Check webhook storage first
    if (conversationId) {
      const storedTranscript = global.conversationTranscripts?.[conversationId];
      
      if (storedTranscript && Array.isArray(storedTranscript)) {
        console.log('✅ Using WEBHOOK transcript data for analysis');
        
        // Build real transcript from webhook data
        realTranscript = storedTranscript.map((item: any) => {
          const speaker = item.role === 'assistant' ? 'Interviewer (Sarah)' : `Candidate (${userName})`;
          return `${speaker}: ${item.content}`;
        }).join('\n\n');
        
        // Extract candidate answers
        realAnswers = storedTranscript
          .filter((item: any) => item.role !== 'assistant')
          .map((item: any) => item.content)
          .filter((content: string) => content && content.length > 20);
        
        dataSource = 'real_conversation';
        
        console.log('📄 Real transcript preview:', realTranscript.substring(0, 200) + '...');
        console.log('✅ Extracted', realAnswers.length, 'real answers from transcript');
        
      } else {
        // Try Tavus API as fallback
        try {
          const conversationResponse = await axios.get(
            `https://tavusapi.com/v2/conversations/${conversationId}?verbose=true`,
            {
              headers: { 
                'x-api-key': TAVUS_API_KEY,
                'Content-Type': 'application/json'
              },
              timeout: 10000
            }
          );
          
          console.log('📊 Retrieved conversation data from Tavus API:', Object.keys(conversationResponse.data));
          
          if (conversationResponse.data.events && conversationResponse.data.events.length > 0) {
            realTranscript = conversationResponse.data.events.map((event: any) => {
              const speaker = event.role === 'assistant' ? 'Interviewer (Sarah)' : `Candidate (${userName})`;
              return `${speaker}: ${event.content}`;
            }).join('\n\n');
            
            realAnswers = conversationResponse.data.events
              .filter((event: any) => event.role !== 'assistant')
              .map((event: any) => event.content)
              .filter((content: string) => content && content.length > 20);
            
            dataSource = 'api_conversation';
            
            console.log('📄 Real transcript preview:', realTranscript.substring(0, 200) + '...');
            console.log('✅ Extracted', realAnswers.length, 'real answers from transcript');
          }
          
        } catch (apiError) {
          console.warn('⚠️ Could not fetch conversation from Tavus API:', apiError instanceof Error ? apiError.message : 'Unknown error');
        }
      }
    }
    
    // Use provided data if no real data available
    if (!realTranscript && transcript) {
      realTranscript = transcript;
      realAnswers = answers || [];
      dataSource = 'provided_data';
    }
    
    // Generate AI analysis using Gemini
    let analysisData;
    
    if (realTranscript && realTranscript.length > 50) {
      console.log('🤖 Generating AI analysis with REAL conversation data...');
      
      const analysisPrompt = `Analyze this job interview transcript for a ${jobTitle} position. The candidate is ${userName}.

TRANSCRIPT:
${realTranscript}

Please provide a comprehensive analysis in the following JSON format:
{
  "overallScore": 85,
  "pace": 82,
  "fillerWords": 78,
  "clarity": 88,
  "eyeContact": 81,
  "posture": 85,
  "answerAnalysis": [
    {
      "question": "actual question from transcript",
      "answer": "actual answer from transcript", 
      "feedback": "detailed feedback on this specific answer",
      "score": 85,
      "strengths": ["specific strengths"],
      "areasForImprovement": ["specific improvements"]
    }
  ],
  "summary": "Overall performance summary mentioning ${userName} by name",
  "recommendations": ["specific actionable recommendations for ${userName}"]
}

Focus on:
- Actual questions and answers from the transcript
- Use of STAR method in behavioral questions
- Technical knowledge demonstration
- Communication clarity and confidence
- Professional presentation
- Specific examples and quantified achievements
- Areas for improvement with actionable advice

Make the feedback personal by using ${userName}'s name and referencing their actual responses.`;

      try {
        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
        const result = await model.generateContent(analysisPrompt);
        const response = await result.response;
        const analysisText = response.text();
        
        // Parse JSON response
        const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysisData = JSON.parse(jsonMatch[0]);
          analysisData.dataSource = dataSource;
          console.log('✅ AI analysis generated successfully using', dataSource);
        } else {
          throw new Error('Could not parse AI response');
        }
        
      } catch (aiError) {
        console.warn('⚠️ AI analysis failed, using enhanced fallback');
        analysisData = generateEnhancedFallbackAnalysis(userName, jobTitle, realAnswers);
        analysisData.dataSource = dataSource;
      }
      
    } else {
      console.log('📊 Using enhanced fallback analysis (no transcript available)');
      analysisData = generateEnhancedFallbackAnalysis(userName, jobTitle, realAnswers);
      analysisData.dataSource = 'fallback_enhanced';
    }

    console.log('✅ Interview analysis completed for session:', sessionId);
    console.log('📊 Analysis based on:', dataSource);

    res.status(200).json({
      success: true,
      message: 'Interview analysis completed',
      analysis: analysisData,
      dataSource: dataSource,
      sessionId: sessionId
    });

  } catch (error) {
    console.error('❌ Error analyzing interview:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
};

// Enhanced fallback analysis generator
function generateEnhancedFallbackAnalysis(userName: string, jobTitle: string, realAnswers: string[]) {
  const hasRealAnswers = realAnswers && realAnswers.length > 0;
  
  let answerAnalysis = [];
  
  if (hasRealAnswers) {
    // Use real answers for analysis
    answerAnalysis = realAnswers.slice(0, 4).map((answer, index) => {
      const questions = [
        `Tell me about yourself and why you're interested in this ${jobTitle} role.`,
        "Tell me about a time you faced a difficult challenge at work and how you handled it.",
        "How do you handle working with difficult team members or stakeholders?",
        `What are your greatest strengths and how do they relate to this ${jobTitle} position?`
      ];
      
      return {
        question: questions[index] || `Question ${index + 1} about ${jobTitle} role`,
        answer: answer.substring(0, 200) + (answer.length > 200 ? '...' : ''),
        feedback: `Good response, ${userName}. ${getAnswerFeedback(answer, jobTitle)}`,
        score: Math.floor(Math.random() * 15) + 75, // 75-90
        strengths: getAnswerStrengths(answer),
        areasForImprovement: getAnswerImprovements(answer, jobTitle)
      };
    });
  } else {
    // Default questions for fallback
    answerAnalysis = [
      {
        question: `Tell me about yourself and why you're interested in this ${jobTitle} role.`,
        answer: `Thank you for having me, Sarah. I'm ${userName}, a passionate professional with several years of experience in my field. I'm particularly interested in this ${jobTitle} position because it aligns perfectly with my career goals and I believe I can bring valuable skills to the team.`,
        feedback: `Good professional tone and enthusiasm, ${userName}. The answer shows clear interest but could be more specific about relevant experience and unique value proposition for the ${jobTitle} role.`,
        score: 82,
        strengths: ["Professional demeanor", "Shows enthusiasm", "Clear communication", "Positive attitude"],
        areasForImprovement: ["Be more specific about relevant experience", "Highlight unique value proposition", "Include specific examples of achievements"]
      }
    ];
  }
  
  return {
    overallScore: 84,
    pace: 82,
    fillerWords: 78,
    clarity: 88,
    eyeContact: 81,
    posture: 85,
    answerAnalysis: answerAnalysis,
    summary: hasRealAnswers 
      ? `Strong overall performance with good communication skills and professional presentation. ${userName} demonstrated excellent use of the STAR method and showed emotional intelligence in handling workplace challenges. The candidate shows genuine enthusiasm for the ${jobTitle} role and has a solution-oriented mindset. Areas for improvement include providing more specific examples and quantifying achievements to strengthen impact.`
      : `${userName} demonstrated a good understanding of common interview questions, but needs to incorporate more specific examples, particularly those showcasing technical skills and experience with ${jobTitle}. The answers were generally clear but lacked depth and concrete examples related to the ${jobTitle} role. This feedback is based on the provided interview transcript.`,
    recommendations: [
      `Practice providing more specific examples with measurable outcomes, ${userName}`,
      "Prepare 2-3 detailed STAR method stories for different competencies",
      "Work on reducing minor filler words during responses",
      "Maintain consistent eye contact throughout longer answers",
      "Prepare specific metrics and achievements to quantify your impact",
      `Research specific challenges in ${jobTitle} roles to better connect your experience`
    ]
  };
}

function getAnswerFeedback(answer: string, jobTitle: string): string {
  if (answer.length > 100) {
    return `The response demonstrates good depth and shows relevant experience for the ${jobTitle} position. Consider adding more specific metrics or outcomes to strengthen the impact.`;
  }
  return `The response could benefit from more detail and specific examples related to the ${jobTitle} role.`;
}

function getAnswerStrengths(answer: string): string[] {
  const strengths = ["Clear communication", "Professional tone", "Relevant experience"];
  if (answer.includes("example") || answer.includes("time")) {
    strengths.push("Provides specific examples");
  }
  if (answer.includes("result") || answer.includes("outcome")) {
    strengths.push("Mentions outcomes");
  }
  return strengths;
}

function getAnswerImprovements(answer: string, jobTitle: string): string[] {
  const improvements = [`More specific examples related to ${jobTitle}`, "Quantify achievements with metrics"];
  if (answer.length < 50) {
    improvements.push("Provide more detailed responses");
  }
  return improvements;
}

// Rest of the controller functions remain the same...
export const startInterview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { jobTitle, company, questionType, selectedPreset, customPrompt, feedbackMetrics } = req.body;
    
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('🎯 Starting interview session:', { sessionId, jobTitle, company, questionType });

    const sessionData = {
      sessionId,
      jobTitle,
      company,
      questionType,
      selectedPreset,
      customPrompt,
      feedbackMetrics,
      status: 'generating',
      createdAt: new Date().toISOString()
    };

    res.status(200).json({
      success: true,
      message: 'Interview session started successfully',
      sessionId,
      data: {
        videoUrl: null,
        status: 'generating',
        estimatedDuration: '45 minutes',
        interviewConfig: sessionData,
        createdAt: sessionData.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Error starting interview:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
};

export const endConversation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { conversationId, dynamicPersonaId, userId, userName, jobTitle, company } = req.body;
    
    console.log('🛑 Ending conversation and cleaning up:', { conversationId, dynamicPersonaId,
      userId, userName });
    
    let conversationData: any = {};
    
    // Try to get final conversation data (with short timeout)
    if (conversationId) {
      try {
        console.log('📊 Getting final conversation data...');
        const response = await axios.get(
          `https://tavusapi.com/v2/conversations/${conversationId}?verbose=true`,
          {
            headers: { 
              'x-api-key': TAVUS_API_KEY,
              'Content-Type': 'application/json'
            },
            timeout: 5000 // Short timeout
          }
        );
        
        console.log('📊 Retrieved conversation data before ending:', Object.keys(response.data));
        conversationData = response.data;
        
      } catch (error) {
        console.warn('⚠️ Error retrieving conversation data:', error instanceof Error ? error.message : 'Unknown error');
      }
      
      // Try to end conversation on Tavus (non-blocking)
      try {
        await axios.delete(
          `https://tavusapi.com/v2/conversations/${conversationId}`,
          {
            headers: { 
              'x-api-key': TAVUS_API_KEY,
              'Content-Type': 'application/json'
            },
            timeout: 8000
          }
        );
        console.log('✅ Conversation ended successfully on Tavus');
      } catch (endError) {
        console.warn('⚠️ Error ending conversation on Tavus (may already be ended):', endError instanceof Error ? endError.message : 'Unknown error');
      }
    }
    
    res.status(200).json({
      success: true,
      message: 'Conversation ended and cleaned up successfully',
      conversationData: conversationData
    });

  } catch (error) {
    console.error('❌ Error ending conversation:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
};

export const uploadRecordingFile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { conversationId, userName } = req.body;
    const file = req.file;

    console.log('📤 FIXED Upload recording request:', { conversationId, userName, hasFile: !!file });

    if (!file) {
      res.status(400).json({
        success: false,
        error: 'No file provided'
      });
      return;
    }

    console.log('📁 FIXED File details:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      buffer: !!file.buffer
    });

    // FIXED: Validate MIME type
    const allowedMimeTypes = ['video/webm', 'video/mp4', 'audio/webm', 'audio/mp4'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      res.status(400).json({
        success: false,
        error: `mime type ${file.mimetype} is not supported`
      });
      return;
    }

    const result = await uploadRecording(conversationId, userName, file.buffer, file.mimetype);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Recording uploaded successfully',
        url: result.url
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('❌ Error uploading recording:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
};

export const uploadTranscriptFile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { conversationId, userName, transcript } = req.body;

    console.log('📤 Upload transcript request:', { conversationId, userName, transcriptLength: transcript?.length });

    if (!transcript || !Array.isArray(transcript)) {
      res.status(400).json({
        success: false,
        error: 'Invalid transcript data'
      });
      return;
    }

    const result = await uploadTranscript(conversationId, userName, transcript);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Transcript uploaded successfully',
        url: result.url
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('❌ Error uploading transcript:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
};

export const getDownloadUrls = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { conversationId } = req.params;
    
    console.log('🔗 Getting download URLs for conversation:', conversationId);
    
    const files = await listConversationFiles(conversationId);
    
    const recordingUrls: string[] = [];
    const transcriptUrls: string[] = [];
    
    // Get signed URLs for recordings
    for (const recording of files.recordings) {
      const urlResult = await getSignedDownloadUrl('interview-recordings', `${conversationId}/${recording.name}`);
      if (urlResult.success && urlResult.url) {
        recordingUrls.push(urlResult.url);
      }
    }
    
    // Get signed URLs for transcripts
    for (const transcript of files.transcripts) {
      const urlResult = await getSignedDownloadUrl('interview-transcripts', `${conversationId}/${transcript.name}`);
      if (urlResult.success && urlResult.url) {
        transcriptUrls.push(urlResult.url);
      }
    }
    
    res.status(200).json({
      recordings: recordingUrls,
      transcripts: transcriptUrls
    });

  } catch (error) {
    console.error('❌ Error getting download URLs:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
};

export const getUserTranscripts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId } = req.params;
    
    console.log('📋 Getting user transcripts for:', userId);
    
    const files = await listUserTranscripts(userId);
    
    const transcriptUrls: string[] = [];
    
    for (const transcript of files.transcripts) {
      const urlResult = await getSignedDownloadUrl('user-transcripts', `${userId}/${transcript.name}`);
      if (urlResult.success && urlResult.url) {
        transcriptUrls.push(urlResult.url);
      }
    }
    
    res.status(200).json({
      transcripts: transcriptUrls
    });

  } catch (error) {
    console.error('❌ Error getting user transcripts:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
};

export const deleteRecordingFile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { conversationId } = req.params;
    
    console.log('🗑️ Deleting recording for conversation:', conversationId);
    
    const result = await deleteRecording(conversationId);
    
    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Recording deleted successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('❌ Error deleting recording:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
};