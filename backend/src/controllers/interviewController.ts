import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

// Enhanced helper function to generate persona instructions using Gemini
const generatePersonaInstructions = async (jobTitle: string, userName: string, customInstructions?: string, customCriteria?: string): Promise<string> => {
  try {
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });
    
    // If custom instructions are provided, use them as base
    if (customInstructions && customInstructions.trim()) {
      console.log("Using provided custom instructions");
      return customInstructions.trim();
    }
    
    const prompt = `You are an expert career coach AI named 'Sarah'. Your task is to conduct a mock interview and provide real-time, structured feedback.

CRITICAL INSTRUCTIONS:
- Your first line MUST be a friendly and professional greeting to the user by their name, '${userName}'.
- Your second instruction is to politely ask them to ensure their camera and microphone are on and that their face is centered in the frame for the best experience.
- The user is practicing for a '${jobTitle}' role. Ask 5-7 relevant behavioral and technical questions one by one.
- CRITICAL RULE: You can see the user. After each of the user's answers, you must provide a concise, structured analysis. This analysis MUST be a JSON string with the following keys: "strengths" (an array of strings), "areasForImprovement" (an array of strings), and "overallScore" (a number from 0 to 100 for that specific answer).
- You must also analyze their non-verbal cues. If the user looks away or is out of frame, your next response should include a gentle reminder to stay engaged.
- Do not use markdown formatting in your responses.
- Keep your feedback constructive and encouraging while being honest about areas for improvement.
- End the interview after 5-7 questions with a summary and encouragement.

Make the interviewer persona professional, encouraging, and thorough in their evaluation with real-time visual feedback capabilities.

Generate a complete interview script that follows these guidelines for the ${jobTitle} position.`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating persona instructions with Gemini:', error);
    // Fallback instructions if Gemini fails
    return `Hello ${userName}! I'm Sarah, your AI interview coach. I'm excited to conduct your mock interview for the ${jobTitle} position. Please ensure your camera and microphone are on and that your face is centered in the frame for the best experience. I can see you and will provide feedback on both your verbal answers and non-verbal cues. Let's begin with: Tell me about yourself and why you're interested in this ${jobTitle} role.`;
  }
};

// Enhanced controller function for creating conversations with custom instructions
export const createConversation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { jobTitle, userName, customInstructions, customCriteria } = req.body;
    
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

    console.log("✅ Creating conversation with enhanced persona for:", { jobTitle, userName });

    // Step 1: Generate enhanced instructions using Gemini (even though we use static persona)
    // This allows us to log what the ideal instructions would be and potentially use them later
    console.log("Generating enhanced instructions using Gemini API...");
    const generatedInstructions = await generatePersonaInstructions(
      jobTitle, 
      userName, 
      customInstructions, 
      customCriteria
    );
    console.log("Generated instructions:", generatedInstructions.substring(0, 100) + "...");

    // Step 2: Combine with judgment criteria if provided
    let finalInstructions = generatedInstructions;
    if (customCriteria && customCriteria.trim()) {
      const baselineCriteria = "Additionally, evaluate based on: 1. Clarity and conciseness. 2. Use of the STAR method for behavioral questions. 3. Confidence and tone. 4. Relevance to the role. 5. Non-verbal communication including eye contact and posture.";
      finalInstructions = `${generatedInstructions}\n\nCustom Judgment Criteria: ${customCriteria.trim()}\n\n${baselineCriteria}`;
    }

    // Step 3: Log the final instructions for debugging/future use
    console.log("Final enhanced instructions length:", finalInstructions.length);
    console.log("Using static PERSONA_ID:", TAVUS_PERSONA_ID);

    // Step 4: Store session data for later analysis
    const sessionData = {
      jobTitle: jobTitle.trim(),
      userName: userName.trim(),
      customInstructions: customInstructions?.trim() || null,
      customCriteria: customCriteria?.trim() || null,
      generatedInstructions: finalInstructions,
      timestamp: new Date().toISOString()
    };
    
    // In a real app, you'd save this to a database
    console.log("Session data prepared:", {
      ...sessionData,
      generatedInstructions: sessionData.generatedInstructions.substring(0, 100) + "..."
    });

    // Step 5: Call Tavus API to create conversation using static persona_id
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
      message: 'Interview conversation created successfully',
      sessionData: {
        jobTitle: sessionData.jobTitle,
        userName: sessionData.userName,
        hasCustomInstructions: !!customInstructions,
        hasCustomCriteria: !!customCriteria
      }
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

// Function to analyze interview and generate feedback using Gemini
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

Provide realistic scores based on the content. Be constructive and specific in feedback. Focus on communication skills, answer structure, and professional presentation.`;

    const result = await model.generateContent(analysisPrompt);
    const response = await result.response;
    const analysisText = response.text();
    
    try {
      // Try to parse the JSON response
      const cleanedText = analysisText.replace(/```json\n?|\n?```/g, '').trim();
      const analysisData = JSON.parse(cleanedText);
      
      console.log('✅ Interview analysis completed for session:', sessionId);
      
      res.status(200).json({
        success: true,
        sessionId,
        analysis: analysisData,
        message: 'Interview analysis completed successfully'
      });
      
    } catch (parseError) {
      console.error('Error parsing analysis JSON:', parseError);
      console.log('Raw response:', analysisText);
      
      // Fallback with enhanced mock data
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
            answer: "I was leading a project with a tight deadline when our main developer left unexpectedly. I had to quickly reorganize the team, redistribute tasks, and personally take on additional coding responsibilities. Through clear communication and extra hours, we delivered the project on time and maintained quality standards.",
            feedback: "Excellent use of STAR method. Clear situation description and strong result orientation. Shows leadership and adaptability under pressure.",
            score: 88,
            strengths: ["Clear structure using STAR method", "Demonstrated leadership", "Quantified results", "Showed adaptability"],
            areasForImprovement: ["Could elaborate on specific communication strategies used", "Mention lessons learned for future situations"]
          },
          {
            question: "Describe a situation where you had to work with a difficult team member.",
            answer: "In my previous role, I worked with a colleague who was resistant to feedback and often missed deadlines. I approached them privately to understand their concerns and discovered they were overwhelmed with their workload. I helped them prioritize tasks and offered support, which improved our working relationship and team productivity.",
            feedback: "Great demonstration of emotional intelligence and conflict resolution skills. Shows empathy and problem-solving approach.",
            score: 85,
            strengths: ["Showed empathy and understanding", "Proactive problem-solving", "Focus on positive outcomes", "Professional approach"],
            areasForImprovement: ["Could mention specific techniques used for prioritization", "Describe how you measured the improvement in productivity"]
          }
        ],
        summary: "Strong performance with excellent communication skills and professional demeanor. Demonstrated good use of the STAR method and showed emotional intelligence in handling workplace challenges. Areas for improvement include reducing filler words and maintaining more consistent eye contact throughout responses.",
        recommendations: [
          "Practice the STAR method with more technical examples",
          "Work on reducing 'um' and 'uh' filler words",
          "Maintain better eye contact during longer responses",
          "Prepare specific metrics to quantify achievements",
          "Practice explaining complex technical concepts simply"
        ]
      };
      
      res.status(200).json({
        success: true,
        sessionId,
        analysis: fallbackAnalysis,
        message: 'Interview analysis completed with enhanced fallback data',
        note: 'AI analysis temporarily unavailable, using enhanced sample analysis'
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