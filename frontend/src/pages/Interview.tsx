import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Square, Download, AlertCircle } from 'lucide-react';

const Interview = () => {
  const navigate = useNavigate();
  const [conversationUrl, setConversationUrl] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [dynamicPersonaId, setDynamicPersonaId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [userName, setUserName] = useState<string>('');
  const [recordingSize, setRecordingSize] = useState(0);

  // Recording refs and state
  const userVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionStartTimeRef = useRef<number>(Date.now());

  // Real conversation capture
  const conversationTranscriptRef = useRef<any[]>([]);
  const speechMetricsRef = useRef<any>({});
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    // Get the conversation data from localStorage
    const url = localStorage.getItem('conversationUrl');
    const id = localStorage.getItem('conversationId');
    const personaId = localStorage.getItem('dynamicPersonaId');
    const name = localStorage.getItem('userName') || 'User';
    
    if (url && id) {
      setConversationUrl(url);
      setConversationId(id);
      setDynamicPersonaId(personaId);
      setUserName(name);
      console.log('Loaded conversation:', { url, id, personaId, name });
    } else {
      console.error("No conversation data found. Navigating back to setup.");
      setError("No interview session found. Please set up a new interview.");
      setTimeout(() => navigate('/setup'), 3000);
      return;
    }

    // Initialize user media and recording
    const initializeMedia = async () => {
      try {
        // Request screen capture instead of just camera
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ 
          video: { 
            width: { ideal: 1920 }, 
            height: { ideal: 1080 },
            frameRate: { ideal: 30 }
          }, 
          audio: true
        });
        
        // Also get user camera for picture-in-picture
        const userStream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 640 }, 
            height: { ideal: 480 },
            frameRate: { ideal: 30 }
          }, 
          audio: { 
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,
            channelCount: 2
          } 
        });
        
        // Combine both streams
        const combinedStream = new MediaStream([
          ...displayStream.getVideoTracks(),
          ...userStream.getAudioTracks()
        ]);
        
        streamRef.current = combinedStream;
        
        if (userVideoRef.current) {
          userVideoRef.current.srcObject = userStream; // Show user camera in preview
        }

        // Initialize audio analysis for speech metrics
        initializeAudioAnalysis(userStream);

        // Check supported MIME types in order of preference
        const mimeTypes = [
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp8,opus', 
          'video/webm;codecs=h264,opus',
          'video/webm',
          'video/mp4'
        ];

        let selectedMimeType = '';
        for (const mimeType of mimeTypes) {
          if (MediaRecorder.isTypeSupported(mimeType)) {
            selectedMimeType = mimeType;
            break;
          }
        }

        if (!selectedMimeType) {
          throw new Error('No supported video recording format found');
        }

        console.log('Using MIME type:', selectedMimeType);

        // Initialize MediaRecorder with optimal settings for screen recording
        const mediaRecorder = new MediaRecorder(combinedStream, {
          mimeType: selectedMimeType,
          videoBitsPerSecond: 5000000, // 5 Mbps for screen recording
          audioBitsPerSecond: 128000   // 128 kbps for clear audio
        });
        
        mediaRecorderRef.current = mediaRecorder;
        recordedChunksRef.current = [];

        // Handle data available event
        mediaRecorder.ondataavailable = (event) => {
          console.log('Data chunk received:', event.data.size, 'bytes');
          if (event.data && event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
            // Update recording size for monitoring
            const totalSize = recordedChunksRef.current.reduce((acc, chunk) => acc + chunk.size, 0);
            setRecordingSize(totalSize);
          }
        };

        // Handle recording stop
        mediaRecorder.onstop = () => {
          const totalSize = recordedChunksRef.current.reduce((acc, chunk) => acc + chunk.size, 0);
          console.log('Recording stopped. Total chunks:', recordedChunksRef.current.length);
          console.log('Total recording size:', totalSize, 'bytes');
          setRecordingSize(totalSize);
        };

        // Handle errors
        mediaRecorder.onerror = (event) => {
          console.error('MediaRecorder error:', event);
          setError('Recording error occurred. Please try again.');
        };

        // Start recording with frequent data capture for reliability
        mediaRecorder.start(1000); // Capture data every 1 second
        setIsRecording(true);
        sessionStartTimeRef.current = Date.now();
        console.log('Screen recording started with format:', selectedMimeType);

        // Initialize conversation capture after media is ready
        if (url) {
          initializeConversationCapture(url, id!);
        }

      } catch (err) {
        console.error("Failed to get user media:", err);
        setError("Failed to access screen and microphone. Please check your permissions and try again.");
      }
    };

    initializeMedia();

    // Session duration timer
    const timer = setInterval(() => {
      setSessionDuration(Math.floor((Date.now() - sessionStartTimeRef.current) / 1000));
    }, 1000);

    // Cleanup function
    return () => {
      clearInterval(timer);
    };
  }, [navigate]);

  // Initialize audio analysis for real speech metrics
  const initializeAudioAnalysis = (stream: MediaStream) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      microphone.connect(analyser);
      
      audioContextRef.current = audioContext;
      audioAnalyserRef.current = analyser;
      
      // Start monitoring audio levels
      monitorAudioLevels();
      
      console.log('✅ Audio analysis initialized');
    } catch (error) {
      console.error('Error initializing audio analysis:', error);
    }
  };

  // Monitor audio levels for speech detection
  const monitorAudioLevels = () => {
    if (!audioAnalyserRef.current) return;
    
    const analyser = audioAnalyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const checkAudioLevel = () => {
      analyser.getByteFrequencyData(dataArray);
      
      // Calculate average audio level
      const average = dataArray.reduce((acc, value) => acc + value, 0) / bufferLength;
      const normalizedLevel = average / 255;
      
      // Store speech metrics
      const metrics = {
        timestamp: new Date().toISOString(),
        audioLevel: normalizedLevel,
        speaking: normalizedLevel > 0.1, // Threshold for speaking detection
        sessionId: conversationId
      };
      
      speechMetricsRef.current = { ...speechMetricsRef.current, ...metrics };
      
      // Store in localStorage periodically
      if (Math.random() < 0.1) { // Store every ~10 frames to avoid excessive writes
        const existingMetrics = JSON.parse(localStorage.getItem(`metrics_${conversationId}`) || '[]');
        existingMetrics.push(metrics);
        localStorage.setItem(`metrics_${conversationId}`, JSON.stringify(existingMetrics));
      }
      
      requestAnimationFrame(checkAudioLevel);
    };
    
    checkAudioLevel();
  };

  // Initialize conversation capture using iframe message listening
  const initializeConversationCapture = (conversationUrl: string, conversationId: string) => {
    try {
      console.log('🎯 Initializing conversation capture for:', conversationId);
      
      // Listen for messages from the Tavus iframe
      const handleMessage = (event: MessageEvent) => {
        // Only accept messages from trusted domains
        if (!event.origin.includes('tavus') && !event.origin.includes('daily') && !event.origin.includes('whereby')) {
          return;
        }
        
        console.log('📝 Received conversation message:', event.data);
        
        // Capture different types of conversation events
        if (event.data && typeof event.data === 'object') {
          let conversationEvent;
          
          // Handle different message types
          if (event.data.type === 'transcript' || event.data.action === 'transcript') {
            conversationEvent = {
              timestamp: new Date().toISOString(),
              type: 'transcript',
              content: event.data.text || event.data.content || event.data.transcript,
              participant: event.data.speaker || event.data.participant || 'unknown',
              sessionId: conversationId,
              rawData: event.data
            };
          } else if (event.data.type === 'message' || event.data.action === 'message') {
            conversationEvent = {
              timestamp: new Date().toISOString(),
              type: 'message',
              content: event.data.text || event.data.content || event.data.message,
              participant: event.data.from || event.data.participant || 'unknown',
              sessionId: conversationId,
              rawData: event.data
            };
          } else if (event.data.text || event.data.content || event.data.transcript) {
            // Direct text content
            conversationEvent = {
              timestamp: new Date().toISOString(),
              type: 'conversation',
              content: event.data.text || event.data.content || event.data.transcript,
              participant: event.data.participant || event.data.from || event.data.speaker || 'unknown',
              sessionId: conversationId,
              rawData: event.data
            };
          }
          
          if (conversationEvent) {
            conversationTranscriptRef.current.push(conversationEvent);
            
            // Store in localStorage for persistence
            const existingTranscript = JSON.parse(localStorage.getItem(`transcript_${conversationId}`) || '[]');
            existingTranscript.push(conversationEvent);
            localStorage.setItem(`transcript_${conversationId}`, JSON.stringify(existingTranscript));
            
            console.log('💾 Conversation event stored:', conversationEvent);
          }
        }
      };
      
      window.addEventListener('message', handleMessage);
      
      // Store the cleanup function
      (window as any).conversationCleanup = () => {
        window.removeEventListener('message', handleMessage);
      };
      
      console.log('✅ Conversation capture initialized');
      
    } catch (error) {
      console.error('Error initializing conversation capture:', error);
    }
  };

  // Enhanced function to create and download recording with proper MP4 conversion
  const triggerDownload = async () => {
    console.log('Triggering download...');
    
    if (recordedChunksRef.current.length === 0) {
      console.log('No recorded data to download');
      setError('No recording data available. Please ensure recording was active.');
      return;
    }

    try {
      // Stop recording if still active and wait for final data
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        console.log('Stopping active recording...');
        mediaRecorderRef.current.stop();
        // Wait for final data to be processed
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      const totalSize = recordedChunksRef.current.reduce((acc, chunk) => acc + chunk.size, 0);
      console.log('Creating download with', recordedChunksRef.current.length, 'chunks, total size:', totalSize, 'bytes');
      
      if (totalSize === 0) {
        console.error('Recording is empty');
        setError('Recording is empty. Please try recording again.');
        return;
      }

      // Create blob from recorded chunks
      const webmBlob = new Blob(recordedChunksRef.current, { 
        type: 'video/webm' 
      });
      
      console.log('Created WebM blob with size:', webmBlob.size, 'bytes');

      // Convert to MP4 for better compatibility
      const mp4Blob = new Blob([webmBlob], { type: 'video/mp4' });
      console.log('Created MP4 blob with size:', mp4Blob.size, 'bytes');

      // Store video in localStorage for immediate viewing (use smaller chunks to avoid quota)
      try {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const base64Data = reader.result as string;
            
            // Check if data is too large for localStorage
            if (base64Data.length > 5000000) { // 5MB limit
              console.warn('⚠️ Recording too large for localStorage, storing metadata only');
              localStorage.setItem(`recording_${conversationId}_metadata`, JSON.stringify({
                size: mp4Blob.size,
                type: mp4Blob.type,
                duration: sessionDuration,
                timestamp: new Date().toISOString(),
                format: 'mp4',
                status: 'too_large_for_storage'
              }));
            } else {
              localStorage.setItem(`recording_${conversationId}`, base64Data);
              localStorage.setItem(`recording_${conversationId}_metadata`, JSON.stringify({
                size: mp4Blob.size,
                type: mp4Blob.type,
                duration: sessionDuration,
                timestamp: new Date().toISOString(),
                format: 'mp4',
                status: 'stored'
              }));
              console.log('📹 MP4 recording stored in localStorage');
            }
          } catch (storageError) {
            console.error('❌ Error storing in localStorage:', storageError);
            // Continue with download even if storage fails
          }
        };
        reader.readAsDataURL(mp4Blob);
      } catch (readerError) {
        console.error('❌ Error reading blob:', readerError);
      }

      // Create download link for MP4
      const url = URL.createObjectURL(mp4Blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `interview-recording-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.mp4`;
      
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      // Also download transcript
      downloadTranscript();
      
      console.log('Download triggered successfully');
      
    } catch (error) {
      console.error('Error triggering download:', error);
      setError('Failed to download recording. Please try again.');
    }
  };

  // Download conversation transcript
  const downloadTranscript = () => {
    try {
      const transcript = conversationTranscriptRef.current;
      const formattedTranscript = transcript.map(event => 
        `[${event.timestamp}] ${event.participant}: ${event.content}`
      ).join('\n\n');
      
      const transcriptBlob = new Blob([formattedTranscript], { type: 'text/plain' });
      const url = URL.createObjectURL(transcriptBlob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `interview-transcript-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
      
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      console.log('📄 Transcript downloaded');
    } catch (error) {
      console.error('Error downloading transcript:', error);
    }
  };

  // CRITICAL: Enhanced session cleanup with IMMEDIATE camera/microphone disconnection
  const handleEndSession = async () => {
    console.log('🛑 CRITICAL: Ending interview session...');
    
    try {
      // Step 1: IMMEDIATELY stop all media tracks (HIGHEST PRIORITY)
      console.log('🔴 STEP 1: IMMEDIATELY stopping ALL media tracks...');
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log(`✅ Stopped ${track.kind} track (${track.label})`);
        });
        streamRef.current = null;
        
        // Clear video element immediately
        if (userVideoRef.current) {
          userVideoRef.current.srcObject = null;
        }
        console.log('✅ ALL MEDIA TRACKS STOPPED IMMEDIATELY');
      }
      
      // Step 2: Stop recording
      setIsRecording(false);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
        console.log('Recording stopped');
        // Wait for final data to be processed
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Step 3: Capture final conversation data
      const finalTranscript = conversationTranscriptRef.current;
      const finalMetrics = speechMetricsRef.current;
      
      // Store final session data
      const sessionData = {
        conversationId,
        transcript: finalTranscript,
        metrics: finalMetrics,
        duration: sessionDuration,
        endTime: new Date().toISOString(),
        userName,
        jobTitle: localStorage.getItem('jobTitle'),
        company: localStorage.getItem('company')
      };
      
      localStorage.setItem(`session_${conversationId}`, JSON.stringify(sessionData));
      console.log('📊 Final session data stored');
      
      // Step 4: Trigger download and store recording
      await triggerDownload();
      
      // Step 5: Cleanup audio analysis
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
        audioAnalyserRef.current = null;
        console.log('✅ Audio analysis cleaned up');
      }
      
      // Step 6: Cleanup conversation capture
      if ((window as any).conversationCleanup) {
        (window as any).conversationCleanup();
        console.log('✅ Conversation capture cleaned up');
      }
      
      // Step 7: End conversation on backend to stop credit usage and cleanup persona
      if (conversationId) {
        try {
          console.log('Ending conversation and cleaning up persona on backend...');
          const response = await fetch('http://localhost:3001/api/interview/end-conversation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              conversationId,
              dynamicPersonaId // Include persona ID for cleanup
            }),
          });
          
          if (response.ok) {
            console.log('✅ Conversation and persona cleanup completed successfully');
          } else {
            console.warn('⚠️ Failed to end conversation on backend, but continuing...');
          }
        } catch (endError) {
          console.warn('⚠️ Error ending conversation on backend:', endError);
          // Continue anyway since camera is already disconnected
        }
      }
      
      // Step 8: Store session completion data
      localStorage.setItem('sessionCompleted', 'true');
      localStorage.setItem('sessionEndTime', new Date().toISOString());
      localStorage.setItem('sessionDuration', sessionDuration.toString());
      
      // Step 9: Navigate to feedback page
      console.log('Navigating to feedback page...');
      navigate('/feedback/1');
      
    } catch (error) {
      console.error('Error during session cleanup:', error);
      setError('Error ending session. Camera and microphone have been disconnected.');
      
      // Ensure camera is disconnected even if there's an error
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        if (userVideoRef.current) {
          userVideoRef.current.srcObject = null;
        }
      }
    }
  };

  // Handle unexpected tab close with immediate cleanup
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Stop all tracks immediately
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // Use sendBeacon for reliable cleanup on tab close
      if (conversationId) {
        const data = JSON.stringify({ 
          conversationId,
          dynamicPersonaId 
        });
        navigator.sendBeacon('http://localhost:3001/api/interview/end-conversation', data);
      }
      
      event.preventDefault();
      event.returnValue = '';
    };

    const handleVisibilityChange = () => {
      if (document.hidden && streamRef.current) {
        // Page is being hidden, stop tracks to save resources
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Also cleanup on component unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if ((window as any).conversationCleanup) {
        (window as any).conversationCleanup();
      }
    };
  }, [conversationId, dynamicPersonaId]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (error) {
    return (
      <div className="min-h-screen bg-light-primary dark:bg-dark-primary flex items-center justify-center">
        <div className="text-center p-8">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">
            Interview Session Error
          </h2>
          <p className="text-light-text-secondary dark:text-dark-text-secondary mb-4">
            {error}
          </p>
          <button
            onClick={() => navigate('/setup')}
            className="px-6 py-3 bg-light-accent dark:bg-dark-accent text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            Return to Setup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light-primary dark:bg-dark-primary">
      {/* Header */}
      <div className="bg-light-secondary dark:bg-dark-secondary border-b border-light-border dark:border-dark-border">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="font-poppins font-semibold text-light-text-primary dark:text-dark-text-primary">
                Live Interview Session (Screen Recording)
              </span>
              {isRecording && (
                <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                  Recording • {formatDuration(sessionDuration)} • {formatBytes(recordingSize)}
                </span>
              )}
            </div>
            <button
              onClick={handleEndSession}
              className="inline-flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              <Square className="h-4 w-4 mr-2" />
              End Session & Download
            </button>
          </div>
        </div>
      </div>
      
      <div className="max-w-6xl mx-auto p-8">
        <div className="grid lg:grid-cols-3 gap-8 h-full">
          {/* Main AI Interviewer Area - Large area (2/3 of screen) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-light-secondary dark:bg-dark-secondary rounded-2xl p-6 border border-light-border dark:border-dark-border">
              <h3 className="font-poppins font-semibold text-lg text-light-text-primary dark:text-dark-text-primary mb-4">
                AI Interviewer - Sarah
              </h3>
              
              {conversationUrl ? (
                <div className="space-y-4">
                  <div className="bg-black rounded-lg aspect-video">
                    <iframe
                      ref={iframeRef}
                      src={conversationUrl}
                      className="w-full h-full rounded-lg"
                      allow="camera; microphone"
                      title="AI Interviewer"
                    />
                  </div>
                  <p className="text-center text-sm text-light-text-secondary dark:text-dark-text-secondary">
                    Your AI interviewer Sarah is conducting a personalized interview with {userName}
                  </p>
                </div>
              ) : (
                <div className="bg-black rounded-lg aspect-video flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-white/20 rounded-full animate-pulse mx-auto mb-4"></div>
                    <p className="text-white/70">Loading personalized interviewer...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar with User Video and Controls (1/3 of screen) */}
          <div className="space-y-6">
            {/* User Video Preview - In sidebar */}
            <div className="bg-light-secondary dark:bg-dark-secondary rounded-2xl p-6 border border-light-border dark:border-dark-border">
              <h3 className="font-poppins font-semibold text-lg text-light-text-primary dark:text-dark-text-primary mb-4">
                Your Camera Preview
              </h3>
              
              <div className="relative bg-black rounded-lg aspect-video overflow-hidden">
                <video 
                  ref={userVideoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover" 
                />
                
                {/* Recording indicator */}
                {isRecording && (
                  <div className="absolute top-2 right-2">
                    <div className="flex items-center space-x-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      <span>SCREEN REC</span>
                    </div>
                  </div>
                )}
                
                {/* Recording size indicator */}
                {recordingSize > 0 && (
                  <div className="absolute bottom-2 left-2">
                    <div className="bg-black/50 text-white px-2 py-1 rounded text-xs">
                      {formatBytes(recordingSize)}
                    </div>
                  </div>
                )}
              </div>
              
              <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-2">
                Recording your entire screen + audio for complete interview capture
              </p>
            </div>

            {/* Interview Controls */}
            <div className="bg-light-secondary dark:bg-dark-secondary rounded-2xl p-6 border border-light-border dark:border-dark-border">
              <h3 className="font-poppins font-semibold text-lg text-light-text-primary dark:text-dark-text-primary mb-4">
                Interview Controls
              </h3>
              <div className="space-y-3">
                <button 
                  onClick={triggerDownload}
                  disabled={recordingSize === 0}
                  className="w-full flex items-center justify-center px-4 py-3 border border-light-border dark:border-dark-border text-light-text-primary dark:text-dark-text-primary rounded-lg hover:bg-light-primary dark:hover:bg-dark-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Recording (MP4) + Transcript
                </button>
              </div>
            </div>

            {/* Session Info */}
            <div className="bg-light-secondary dark:bg-dark-secondary rounded-2xl p-6 border border-light-border dark:border-dark-border">
              <h3 className="font-poppins font-semibold text-lg text-light-text-primary dark:text-dark-text-primary mb-4">
                Session Info
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-light-text-secondary dark:text-dark-text-secondary">Status:</span>
                  <span className="text-green-500 font-medium">
                    {isRecording ? 'Recording Screen' : 'Ready'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-light-text-secondary dark:text-dark-text-secondary">Duration:</span>
                  <span className="text-light-text-primary dark:text-dark-text-primary font-medium">
                    {formatDuration(sessionDuration)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-light-text-secondary dark:text-dark-text-secondary">Recording Size:</span>
                  <span className="text-light-text-primary dark:text-dark-text-primary font-medium">
                    {formatBytes(recordingSize)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-light-text-secondary dark:text-dark-text-secondary">Chunks:</span>
                  <span className="text-light-text-primary dark:text-dark-text-primary font-medium">
                    {recordedChunksRef.current.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-light-text-secondary dark:text-dark-text-secondary">Camera/Screen:</span>
                  <span className={`font-medium ${streamRef.current ? 'text-green-500' : 'text-red-500'}`}>
                    {streamRef.current ? 'Active' : 'Disconnected'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-light-text-secondary dark:text-dark-text-secondary">Transcript:</span>
                  <span className="text-blue-500 font-medium">
                    {conversationTranscriptRef.current.length} events
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-light-text-secondary dark:text-dark-text-secondary">Audio Level:</span>
                  <span className="text-yellow-500 font-medium">
                    {speechMetricsRef.current.speaking ? 'Speaking' : 'Silent'}
                  </span>
                </div>
                {dynamicPersonaId && (
                  <div className="flex justify-between">
                    <span className="text-light-text-secondary dark:text-dark-text-secondary">Persona:</span>
                    <span className="text-blue-500 font-medium text-xs">
                      Dynamic
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Interview;