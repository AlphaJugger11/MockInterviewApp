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

// Storage bucket names
export const RECORDINGS_BUCKET = 'interview-recordings';
export const TRANSCRIPTS_BUCKET = 'interview-transcripts';
export const USER_TRANSCRIPTS_BUCKET = 'user-transcripts'; // Persistent user transcripts

/**
 * Initialize user table for authentication
 */
export const initializeUserTable = async (): Promise<void> => {
  try {
    console.log('👤 Initializing users table...');
    
    // Create users table if it doesn't exist
    const { error } = await supabase.rpc('create_users_table', {});
    
    if (error && !error.message.includes('already exists')) {
      // If RPC doesn't exist, create table directly
      const { error: createError } = await supa base
        .from('users')
        .select('id')
        .limit(1);
      
      if (createError && createError.message.includes('does not exist')) {
        console.log('📦 Creating users table...');
        
        // Create the table using raw SQL
        const createTableQuery = `
          CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
          
          -- Enable RLS
          ALTER TABLE users ENABLE ROW LEVEL SECURITY;
          
          -- Create policies
          CREATE POLICY "Users can read own data" ON users
            FOR SELECT USING (auth.uid() = id);
            
          CREATE POLICY "Users can update own data" ON users
            FOR UPDATE USING (auth.uid() = id);
        `;
        
        // Note: In a real implementation, you'd run this SQL directly in Supabase dashboard
        console.log('📝 Users table SQL ready. Please run this in your Supabase SQL editor:');
        console.log(createTableQuery);
        console.log('✅ Users table initialization completed (manual setup required)');
      } else {
        console.log('✅ Users table already exists');
      }
    } else {
      console.log('✅ Users table initialized successfully');
    }
    
  } catch (error) {
    console.error('❌ Error initializing users table:', error);
    console.warn('⚠️ Please create the users table manually in Supabase');
  }
};

/**
 * Initialize storage buckets with proper Supabase limits (50MB max for free tier)
 */
export const initializeStorageBuckets = async (): Promise<void> => {
  try {
    // Check if recordings bucket exists (temporary storage)
    const { data: recordingsBucket, error: recordingsError } = await supabase.storage.getBucket(RECORDINGS_BUCKET);
    
    if (recordingsError && recordingsError.message.includes('not found')) {
      console.log('📦 Creating recordings bucket (temporary storage)...');
      const { error: createRecordingsError } = await supabase.storage.createBucket(RECORDINGS_BUCKET, {
        public: false,
        allowedMimeTypes: ['video/webm', 'video/mp4', 'audio/webm', 'audio/mp4'],
        fileSizeLimit: 1024 * 1024 * 50 // 50MB limit (Supabase free tier maximum)
      });
      
      if (createRecordingsError) {
        console.error('❌ Error creating recordings bucket:', createRecordingsError);
      } else {
        console.log('✅ Recordings bucket created successfully (50MB limit)');
      }
    } else if (!recordingsError) {
      console.log('✅ Recordings bucket already exists');
    }

    // Check if session transcripts bucket exists (temporary storage)
    const { data: transcriptsBucket, error: transcriptsError } = await supabase.storage.getBucket(TRANSCRIPTS_BUCKET);
    
    if (transcriptsError && transcriptsError.message.includes('not found')) {
      console.log('📦 Creating session transcripts bucket (temporary storage)...');
      const { error: createTranscriptsError } = await supabase.storage.createBucket(TRANSCRIPTS_BUCKET, {
        public: false,
        allowedMimeTypes: ['text/plain', 'application/json'],
        fileSizeLimit: 1024 * 1024 * 5 // 5MB limit for transcripts
      });
      
      if (createTranscriptsError) {
        console.error('❌ Error creating session transcripts bucket:', createTranscriptsError);
      } else {
        console.log('✅ Session transcripts bucket created successfully');
      }
    } else if (!transcriptsError) {
      console.log('✅ Session transcripts bucket already exists');
    }

    // Check if user transcripts bucket exists (persistent storage)
    const { data: userTranscriptsBucket, error: userTranscriptsError } = await supabase.storage.getBucket(USER_TRANSCRIPTS_BUCKET);
    
    if (userTranscriptsError && userTranscriptsError.message.includes('not found')) {
      console.log('📦 Creating user transcripts bucket (persistent storage)...');
      const { error: createUserTranscriptsError } = await supabase.storage.createBucket(USER_TRANSCRIPTS_BUCKET, {
        public: false,
        allowedMimeTypes: ['text/plain', 'application/json'],
        fileSizeLimit: 1024 * 1024 * 10 // 10MB limit for user transcripts
      });
      
      if (createUserTranscriptsError) {
        console.error('❌ Error creating user transcripts bucket:', createUserTranscriptsError);
      } else {
        console.log('✅ User transcripts bucket created successfully');
      }
    } else if (!userTranscriptsError) {
      console.log('✅ User transcripts bucket already exists');
    }

  } catch (error) {
    console.error('❌ Error initializing storage buckets:', error);
  }
};

/**
 * Upload recording file to Supabase Storage (temporary - deleted after session)
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
    
    console.log('📤 Uploading recording to Supabase (temporary):', {
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

    console.log('✅ Recording uploaded successfully (temporary):', urlData.publicUrl);
    
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
 * Upload transcript to session storage (temporary - deleted after session)
 */
