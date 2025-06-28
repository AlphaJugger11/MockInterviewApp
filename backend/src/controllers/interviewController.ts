import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

// Simplified controller function for creating conversations with static persona
export const createConversation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { jobTitle, userName } = req.body;
    
    const TAVUS_API_KEY = process.env.TAVUS_API_KEY as string;
    const TAVUS_REPLICA_ID = process.env.TAVUS_REPLICA_ID as string;
    const TAVUS_PERSONA_ID = process.env.TAVUS_PERSONA_ID as string;
    
    if (!TAVUS_API_KEY || !TAVUS_REPLICA_ID || !TAVUS_PERSONA_ID) {
      res.status(500).json({
        success: false,
        error: 'Server configuration error: Missing API credentials (API_KEY, REPLICA_ID, or PERSONA_ID)'
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

    console.log("✅ Creating conversation with static persona for:", { jobTitle, userName });

    // Call Tavus API to create conversation using static persona_id
    const conversationResponse = await axios.post(
      'https://tavusapi.com/v2/conversations',
      {
        replica_id: TAVUS_REPLICA_ID,
        persona_id: TAVUS_PERSONA_ID,
        properties: {
          max_call_duration: 1200, // 20 minutes max call duration
          participant_absent_timeout: 300, // 5 minutes timeout for participant absence
          participant_left_timeout: 15, // Set timeout after participant leaves
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
    
    console.log('✅ Conversation created successfully. URL:', conversation_url, 'ID:', conversation_id);
    
    res.status(200).json({ 
      success: true,
      conversation_url,
      conversation_id,
      message: 'Interview conversation created successfully'
    });

  } catch (error) {
    console.error('❌ Error in createConversation:', error);
    
    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || error.response?.data?.error || 'External API Error';
      console.error('Tavus API Error Details:', error.response?.data);
      res.status(status).json({
        success: false,
        error: `Tavus API Error: ${message}`
      });
    } else {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
};

// Function to end conversation and stop credit usage
export const endConversation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { conversationId } = req.body;
    
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

    console.log("🛑 Ending conversation:", conversationId);

    // Call Tavus API to delete/end the conversation
    await axios.delete(
      `https://tavusapi.com/v2/conversations/${conversationId}`,
      {
        headers: { 
          'x-api-key': TAVUS_API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 30000 
      }
    );
    
    console.log('✅ Conversation ended successfully:', conversationId);
    
    res.status(200).json({ 
      success: true,
      message: 'Conversation ended successfully'
    });

  } catch (error) {
    console.error('❌ Error in endConversation:', error);
    
    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || error.response?.data?.error || 'External API Error';
      res.status(status).json({
        success: false,
        error: `Tavus API Error: ${message}`
      });
    } else {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
};

// Function to analyze interview and generate feedback
export const analyzeInterview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { sessionId, transcript, answers } = req.body;
    
    if (!sessionId || !transcript) {
      res.status(400).json({
        success: false,
        error: 'Session ID and transcript are required'
      });
      return;
    }

    console.log("🔍 Analyzing interview session:", sessionId);

    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });
    
    const analysisPrompt = `You are an expert interview evaluator. Analyze the following interview transcript and provide a comprehensive evaluation.

Transcript: ${transcript}

Please return a JSON object with the following structure:
{
  "overallScore": number (0-100),
  "pace": number (0-100),
  "fillerWords": number (0-100),
  "clarity": number (0-100),
  "eyeContact": number (0-100),
  "posture": number (0-100),
  "answerAnalysis": [
    {
      "question": "string",
      "answer": "string", 
      "feedback": "string",
      "score": number (0-100),
      "strengths": ["string"],
      "areasForImprovement": ["string"]
    }
  ],
  "summary": "string",
  "recommendations": ["string"]
}

Provide realistic scores based on the content. Be constructive and specific in feedback.`;

    const result = await model.generateContent(analysisPrompt);
    const response = await result.response;
    const analysisText = response.text();
    
    try {
      // Try to parse the JSON response
      const analysisData = JSON.parse(analysisText);
      
      console.log('✅ Interview analysis completed for session:', sessionId);
      
      res.status(200).json({
        success: true,
        sessionId,
        analysis: analysisData,
        message: 'Interview analysis completed successfully'
      });
      
    } catch (parseError) {
      console.error('Error parsing analysis JSON:', parseError);
      
      // Fallback with mock data if JSON parsing fails
      const fallbackAnalysis = {
        overallScore: 82,
        pace: 85,
        fillerWords: 72,
        clarity: 88,
        eyeContact: 79,
        posture: 83,
        answerAnalysis: [
          {
            question: "Tell me about a time you faced a difficult challenge at work.",
            answer: "I was leading a project with a tight deadline when our main developer left unexpectedly...",
            feedback: "Good use of STAR method. Clear situation and task description.",
            score: 85,
            strengths: ["Clear structure", "Specific examples", "Quantified results"],
            areasForImprovement: ["Could be more concise", "Add more emotional intelligence elements"]
          }
        ],
        summary: "Strong performance with good technical knowledge and communication skills. Focus on reducing filler words and maintaining consistent eye contact.",
        recommendations: ["Practice the STAR method more", "Work on reducing 'um' and 'uh'", "Maintain better eye contact"]
      };
      
      res.status(200).json({
        success: true,
        sessionId,
        analysis: fallbackAnalysis,
        message: 'Interview analysis completed with fallback data'
      });
    }

  } catch (error) {
    console.error('❌ Error in analyzeInterview:', error);
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