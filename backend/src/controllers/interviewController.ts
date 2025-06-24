import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

// Helper function to generate persona instructions using Gemini
const generatePersonaInstructions = async (jobTitle: string): Promise<string> => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    
    const prompt = `You are an expert career coach and hiring manager. Your task is to generate a comprehensive set of "persona_instructions" for another AI that will conduct a mock interview. The user is practicing for a '${jobTitle}' role. 

Create detailed instructions that include:
1. A friendly but professional opening greeting
2. A mix of 5-7 behavioral and technical questions relevant to the role
3. Follow-up questions based on responses
4. An encouraging closing statement
5. Instructions to provide constructive feedback

The questions must be unique and varied for each generation to prevent repetition. Focus on real-world scenarios and industry-specific challenges. Do not use markdown formatting.

Make the interviewer persona professional, encouraging, and thorough in their evaluation.`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating persona instructions with Gemini:', error);
    // Fallback instructions if Gemini fails
    return `Hello! I'm excited to conduct your mock interview for the ${jobTitle} position. I'll be asking you a mix of behavioral and technical questions to help you prepare. Let's begin with: Tell me about yourself and why you're interested in this ${jobTitle} role. After each answer, I'll provide constructive feedback to help you improve. Let's start!`;
  }
};

// Main controller function for creating conversations
export const createConversation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { jobTitle, customInstructions, customCriteria } = req.body;
    
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

    console.log("✅ Creating conversation with dynamic persona for job title:", jobTitle);

    // Step 1: Generate or use provided instructions
    let instructions: string;
    if (customInstructions && customInstructions.trim()) {
      instructions = customInstructions.trim();
      console.log("Using custom instructions provided by user");
    } else {
      console.log("Generating instructions using Gemini API...");
      instructions = await generatePersonaInstructions(jobTitle);
      console.log("Generated instructions:", instructions.substring(0, 100) + "...");
    }

    // Step 2: Combine with judgment criteria
    const baselineCriteria = "Critically evaluate the candidate's response on the following: 1. Clarity and conciseness of their answer. 2. Use of the STAR (Situation, Task, Action, Result) method for behavioral questions. 3. Confidence and tone of voice. 4. Relevance to the role and industry.";
    
    let finalCriteria = baselineCriteria;
    if (customCriteria && customCriteria.trim()) {
      finalCriteria = `${customCriteria.trim()} Additionally, ${baselineCriteria}`;
    }

    // Step 3: Create final persona instructions
    const persona_instructions = `${instructions}\n\nJudgment Criteria:\n${finalCriteria}\n\nRemember to be encouraging while providing honest, constructive feedback after each response.`;

    console.log("Final persona instructions length:", persona_instructions.length);

    // Step 4: Call Tavus API to create conversation
    const conversationResponse = await axios.post(
      'https://tavusapi.com/v2/conversations',
      {
        replica_id: TAVUS_REPLICA_ID,
        conversational_context: persona_instructions, // <-- changed here
        properties: {
             max_call_duration: 300, //  5 minutes max call duration change to 20 minutes after testing
             participant_absent_timeout: 300, // 5 minutes timeout for participant absence
             participant_left_timeout: 15, // Set timeout after participant leaves (e.g., 60 seconds)

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
    
    const { conversation_url } = conversationResponse.data;
    
    if (!conversation_url) {
      throw new Error('No conversation URL received from Tavus API');
    }
    
    console.log('✅ Conversation created successfully. URL:', conversation_url);
    
    res.status(200).json({ 
      success: true,
      conversation_url,
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