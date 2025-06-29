import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Storage bucket name for interview recordings
export const RECORDINGS_BUCKET = 'interview-recordings';
export const TRANSCRIPTS_BUCKET = 'interview-transcripts';

/**
 * Initialize storage buckets if they don't exist (FIXED for Supabase limits)
 */
export const initializeStorageBuckets = async (): Promise<void> => {
  try {
    // Check if recordings bucket exists
    const { data: recordingsBucket, error: recordingsError } = await supabase.storage.getBucket(RECORDINGS_BUCKET);
    
    if (recordingsError && recordingsError.message.includes('not found')) {
      console.log('📦 Creating recordings bucket...');
      const { error: createRecordingsError } = await supabase.storage.createBucket(RECORDINGS_BUCKET, {
        public: false,
        allowedMimeTypes: ['video/webm', 'video/mp4', 'audio/webm', 'audio/mp4'],
        fileSizeLimit: 1024 * 1024 * 50 // FIXED: 50MB limit (Supabase free tier maximum)
      });
      
      if (createRecordingsError) {
        console.error('❌ Error creating recordings bucket:', createRecordingsError);
        
        // Try without file size limit if it fails
        console.log('🔄 Retrying bucket creation without file size limit...');
        const { error: retryError } = await supabase.storage.createBucket(RECORDINGS_BUCKET, {
          public: false,
          allowedMimeTypes: ['video/webm', 'video/mp4', 'audio/webm', 'audio/mp4']
        });
        
        if (retryError) {
          console.error('❌ Error creating recordings bucket (retry):', retryError);
        } else {
          console.log('✅ Recordings bucket created successfully (without size limit)');
        }
      } else {
        console.log('✅ Recordings bucket created successfully');
      }
    } else if (!recordingsError) {
      console.log('✅ Recordings bucket already exists');
    } else {
      console.error('❌ Error checking recordings bucket:', recordingsError);
    }

    // Check if transcripts bucket exists
    const { data: transcriptsBucket, error: transcriptsError } = await supabase.storage.getBucket(TRANSCRIPTS_BUCKET);
    
    if (transcriptsError && transcriptsError.message.includes('not found')) {
      console.log('📦 Creating transcripts bucket...');
      const { error: createTranscriptsError } = await supabase.storage.createBucket(TRANSCRIPTS_BUCKET, {
        public: false,
        allowedMimeTypes: ['text/plain', 'application/json'],
        fileSizeLimit: 1024 * 1024 * 10 // 10MB limit for transcripts
      });
      
      if (createTranscriptsError) {
        console.error('❌ Error creating transcripts bucket:', createTranscriptsError);
        
        // Try without file size limit if it fails
        console.log('🔄 Retrying transcripts bucket creation without file size limit...');
        const { error: retryError } = await supabase.storage.createBucket(TRANSCRIPTS_BUCKET, {
          public: false,
          allowedMimeTypes: ['text/plain', 'application/json']
        });
        
        if (retryError) {
          console.error('❌ Error creating transcripts bucket (retry):', retryError);
        } else {
          console.log('✅ Transcripts bucket created successfully (without size limit)');
        }
      } else {
        console.log('✅ Transcripts bucket created successfully');
      }
    } else if (!transcriptsError) {
      console.log('✅ Transcripts bucket already exists');
    } else {
      console.error('❌ Error checking transcripts bucket:', transcriptsError);
    }

  } catch (error) {
    console.error('❌ Error initializing storage buckets:', error);
  }
};

/**
 * Upload recording file to Supabase Storage (FIXED for size limits)
 */
