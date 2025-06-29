import { createClient } from '@supabase/supabase-js';

// Get Supabase configuration from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Upload recording blob to Supabase Storage via backend
 */
export const uploadRecordingToSupabase = async (
  conversationId: string,
  userName: string,
  recordingBlob: Blob
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    console.log('📤 Uploading recording to Supabase via backend...');
    
    // Create FormData to send the blob
    const formData = new FormData();
    formData.append('recording', recordingBlob, `${userName}-${Date.now()}.webm`);
    formData.append('conversationId', conversationId);
    formData.append('userName', userName);
    
    const response = await fetch('http://localhost:3001/api/interview/upload-recording', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Upload failed');
    }
    
    const data = await response.json();
    console.log('✅ Recording uploaded to Supabase successfully:', data.url);
    
    return { success: true, url: data.url };
    
  } catch (error) {
    console.error('❌ Error uploading recording to Supabase:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Upload failed' 
    };
  }
};

/**
 * Upload transcript to Supabase Storage via backend
 */
export const uploadTranscriptToSupabase = async (
  conversationId: string,
  userName: string,
  transcript: any[]
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    console.log('📤 Uploading transcript to Supabase via backend...');
    
    const response = await fetch('http://localhost:3001/api/interview/upload-transcript', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId,
        userName,
        transcript
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Upload failed');
    }
    
    const data = await response.json();
    console.log('✅ Transcript uploaded to Supabase successfully:', data.url);
    
    return { success: true, url: data.url };
    
  } catch (error) {
    console.error('❌ Error uploading transcript to Supabase:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Upload failed' 
    };
  }
};

/**
 * Get download URLs for conversation files
 */
export const getConversationDownloadUrls = async (
  conversationId: string
): Promise<{ recordings: string[]; transcripts: string[] }> => {
  try {
    const response = await fetch(`http://localhost:3001/api/interview/download-urls/${conversationId}`);
    
    if (!response.ok) {
      throw new Error('Failed to get download URLs');
    }
    
    const data = await response.json();
    return data;
    
  } catch (error) {
    console.error('❌ Error getting download URLs:', error);
    return { recordings: [], transcripts: [] };
  }
};