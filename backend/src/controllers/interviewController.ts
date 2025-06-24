// src/controllers/interviewController.ts

import dotenv from 'dotenv';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';

// --- HELPER FUNCTION TO GENERATE INSTRUCTIONS ---
const generateInstructionsWithGemini = async (jobTitle: string): Promise<string> => {
  try {
    // Initialize Gemini AI here to ensure API key is loaded
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Using a reliable model
    
    const prompt = `You are an expert career coach. Generate instructions for an AI interviewer. The user is practicing for a '${jobTitle}' role. Include a friendly opening, 5-7 relevant behavioral and technical questions, and a closing statement. The questions must be unique. Do not use markdown.`;
    
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('⚠️ Gemini API failed, using fallback instructions.', error);
    return `Hello! I'm ready to conduct your mock interview for the ${jobTitle} role. Let's begin with this question: Tell me about yourself and why you're interested in this role.`;
  }
};


// --- THE MAIN CONTROLLER FUNCTION ---
export const createConversation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Step 1: Reliably load environment variables
    dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });
    const TAVUS_API_KEY = process.env.TAVUS_API_KEY;
    const TAVUS_REPLICA_ID = process.env.TAVUS_REPLICA_ID;
    if (!TAVUS_API_KEY || !TAVUS_REPLICA_ID || !process.env.GEMINI_API_KEY) {
      throw new Error('One or more required API keys are missing from the .env file.');
    }

    const { jobTitle, customInstructions } = req.body;
    if (!jobTitle) {
      throw new Error("Job title is required to create an interview.");
    }
    
    // Step 2: Generate the dynamic persona instructions
    let personaInstructions: string;
    if (customInstructions) {
      console.log("✅ Using custom instructions from user.");
      personaInstructions = customInstructions;
    } else {
      console.log(`✅ No custom instructions. Calling Gemini for a '${jobTitle}' role...`);
      personaInstructions = await generateInstructionsWithGemini(jobTitle);
    }

    // Step 3 (NEW): Create a new, temporary persona via the Tavus API
    console.log("✅ Creating a new dynamic persona on Tavus...");
    const personaResponse = await axios.post(
      'https://tavusapi.com/v2/personas',
      {
        name: `Dynamic Persona - ${jobTitle} - ${Date.now()}`,
        instructions: personaInstructions,
      },
      { headers: { 'x-api-key': TAVUS_API_KEY } }
    );
    const newPersonaId = personaResponse.data.persona_id;
    console.log(`✅ Successfully created temporary persona with ID: ${newPersonaId}`);

    // Step 4: Use the NEW persona_id to create the conversation
    console.log("✅ Creating conversation using the new persona...");
    const conversationResponse = await axios.post(
      'https://tavusapi.com/v2/conversations',
      {
        replica_id: TAVUS_REPLICA_ID,
        persona_id: newPersonaId, // Using the ID of the persona we just created
      },
      { headers: { 'x-api-key': TAVUS_API_KEY } }
    );

    const conversationUrl = conversationResponse.data.conversation_url;
    console.log(`✅ Conversation created successfully. URL: ${conversationUrl}`);
    
    res.status(200).json({ conversationUrl });

  } catch (error) {
    if (axios.isAxiosError(error)) {
        console.error('❌ Axios Error:', error.response?.data || error.message);
    } else {
        console.error('❌ General Error:', error);
    }
    next(error);
  }
};