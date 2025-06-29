import React, { useState, useRef, useEffect } from 'react';
import { Play, Square, Download, Upload, Trash2, AlertCircle, Info } from 'lucide-react';
import { uploadRecordingToSupabase } from '../services/supabaseClient';

interface FullSessionRecorderProps {
  conversationId: string;
  userName: string;
  onRecordingComplete?: (recordingData: any) => void;
  onTranscriptUpdate?: (transcript: any[]) => void;
}

const FullSessionRecorder: React.FC<FullSessionRecorderProps> = ({
  conversationId,
  userName,
  onRecordingComplete,
  onTranscriptUpdate
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [supabaseUrl, setSupabaseUrl] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [transcript, setTranscript] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [recordingSize, setRecordingSize] = useState<number>(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start recording function with size optimization
  const startRecording = async () => {
    try {
      setError(null);
      console.log('🎬 Starting client-side recording with size optimization...');
      
      // Get screen capture with optimized settings for smaller file size
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          mediaSource: 'screen',
          width: { ideal: 1280, max: 1920 }, // Reduced resolution for smaller files
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 15, max: 30 } // Reduced frame rate for smaller files
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      // Get microphone audio
      let micStream: MediaStream | null = null;
      try {
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100
          }
        });
      } catch (micError) {
        console.warn('⚠️ Microphone access denied, continuing with screen audio only');
      }

      // Combine streams
      const combinedStream = new MediaStream();
      
      // Add video track from screen
      displayStream.getVideoTracks().forEach(track => {
        combinedStream.addTrack(track);
      });

      // Add audio tracks
      if (displayStream.getAudioTracks().length > 0) {
        displayStream.getAudioTracks().forEach(track => {
          combinedStream.addTrack(track);
        });
      }
      
      if (micStream && micStream.getAudioTracks().length > 0) {
        micStream.getAudioTracks().forEach(track => {
          combinedStream.addTrack(track);
        });
      }

      streamRef.current = combinedStream;

      // Set up MediaRecorder with optimized settings for smaller file size
      let mimeType = 'video/webm;codecs=vp8,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp9,opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm';
        }
      }

      console.log('🎥 Using MIME type:', mimeType);

      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: mimeType,
        videoBitsPerSecond: 1000000, // Reduced to 1MB/s for smaller files
        audioBitsPerSecond: 64000    // 64KB/s for audio
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
          
          // Calculate current recording size
          const currentSize = chunksRef.current.reduce((total, chunk) => total + chunk.size, 0);
          setRecordingSize(currentSize);
          
          console.log('📊 Recording chunk:', event.data.size, 'bytes, Total:', Math.round(currentSize / 1024 / 1024), 'MB');
          
          // Warn if approaching 50MB limit
          const maxSize = 50 * 1024 * 1024; // 50MB
          if (currentSize > maxSize * 0.8) { // 80% of limit
            console.warn('⚠️ Recording approaching size limit:', Math.round(currentSize / 1024 / 1024), 'MB');
            setError(`Recording size: ${Math.round(currentSize / 1024 / 1024)}MB. Approaching 50MB limit.`);
          }
          
          // Auto-stop if reaching limit
          if (currentSize > maxSize * 0.95) { // 95% of limit
            console.warn('🛑 Auto-stopping recording due to size limit');
            stopRecording();
          }
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('🛑 Recording stopped, processing...');
        const blob = new Blob(chunksRef.current, { type: mimeType });
        
        console.log('📊 Final blob details:', {
          size: blob.size,
          sizeMB: Math.round(blob.size / 1024 / 1024),
          type: blob.type,
          chunks: chunksRef.current.length
        });
        
        setRecordingSize(blob.size);
        
        if (blob.size > 1000) { // Ensure minimum file size
          setRecordedBlob(blob);
          const url = URL.createObjectURL(blob);
          setRecordingUrl(url);
          
          // Store in localStorage as backup
          localStorage.setItem(`client_recording_${conversationId}`, url);
          localStorage.setItem(`client_recording_${conversationId}_metadata`, JSON.stringify({
            size: blob.size,
            duration: recordingDuration,
            mimeType: mimeType,
            timestamp: new Date().toISOString()
          }));

          console.log('✅ Recording processed successfully:', Math.round(blob.size / 1024 / 1024), 'MB');
          
          // Check size before auto-upload
          const maxSize = 50 * 1024 * 1024; // 50MB
          if (blob.size <= maxSize) {
            await uploadToSupabase(blob);
          } else {
            setError(`Recording too large (${Math.round(blob.size / 1024 / 1024)}MB) for Supabase free tier. Maximum: 50MB. Please use local download.`);
            setUploadStatus('error');
          }
          
          if (onRecordingComplete) {
            onRecordingComplete({
              blob,
              url,
              duration: recordingDuration,
              size: blob.size
            });
          }
        } else {
          console.error('❌ Recording too small, likely corrupted');
          setError('Recording failed - file too small. Please try again.');
          setUploadStatus('error');
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event);
        setError('Recording error occurred. Please try again.');
        setUploadStatus('error');
      };

      // Start recording with larger intervals for smaller file size
      mediaRecorder.start(2000); // Collect data every 2 seconds
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingDuration(0);
      setRecordingSize(0);

      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      // Start transcript capture
      startTranscriptCapture();

      // Handle stream end
      combinedStream.getVideoTracks()[0].addEventListener('ended', () => {
        console.log('📺 Screen sharing ended by user');
        stopRecording();
      });

      console.log('✅ Client-side recording started successfully with size optimization');

    } catch (error) {
      console.error('❌ Error starting recording:', error);
      setError('Failed to start recording. Please check permissions and try again.');
      setUploadStatus('error');
    }
  };

  // Stop recording function
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }

    if (transcriptIntervalRef.current) {
      clearInterval(transcriptIntervalRef.current);
    }

    setIsRecording(false);
    console.log('🛑 Recording stopped');
  };

  // Start transcript capture
  const startTranscriptCapture = () => {
    const captureTranscript = async () => {
      try {
        const response = await fetch(`http://localhost:3001/api/interview/get-conversation/${conversationId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.transcriptEvents && data.transcriptEvents.length > 0) {
            setTranscript(data.transcriptEvents);
            localStorage.setItem(`live_transcript_${conversationId}`, JSON.stringify(data.transcriptEvents));
            
            if (onTranscriptUpdate) {
              onTranscriptUpdate(data.transcriptEvents);
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ Error capturing transcript:', error);
      }
    };

    // Initial capture
    captureTranscript();
    
    // Set up interval
    transcriptIntervalRef.current = setInterval(captureTranscript, 3000);
  };

  // Upload to Supabase with size check
  const uploadToSupabase = async (blob: Blob) => {
    setIsUploading(true);
    setUploadStatus('uploading');

    try {
      console.log('☁️ Uploading to Supabase Storage...');
      console.log('📊 Blob details for upload:', {
        size: blob.size,
        sizeMB: Math.round(blob.size / 1024 / 1024),
        type: blob.type,
        conversationId,
        userName
      });
      
      // Check size limit before upload
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (blob.size > maxSize) {
        throw new Error(`File too large (${Math.round(blob.size / 1024 / 1024)}MB). Maximum allowed: 50MB for Supabase free tier.`);
      }
      
      const result = await uploadRecordingToSupabase(conversationId, userName, blob);
      
      if (result.success && result.url) {
        setSupabaseUrl(result.url);
        setUploadStatus('success');
        console.log('✅ Upload successful:', result.url);
        
        // Store Supabase URL
        localStorage.setItem(`supabase_recording_${conversationId}`, result.url);
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('❌ Upload failed:', error);
      setError(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setUploadStatus('error');
    } finally {
      setIsUploading(false);
    }
  };

  // Download recording
  const downloadRecording = () => {
    if (recordingUrl) {
      const link = document.createElement('a');
      link.href = recordingUrl;
      link.download = `interview-recording-${userName}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
      link.click();
      console.log('📥 Recording download triggered');
    }
  };

  // Delete from Supabase (called after session ends)
  const deleteFromSupabase = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/interview/delete-recording/${conversationId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        console.log('🗑️ Recording deleted from Supabase');
        setSupabaseUrl(null);
        localStorage.removeItem(`supabase_recording_${conversationId}`);
      }
    } catch (error) {
      console.error('❌ Error deleting from Supabase:', error);
    }
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (transcriptIntervalRef.current) {
        clearInterval(transcriptIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="bg-light-secondary dark:bg-dark-secondary p-6 rounded-xl border border-light-border dark:border-dark-border">
      <h3 className="font-poppins font-semibold text-lg text-light-text-primary dark:text-dark-text-primary mb-4">
        Client-Side Recording System
      </h3>

      {/* Supabase Size Limit Warning */}
      <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-start space-x-2">
        <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="text-blue-600 dark:text-blue-400 text-sm">
          <p className="font-medium">Supabase Free Tier Limit: 50MB per file</p>
          <p>Recording optimized for smaller file size. Large recordings will be available for local download only.</p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span className="text-red-600 dark:text-red-400 text-sm">{error}</span>
        </div>
      )}

      {/* Recording Controls */}
      <div className="flex items-center space-x-4 mb-4">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="inline-flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            <Play className="h-4 w-4 mr-2" />
            Start Recording
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="inline-flex items-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            <Square className="h-4 w-4 mr-2" />
            Stop Recording
          </button>
        )}

        {isRecording && (
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-light-text-primary dark:text-dark-text-primary font-medium">
                {formatDuration(recordingDuration)}
              </span>
            </div>
            <div className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
              Size: {formatFileSize(recordingSize)}
              {recordingSize > 0 && (
                <span className={`ml-2 ${recordingSize > 40 * 1024 * 1024 ? 'text-orange-500' : 'text-green-500'}`}>
                  ({Math.round((recordingSize / (50 * 1024 * 1024)) * 100)}% of 50MB limit)
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Recording Preview */}
      {recordingUrl && (
        <div className="mb-4">
          <h4 className="font-medium text-light-text-primary dark:text-dark-text-primary mb-2">
            Recording Preview ({formatFileSize(recordedBlob?.size || 0)})
          </h4>
          <video
            ref={videoRef}
            src={recordingUrl}
            controls
            className="w-full max-w-md rounded-lg bg-black"
          />
        </div>
      )}

      {/* Upload Status */}
      <div className="mb-4">
        <div className="flex items-center space-x-2 mb-2">
          <span className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
            Supabase Upload Status:
          </span>
          <span className={`text-sm px-2 py-1 rounded-full ${
            uploadStatus === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
            uploadStatus === 'uploading' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
            uploadStatus === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
            'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
          }`}>
            {uploadStatus === 'success' ? 'Uploaded' :
             uploadStatus === 'uploading' ? 'Uploading...' :
             uploadStatus === 'error' ? 'Failed' : 'Pending'}
          </span>
        </div>

        {supabaseUrl && (
          <p className="text-xs text-green-600 dark:text-green-400">
            ✅ Recording stored in Supabase Storage
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        {recordedBlob && (
          <button
            onClick={downloadRecording}
            className="inline-flex items-center px-4 py-2 bg-light-accent dark:bg-dark-accent text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Recording
          </button>
        )}

        {recordedBlob && !isUploading && uploadStatus !== 'success' && recordedBlob.size <= 50 * 1024 * 1024 && (
          <button
            onClick={() => uploadToSupabase(recordedBlob)}
            className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Upload className="h-4 w-4 mr-2" />
            Retry Upload
          </button>
        )}

        {supabaseUrl && (
          <button
            onClick={deleteFromSupabase}
            className="inline-flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete from Cloud
          </button>
        )}
      </div>

      {/* Transcript Info */}
      {transcript.length > 0 && (
        <div className="mt-4 p-3 bg-light-primary dark:bg-dark-primary rounded-lg">
          <p className="text-sm text-light-text-primary dark:text-dark-text-primary">
            📝 Transcript captured: {transcript.length} events
          </p>
        </div>
      )}

      {/* Recording Info */}
      <div className="mt-4 text-xs text-light-text-secondary dark:text-dark-text-secondary space-y-1">
        <p>• Recording optimized for Supabase 50MB limit (reduced resolution/bitrate)</p>
        <p>• Files larger than 50MB available for local download only</p>
        <p>• Automatic upload to Supabase Storage for files under 50MB</p>
        <p>• Recordings deleted from cloud after session for storage optimization</p>
        <p>• Transcript captured in real-time for AI analysis</p>
        <p>• WebM format with VP8/VP9 codec for maximum compatibility</p>
      </div>
    </div>
  );
};

export default FullSessionRecorder;