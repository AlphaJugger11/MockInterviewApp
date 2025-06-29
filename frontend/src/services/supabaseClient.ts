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
 * FIXED: Upload recording blob to Supabase Storage via backend with PROPER MIME TYPE
 */
export const uploadRecordingToSupabase = async (
  conversationId: string,
  userName: string,
  recordingBlob: Blob
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    console.log('📤 FIXED Uploading recording to Supabase via backend...');
    console.log('📊 FIXED Upload details:', {
      conversationId,
      userName,
      blobSize: recordingBlob.size,
      blobType: recordingBlob.type // Should now be video/webm
    });
    
    // VALIDATION: Check MIME type before upload
    if (!recordingBlob.type || recordingBlob.type === 'text/plain' || recordingBlob.type === '') {
      console.error('❌ FIXED Invalid blob MIME type:', recordingBlob.type);
      return { 
        success: false, 
        error: `Invalid file type: ${recordingBlob.type}. Expected video/webm or video/mp4.` 
      };
    }
    
    // Create FormData to send the blob
    const formData = new FormData();
    
    // FIXED: Ensure proper file extension and MIME type
    let fileName = `${userName}-${Date.now()}`;
    let fileExtension = 'webm';
    
    if (recordingBlob.type.includes('mp4')) {
      fileExtension = 'mp4';
    } else if (recordingBlob.type.includes('webm')) {
      fileExtension = 'webm';
    }
    
    fileName = `${fileName}.${fileExtension}`;
    
    console.log('📁 FIXED File details:', {
      fileName,
      fileExtension,
      mimeType: recordingBlob.type
    });
    
    // CRITICAL FIX: Create File object with explicit MIME type
    const file = new File([recordingBlob], fileName, { 
      type: recordingBlob.type 
    });
    
    console.log('📁 FIXED File object created:', {
      name: file.name,
      type: file.type,
      size: file.size
    });
    
    formData.append('recording', file);
    formData.append('conversationId', conversationId);
    formData.append('userName', userName);
    
    const response = await fetch('http://localhost:3001/api/interview/upload-recording', {
      method: 'POST',
      body: formData
    });
    
    console.log('📡 FIXED Upload response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ FIXED Upload response error:', errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText || 'Upload failed' };
      }
      
      throw new Error(errorData.error || `HTTP ${response.status}: Upload failed`);
    }
    
    const data = await response.json();
    console.log('✅ FIXED Recording uploaded to Supabase successfully:', data.url);
    
    return { success: true, url: data.url };
    
  } catch (error) {
    console.error('❌ FIXED Error uploading recording to Supabase:', error);
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