export const uploadTranscript = async (
  conversationId: string,
  userName: string,
  transcript: any[]
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    const fileName = `${conversationId}/${userName}-transcript-${Date.now()}.json`;
    
    console.log('📤 Uploading transcript to session storage (temporary):', fileName);
    
    const transcriptData = {
      conversationId,
      userName,
      timestamp: new Date().toISOString(),
      events: transcript,
      eventCount: transcript.length,
      storageType: 'session_temporary'
    };
    
    const transcriptString = JSON.stringify(transcriptData, null, 2);
    
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

    console.log('✅ Transcript uploaded successfully (temporary):', urlData.publicUrl);
    
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
 * Upload transcript to user storage (persistent - kept after session)
 */
export const uploadUserTranscript = async (
  userId: string,
  conversationId: string,
  userName: string,
  transcript: any[],
  jobTitle: string,
  company?: string
): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    const fileName = `${userId}/${conversationId}-${Date.now()}.json`;
    
    console.log('📤 Uploading transcript to user storage (persistent):', fileName);
    
    const transcriptData = {
      userId,
      conversationId,
      userName,
      jobTitle,
      company: company || null,
      timestamp: new Date().toISOString(),
      events: transcript,
      eventCount: transcript.length,
      storageType: 'user_persistent'
    };
    
    const transcriptString = JSON.stringify(transcriptData, null, 2);
    
    const { data, error } = await supabase.storage
      .from(USER_TRANSCRIPTS_BUCKET)
      .upload(fileName, transcriptString, {
        contentType: 'application/json',
        upsert: false
      });

    if (error) {
      console.error('❌ Error uploading user transcript:', error);
      return { success: false, error: error.message };
    }

    // Get public URL for download
    const { data: urlData } = supabase.storage
      .from(USER_TRANSCRIPTS_BUCKET)
      .getPublicUrl(fileName);

    console.log('✅ User transcript uploaded successfully (persistent):', urlData.publicUrl);
    
    return { 
      success: true, 
      url: urlData.publicUrl 
    };

  } catch (error) {
    console.error('❌ Error in uploadUserTranscript:', error);
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
 * List files for a conversation (temporary storage)
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
 * List user transcripts (persistent storage)
 */
export const listUserTranscripts = async (
  userId: string
): Promise<{ transcripts: any[] }> => {
  try {
    const { data: transcripts, error: transcriptsError } = await supabase.storage
      .from(USER_TRANSCRIPTS_BUCKET)
      .list(userId);

    return {
      transcripts: transcripts || []
    };

  } catch (error) {
    console.error('❌ Error listing user transcripts:', error);
    return { transcripts: [] };
  }
};

/**
 * Delete recording files for a conversation (temporary storage cleanup)
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
 * Delete session transcript files for a conversation (temporary storage cleanup)
 */
export const deleteSessionTranscript = async (
  conversationId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // List all files in the conversation folder
    const { data: files, error: listError } = await supabase.storage
      .from(TRANSCRIPTS_BUCKET)
      .list(conversationId);

    if (listError) {
      console.error('❌ Error listing session transcript files:', listError);
      return { success: false, error: listError.message };
    }

    if (!files || files.length === 0) {
      console.log('📁 No session transcript files found for conversation:', conversationId);
      return { success: true };
    }

    // Delete all files in the conversation folder
    const filePaths = files.map(file => `${conversationId}/${file.name}`);
    
    const { error: deleteError } = await supabase.storage
      .from(TRANSCRIPTS_BUCKET)
      .remove(filePaths);

    if (deleteError) {
      console.error('❌ Error deleting session transcript files:', deleteError);
      return { success: false, error: deleteError.message };
    }

    console.log('✅ Session transcript files deleted successfully for conversation:', conversationId);
    return { success: true };

  } catch (error) {
    console.error('❌ Error in deleteSessionTranscript:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

/**
 * Session cleanup - delete recordings but preserve user transcript
 */
export const cleanupSession = async (
  conversationId: string,
  userId: string,
  userName: string,
  transcript: any[],
  jobTitle: string,
  company?: string
): Promise<{ success: boolean; userTranscriptUrl?: string; error?: string }> => {
  try {
    console.log('🧹 Starting session cleanup for conversation:', conversationId);
    
    // Step 1: Save transcript to user storage (persistent)
    let userTranscriptUrl: string | undefined;
    if (transcript && transcript.length > 0) {
      const userTranscriptResult = await uploadUserTranscript(
        userId,
        conversationId,
        userName,
        transcript,
        jobTitle,
        company
      );
      
      if (userTranscriptResult.success) {
        userTranscriptUrl = userTranscriptResult.url;
        console.log('✅ User transcript saved to persistent storage');
      } else {
        console.warn('⚠️ Failed to save user transcript:', userTranscriptResult.error);
      }
    }
    
    // Step 2: Delete recordings (temporary storage)
    await deleteRecording(conversationId);
    
    // Step 3: Delete session transcripts (temporary storage)
    await deleteSessionTranscript(conversationId);
    
    console.log('✅ Session cleanup completed successfully');
    
    return { 
      success: true, 
      userTranscriptUrl 
    };
    
  } catch (error) {
    console.error('❌ Error in session cleanup:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};