export const uploadRecording = async (
  conversationId: string,
  userName: string,
  fileBuffer: Buffer,
  mimeType: string = 'video/webm'
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    // Check file size before upload (50MB limit for Supabase free tier)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (fileBuffer.length > maxSize) {
      console.warn('⚠️ File too large for Supabase free tier:', fileBuffer.length, 'bytes');
      return { 
        success: false, 
        error: `File too large (${Math.round(fileBuffer.length / 1024 / 1024)}MB). Maximum allowed: 50MB for Supabase free tier.` 
      };
    }
    
    // Better file extension detection
    let extension = 'webm';
    if (mimeType.includes('mp4')) {
      extension = 'mp4';
    } else if (mimeType.includes('webm')) {
      extension = 'webm';
    }
    
    const fileName = `${conversationId}/${userName}-${Date.now()}.${extension}`;
    
    console.log('📤 Uploading recording to Supabase:', {
      fileName,
      size: fileBuffer.length,
      sizeMB: Math.round(fileBuffer.length / 1024 / 1024),
      mimeType
    });
    
    const { data, error } = await supabase.storage
      .from(RECORDINGS_BUCKET)
      .upload(fileName, fileBuffer, {
        contentType: mimeType,
        upsert: false
      });

    if (error) {
      console.error('❌ Error uploading recording:', error);
      return { success: false, error: error.message };
    }

    // Get public URL for download
    const { data: urlData } = supabase.storage
      .from(RECORDINGS_BUCKET)
      .getPublicUrl(fileName);

    console.log('✅ Recording uploaded successfully:', urlData.publicUrl);
    
    return { 
      success: true, 
      url: urlData.publicUrl 
    };

  } catch (error) {
    console.error('❌ Error in uploadRecording:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

/**
 * Upload transcript to Supabase Storage
 */
export const uploadTranscript = async (
  conversationId: string,
  userName: string,
  transcript: any[]
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    const fileName = `${conversationId}/${userName}-transcript-${Date.now()}.json`;
    
    console.log('📤 Uploading transcript to Supabase:', fileName);
    
    const transcriptData = {
      conversationId,
      userName,
      timestamp: new Date().toISOString(),
      events: transcript,
      eventCount: transcript.length
    };
    
    const transcriptString = JSON.stringify(transcriptData, null, 2);
    
    // Check transcript size (should be much smaller than recordings)
    const transcriptSize = new Blob([transcriptString]).size;
    console.log('📊 Transcript size:', transcriptSize, 'bytes');
    
    const { data, error } = await supabase.storage
      .from(TRANSCRIPTS_BUCKET)
      .upload(fileName, transcriptString, {
        contentType: 'application/json',
        upsert: false
      });

    if (error) {
      console.error('❌ Error uploading transcript:', error);
      return { success: false, error: error.message };
    }

    // Get public URL for download
    const { data: urlData } = supabase.storage
      .from(TRANSCRIPTS_BUCKET)
      .getPublicUrl(fileName);

    console.log('✅ Transcript uploaded successfully:', urlData.publicUrl);
    
    return { 
      success: true, 
      url: urlData.publicUrl 
    };

  } catch (error) {
    console.error('❌ Error in uploadTranscript:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

/**
 * Get signed URL for downloading files
 */
export const getSignedDownloadUrl = async (
  bucket: string,
  filePath: string,
  expiresIn: number = 3600 // 1 hour
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error('❌ Error creating signed URL:', error);
      return { success: false, error: error.message };
    }

    return { success: true, url: data.signedUrl };

  } catch (error) {
    console.error('❌ Error in getSignedDownloadUrl:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

/**
 * List files for a conversation
 */
export const listConversationFiles = async (
  conversationId: string
): Promise<{ recordings: any[]; transcripts: any[] }> => {
  try {
    // List recordings
    const { data: recordings, error: recordingsError } = await supabase.storage
      .from(RECORDINGS_BUCKET)
      .list(conversationId);

    // List transcripts
    const { data: transcripts, error: transcriptsError } = await supabase.storage
      .from(TRANSCRIPTS_BUCKET)
      .list(conversationId);

    return {
      recordings: recordings || [],
      transcripts: transcripts || []
    };

  } catch (error) {
    console.error('❌ Error listing conversation files:', error);
    return { recordings: [], transcripts: [] };
  }
};

/**
 * Delete recording files for a conversation
 */
export const deleteRecording = async (
  conversationId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // List all files in the conversation folder
    const { data: files, error: listError } = await supabase.storage
      .from(RECORDINGS_BUCKET)
      .list(conversationId);

    if (listError) {
      console.error('❌ Error listing recording files:', listError);
      return { success: false, error: listError.message };
    }

    if (!files || files.length === 0) {
      console.log('📁 No recording files found for conversation:', conversationId);
      return { success: true };
    }

    // Delete all files in the conversation folder
    const filePaths = files.map(file => `${conversationId}/${file.name}`);
    
    const { error: deleteError } = await supabase.storage
      .from(RECORDINGS_BUCKET)
      .remove(filePaths);

    if (deleteError) {
      console.error('❌ Error deleting recording files:', deleteError);
      return { success: false, error: deleteError.message };
    }

    console.log('✅ Recording files deleted successfully for conversation:', conversationId);
    return { success: true };

  } catch (error) {
    console.error('❌ Error in deleteRecording:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

/**
 * Delete transcript files for a conversation
 */
export const deleteTranscript = async (
  conversationId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // List all files in the conversation folder
    const { data: files, error: listError } = await supabase.storage
      .from(TRANSCRIPTS_BUCKET)
      .list(conversationId);

    if (listError) {
      console.error('❌ Error listing transcript files:', listError);
      return { success: false, error: listError.message };
    }

    if (!files || files.length === 0) {
      console.log('📁 No transcript files found for conversation:', conversationId);
      return { success: true };
    }

    // Delete all files in the conversation folder
    const filePaths = files.map(file => `${conversationId}/${file.name}`);
    
    const { error: deleteError } = await supabase.storage
      .from(TRANSCRIPTS_BUCKET)
      .remove(filePaths);

    if (deleteError) {
      console.error('❌ Error deleting transcript files:', deleteError);
      return { success: false, error: deleteError.message };
    }

    console.log('✅ Transcript files deleted successfully for conversation:', conversationId);
    return { success: true };

  } catch (error) {
    console.error('❌ Error in deleteTranscript:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};