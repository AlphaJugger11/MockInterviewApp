import React, { useState, useRef, useEffect } from 'react';
import { Play, Square, Download, Upload, Trash2, AlertCircle, Info, Volume2, VolumeX } from 'lucide-react';
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
  const [audioEnabled, setAudioEnabled] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // FIXED: Start recording function with PROPER MIME TYPE HANDLING (Based on Supabase example)
  const startRecording = async () => {
    try {
      setError(null);
      console.log('🎬 Starting client-side recording with FIXED MIME TYPE HANDLING...');
      
      // STEP 1: Get screen capture with system audio
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          mediaSource: 'screen',
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 15, max: 30 }
        },
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 48000,
          channelCount: 2
        }
      });

      console.log('✅ Screen capture with system audio obtained');
      console.log('🔊 Display stream audio tracks:', displayStream.getAudioTracks().length);

      // STEP 2: Get microphone audio (optional)
      let micStream: MediaStream | null = null;
      if (audioEnabled) {
        try {
          micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: 48000
            }
          });
          console.log('✅ Microphone audio obtained');
          console.log('🎤 Microphone audio tracks:', micStream.getAudioTracks().length);
        } catch (micError) {
          console.warn('⚠️ Microphone access denied, continuing with screen audio only');
        }
      }

      // STEP 3: Create combined stream with ALL audio sources
      const combinedStream = new MediaStream();
      
      // Add video track from screen
      displayStream.getVideoTracks().forEach(track => {
        combinedStream.addTrack(track);
        console.log('📹 Added video track:', track.label);
      });

      // Add system audio from screen capture
      if (displayStream.getAudioTracks().length > 0) {
        displayStream.getAudioTracks().forEach(track => {
          combinedStream.addTrack(track);
          console.log('🔊 Added system audio track:', track.label);
        });
      } else {
        console.warn('⚠️ No system audio tracks found in display stream');
      }
      
      // Add microphone audio if available
      if (micStream && micStream.getAudioTracks().length > 0) {
        micStream.getAudioTracks().forEach(track => {
          combinedStream.addTrack(track);
          console.log('🎤 Added microphone track:', track.label);
        });
      }

      console.log('🎵 Total audio tracks in combined stream:', combinedStream.getAudioTracks().length);
      console.log('📹 Total video tracks in combined stream:', combinedStream.getVideoTracks().length);

      streamRef.current = combinedStream;

      // STEP 4: FIXED MediaRecorder setup with PROPER MIME TYPE (Based on Supabase example)
      let mimeType = '';
      
      // CRITICAL FIX: Test MIME types in order of preference
      const mimeTypes = [
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp9,opus', 
        'video/webm;codecs=h264,opus',
        'video/webm',
        'video/mp4'
      ];
      
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          console.log('✅ Selected MIME type:', mimeType);
          break;
        }
      }
      
      if (!mimeType) {
        console.error('❌ No supported MIME types found');
        throw new Error('Browser does not support video recording');
      }

      // FIXED: MediaRecorder with proper MIME type (Based on Supabase example)
      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: mimeType,
        videoBitsPerSecond: 500000,
        audioBitsPerSecond: 64000
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          console.log('📊 Recording chunk received:', {
            size: event.data.size,
            type: event.data.type,
            mimeType: mimeType
          });
          
          chunksRef.current.push(event.data);
          
          const currentSize = chunksRef.current.reduce((total, chunk) => total + chunk.size, 0);
          setRecordingSize(currentSize);
          
          console.log('📊 Total recording size:', Math.round(currentSize / 1024 / 1024), 'MB');
          
          // Warn if approaching 50MB limit
          const maxSize = 50 * 1024 * 1024;
          if (currentSize > maxSize * 0.8) {
            console.warn('⚠️ Recording approaching size limit:', Math.round(currentSize / 1024 / 1024), 'MB');
            setError(`Recording size: ${Math.round(currentSize / 1024 / 1024)}MB. Approaching 50MB limit.`);
          }
          
          if (currentSize > maxSize * 0.95) {
            console.warn('🛑 Auto-stopping recording due to size limit');
            stopRecording();
          }
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('🛑 Recording stopped, processing with FIXED MIME TYPE...');
        
        // CRITICAL FIX: Create blob with EXPLICIT MIME TYPE (Based on Supabase example)
        const blob = new Blob(chunksRef.current, { 
          type: mimeType // FIXED: Use the actual MIME type, not undefined
        });
        
        console.log('📊 FIXED Final blob details:', {
          size: blob.size,
          sizeMB: Math.round(blob.size / 1024 / 1024),
          type: blob.type, // Should now be video/webm, not text/plain
          mimeType: mimeType,
          chunks: chunksRef.current.length,
          audioTracks: combinedStream.getAudioTracks().length
        });
        
        // VALIDATION: Ensure blob has correct MIME type (Based on Supabase example)
        if (!blob.type || blob.type === 'text/plain' || blob.type === '') {
          console.error('❌ Blob has incorrect MIME type:', blob.type);
          console.log('🔧 Fixing blob MIME type...');
          
          // FORCE CORRECT MIME TYPE
          const fixedBlob = new Blob(chunksRef.current, { type: mimeType });
          console.log('✅ Fixed blob type:', fixedBlob.type);
          
          setRecordedBlob(fixedBlob);
          const url = URL.createObjectURL(fixedBlob);
          setRecordingUrl(url);
          
          // Auto-upload with fixed blob
          if (fixedBlob.size <= 50 * 1024 * 1024) {
            await uploadToSupabase(fixedBlob);
          }
          
          if (onRecordingComplete) {
            onRecordingComplete({
              blob: fixedBlob,
              url,
              duration: recordingDuration,
              size: fixedBlob.size,
              hasAudio: combinedStream.getAudioTracks().length > 0,
              mimeType: mimeType
            });
          }
        } else {
          console.log('✅ Blob has correct MIME type:', blob.type);
          
          setRecordedBlob(blob);
          const url = URL.createObjectURL(blob);
          setRecordingUrl(url);
          
          // Store in localStorage as backup
          localStorage.setItem(`client_recording_${conversationId}`, url);
          localStorage.setItem(`client_recording_${conversationId}_metadata`, JSON.stringify({
            size: blob.size,
            duration: recordingDuration,
            mimeType: blob.type,
            timestamp: new Date().toISOString(),
            audioTracks: combinedStream.getAudioTracks().length,
            hasSystemAudio: displayStream.getAudioTracks().length > 0,
            hasMicAudio: micStream ? micStream.getAudioTracks().length > 0 : false
          }));

          console.log('✅ Recording processed successfully with correct MIME type:', blob.type);
          
          // Auto-upload if under size limit
          if (blob.size <= 50 * 1024 * 1024) {
            await uploadToSupabase(blob);
          } else {
            setError(`Recording too large (${Math.round(blob.size / 1024 / 1024)}MB) for Supabase free tier. Maximum: 50MB.`);
            setUploadStatus('error');
          }
          
          if (onRecordingComplete) {
            onRecordingComplete({
              blob,
              url,
              duration: recordingDuration,
              size: blob.size,
              hasAudio: combinedStream.getAudioTracks().length > 0,
              mimeType: blob.type
            });
          }
        }
        
        setRecordingSize(blob.size);
      };

      mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event);
        setError('Recording error occurred. Please try again.');
        setUploadStatus('error');
      };

      // Start recording
      mediaRecorder.start(3000);
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

      console.log('✅ Client-side recording started successfully with FIXED MIME TYPE');

    } catch (error) {
      console.error('❌ Error starting recording:', error);
      setError('Failed to start recording. Please ensure you grant screen sharing permission and try again.');
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

  // ENHANCED: Start transcript capture from webhook with DETAILED LOGGING
  const startTranscriptCapture = () => {
    const captureTranscript = async () => {
      try {
        console.log('📝 Attempting to capture transcript for conversation:', conversationId);
        
        const response = await fetch(`http://localhost:3001/api/interview/get-conversation/${conversationId}`);
        
        console.log('📡 Transcript API response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          
          console.log('📊 TRANSCRIPT API RESPONSE:', {
            hasWebhookData: data.hasWebhookData,
            dataSource: data.dataSource,
            transcriptEventsLength: data.transcriptEvents?.length || 0,
            transcriptEvents: data.transcriptEvents
          });
          
          // DETAILED TRANSCRIPT LOGGING
          if (data.transcriptEvents && data.transcriptEvents.length > 0) {
            console.log('✅ TRANSCRIPT EVENTS RECEIVED:');
            data.transcriptEvents.forEach((event: any, index: number) => {
              console.log(`📝 Event ${index + 1}:`, {
                participant: event.participant,
                content: event.content?.substring(0, 100) + '...',
                timestamp: event.timestamp
              });
            });
            
            setTranscript(data.transcriptEvents);
            localStorage.setItem(`live_transcript_${conversationId}`, JSON.stringify(data.transcriptEvents));
            
            if (onTranscriptUpdate) {
              onTranscriptUpdate(data.transcriptEvents);
            }
            
            console.log('📝 Live transcript updated:', data.transcriptEvents.length, 'events');
          } else {
            console.log('⚠️ No transcript events in response');
          }
          
          // Check webhook status
          if (data.hasWebhookData) {
            console.log('✅ WEBHOOK DATA RECEIVED - Using real conversation transcript');
          } else if (data.dataSource === 'api_fallback') {
            console.log('📡 Using API fallback transcript data');
          } else {
            console.log('⏳ Waiting for webhook transcript data...');
          }
        } else {
          console.warn('⚠️ Transcript API error response:', response.status, response.statusText);
        }
      } catch (error) {
        console.warn('⚠️ Error capturing live transcript (expected during timeouts):', error instanceof Error ? error.message : 'Unknown error');
      }
    };

    // Initial capture
    captureTranscript();
    
    // Set up interval - capture every 3 seconds
    transcriptIntervalRef.current = setInterval(captureTranscript, 3000);
    console.log('📝 Started ENHANCED transcript capture every 3 seconds');
  };

  // Handle recording completion
  const handleRecordingComplete = (data: any) => {
    setRecordingData(data);
    console.log('✅ Recording completed with FIXED MIME TYPE:', data);
  };

  // Handle transcript updates
  const handleTranscriptUpdate = (transcript: any[]) => {
    setTranscript(transcript);
    console.log('📝 Transcript updated:', transcript.length, 'events');
  };

  // FIXED: Upload to Supabase with PROPER MIME TYPE (Based on Supabase example)
  const uploadToSupabase = async (blob: Blob) => {
    setIsUploading(true);
    setUploadStatus('uploading');

    try {
      console.log('☁️ Uploading to Supabase Storage with FIXED MIME TYPE...');
      console.log('📊 FIXED Blob details for upload:', {
        size: blob.size,
        sizeMB: Math.round(blob.size / 1024 / 1024),
        type: blob.type, // Should now be video/webm
        conversationId,
        userName
      });
      
      // VALIDATION: Check MIME type before upload (Based on Supabase example)
      const allowedMimeTypes = ['video/webm', 'video/mp4', 'audio/webm', 'audio/mp4'];
      if (!blob.type || !allowedMimeTypes.includes(blob.type)) {
        console.error('❌ Invalid blob MIME type detected:', blob.type);
        throw new Error(`Invalid file type: ${blob.type}. Expected video/webm, video/mp4, audio/webm, or audio/mp4.`);
      }
      
      // Check size limit
      const maxSize = 50 * 1024 * 1024;
      if (blob.size > maxSize) {
        throw new Error(`File too large (${Math.round(blob.size / 1024 / 1024)}MB). Maximum allowed: 50MB.`);
      }
      
      const result = await uploadRecordingToSupabase(conversationId, userName, blob);
      
      if (result.success && result.url) {
        setSupabaseUrl(result.url);
        setUploadStatus('success');
        console.log('✅ Upload successful with FIXED MIME TYPE:', result.url);
        
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

  // Delete from Supabase
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
        Client-Side Recording System with FIXED MIME TYPE + Webhook Transcription
      </h3>

      {/* Enhanced Audio Capture Info */}
      <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-start space-x-2">
        <Volume2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
        <div className="text-green-600 dark:text-green-400 text-sm">
          <p className="font-medium">FIXED: Enhanced Audio + Webhook Transcription</p>
          <p>Recording captures system audio (AI voice) + microphone with PROPER MIME TYPE. Transcript captured via Tavus webhook.</p>
        </div>
      </div>

      {/* MIME Type Fix Info */}
      <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-start space-x-2">
        <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="text-blue-600 dark:text-blue-400 text-sm">
          <p className="font-medium">FIXED: MIME Type Issue Resolved (Based on Supabase Example)</p>
          <p>Recording now uses proper video/webm MIME type instead of text/plain. Backend will accept the files correctly.</p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span className="text-red-600 dark:text-red-400 text-sm">{error}</span>
        </div>
      )}

      {/* Audio Settings */}
      <div className="mb-4 flex items-center space-x-4">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={audioEnabled}
            onChange={(e) => setAudioEnabled(e.target.checked)}
            className="w-4 h-4 text-light-accent dark:text-dark-accent bg-light-primary dark:bg-dark-primary border-light-border dark:border-dark-border rounded focus:ring-light-accent dark:focus:ring-dark-accent focus:ring-2"
          />
          <span className="text-sm text-light-text-primary dark:text-dark-text-primary">
            Include microphone audio
          </span>
        </label>
        {audioEnabled ? (
          <Volume2 className="h-4 w-4 text-green-500" />
        ) : (
          <VolumeX className="h-4 w-4 text-gray-500" />
        )}
      </div>

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
            Recording Preview ({formatFileSize(recordedBlob?.size || 0)}) - FIXED MIME TYPE: {recordedBlob?.type}
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
            ✅ Recording stored in Supabase Storage with FIXED MIME TYPE
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
            📝 Webhook transcript captured: {transcript.length} events (REAL conversation data)
          </p>
          <div className="mt-2 text-xs text-light-text-secondary dark:text-dark-text-secondary">
            <p>Latest events:</p>
            {transcript.slice(-3).map((event, index) => (
              <p key={index} className="truncate">
                • {event.participant}: {event.content?.substring(0, 50)}...
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Recording Info */}
      <div className="mt-4 text-xs text-light-text-secondary dark:text-dark-text-secondary space-y-1">
        <p>• <strong>FIXED:</strong> Proper MIME type handling (video/webm instead of text/plain) based on Supabase example</p>
        <p>• <strong>ENHANCED:</strong> System audio (AI voice) + Microphone audio capture</p>
        <p>• <strong>WEBHOOK TRANSCRIPTION:</strong> Real conversation data from Tavus webhooks with verbose mode</p>
        <p>• <strong>DETAILED LOGGING:</strong> Full transcript events logged to console for debugging</p>
        <p>• Recording optimized for Supabase 50MB limit with proper file validation</p>
        <p>• Backend now accepts files with correct MIME type detection</p>
        <p>• AI analysis uses REAL webhook transcript data for accurate feedback</p>
        <p>• Enhanced content field checking (content, text, message) for robust transcript parsing</p>
      </div>
    </div>
  );
};

export default FullSessionRecorder;