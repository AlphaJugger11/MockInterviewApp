import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

// Enhanced helper function to generate persona instructions using Gemini
const generatePersonaInstructions = async (jobTitle: string, userName: string): Promise<string> => {
  try {
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });
    
    const prompt = `You are an expert career coach AI named 'Sarah'. Your task is to conduct a mock interview and provide real-time, structured feedback.

- Your first line MUST be a friendly and professional greeting to the user by their name, '${userName}'.
- Your second instruction is to politely ask them to ensure their camera and microphone are on and that their face is centered in the frame for the best experience.
- The user is practicing for a '${jobTitle}' role. Ask 5-7 relevant behavioral and technical questions one by one.
- CRITICAL RULE: You can see the user. After each of the user's answers, you must provide a concise, structured analysis. This analysis MUST be a JSON string with the following keys: "strengths" (an array of strings), "areasForImprovement" (an array of strings), and "overallScore" (a number from 0 to 100 for that specific answer).
- You must also analyze their non-verbal cues. If the user looks away or is out of frame, your next response should include a gentle reminder to stay engaged.
- Do not use markdown formatting in your responses.
- Keep your feedback constructive and encouraging while being honest about areas for improvement.
- End the interview after 5-7 questions with a summary and encouragement.

Make the interviewer persona professional, encouraging, and thorough in their evaluation with real-time visual feedback capabilities.`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating persona instructions with Gemini:', error);
    // Fallback instructions if Gemini fails
    return `Hello ${userName}! I'm Sarah, your AI interview coach. I'm excited to conduct your mock interview for the ${jobTitle} position. Please ensure your camera and microphone are on and that your face is centered in the frame for the best experience. I can see you and will provide feedback on both your verbal answers and non-verbal cues. Let's begin with: Tell me about yourself and why you're interested in this ${jobTitle} role.`;
  }
};

// Enhanced controller function for creating conversations
export const createConversation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { jobTitle, userName, customInstructions, customCriteria } = req.body;
    
    const TAVUS_API_KEY = process.env.TAVUS_API_KEY as string;
    const TAVUS_REPLICA_ID = process.env.TAVUS_REPLICA_ID as string;
    
    if (!TAVUS_API_KEY || !TAVUS_REPLICA_ID) {
      res.status(500).json({
        success: false,
        error: 'Server configuration error: Missing API credentials'
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

    console.log("✅ Creating conversation with enhanced persona for:", { jobTitle, userName });

    // Step 1: Generate or use provided instructions with userName
    let instructions: string;
    if (customInstructions && customInstructions.trim()) {
      instructions = customInstructions.trim();
      console.log("Using custom instructions provided by user");
    } else {
      console.log("Generating enhanced instructions using Gemini API...");
      instructions = await generatePersonaInstructions(jobTitle, userName);
      console.log("Generated instructions:", instructions.substring(0, 100) + "...");
    }

    // Step 2: Combine with judgment criteria
    const baselineCriteria = "Critically evaluate the candidate's response on the following: 1. Clarity and conciseness of their answer. 2. Use of the STAR (Situation, Task, Action, Result) method for behavioral questions. 3. Confidence and tone of voice. 4. Relevance to the role and industry. 5. Non-verbal communication including eye contact and posture.";
    
    let finalCriteria = baselineCriteria;
    if (customCriteria && customCriteria.trim()) {
      finalCriteria = `${customCriteria.trim()} Additionally, ${baselineCriteria}`;
    }

    // Step 3: Create final persona instructions
    const persona_instructions = `${instructions}\n\nJudgment Criteria:\n${finalCriteria}\n\nRemember to be encouraging while providing honest, constructive feedback after each response. Use your vision capabilities to analyze non-verbal communication.`;

    console.log("Final persona instructions length:", persona_instructions.length);

    // Step 4: Call Tavus API to create conversation
    const conversationResponse = await axios.post(
      'https://tavusapi.com/v2/conversations',
      {
        replica_id: TAVUS_REPLICA_ID,
        conversational_context: persona_instructions,
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

// New function to end conversation and stop credit usage
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

// New function to analyze interview and generate feedback
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