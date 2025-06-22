// src/controllers/interviewController.ts
import { Request, Response, NextFunction } from 'express';
import axios from 'axios';

// Helper function to poll the video status
const pollVideoStatus = async (videoId: string, apiKey: string): Promise<string> => {
  // USING THE NEW URL FOR POLLING
  const statusUrl = `https://tavusapi.com/v2/videos/${videoId}`; 
  console.log('Polling video status at NEW URL:', statusUrl);
  
  for (let i = 0; i < 40; i++) {
    try {
      const response = await axios.get(statusUrl, {
        headers: { 'x-api-key': apiKey },
      });
      
      const { status, hosted_url } = response.data;
      console.log(`Polling attempt ${i + 1}: Status is '${status}'`);

      if (status === 'completed') return hosted_url;
      if (status === 'error') throw new Error('Tavus video generation resulted in an error.');
      
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      console.error("Polling error:", error.response?.data || error.message);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  throw new Error('Video generation timed out after 2 minutes.');
};

// Main controller function
export const startInterview = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { jobTitle, customPrompt } = req.body;
    
    const TAVUS_API_KEY = process.env['TAVUS_API'] as string;
    const TAVUS_REPLICA_ID = process.env['TAVUS_REPLICA_ID'] as string;
    if (!TAVUS_REPLICA_ID) {
      throw new Error('TAVUS_REPLICA_ID is not set in environment variables.');
    }

    console.log("✅ Keys are hardcoded. Calling NEW Tavus URL: https://tavusapi.com/v2/videos...");

    const scriptText = customPrompt || `Ask me a behavioral interview question suitable for a ${jobTitle} role.`;

    // Step 1: Initiate video generation using the NEW URL
    const initialResponse = await axios.post(
        'https://tavusapi.com/v2/videos', // <-- THE ONLY CHANGE IS HERE
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

    const finalVideoUrl = await pollVideoStatus(video_id, TAVUS_API_KEY);
    
    console.log('✅ Polling complete. Final video URL:', finalVideoUrl);
    res.status(200).json({ videoUrl: finalVideoUrl });

  } catch (error) {
    if (axios.isAxiosError(error)) {
        console.error('❌ Axios Error in startInterview:', error.response?.data || 'No response data');
    } else {
        console.error('❌ General Error in startInterview:', error);
    }
    next(error);
  }
};