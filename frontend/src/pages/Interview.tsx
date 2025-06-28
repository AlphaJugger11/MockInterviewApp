import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Square, Download, AlertCircle } from 'lucide-react';

const Interview = () => {
  const navigate = useNavigate();
  const [conversationUrl, setConversationUrl] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
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

  useEffect(() => {
    // Get the conversation data from localStorage
    const url = localStorage.getItem('conversationUrl');
    const id = localStorage.getItem('conversationId');
    const name = localStorage.getItem('userName') || 'User';
    
    if (url && id) {
      setConversationUrl(url);
      setConversationId(id);
      setUserName(name);
      console.log('Loaded conversation:', { url, id, name });
    } else {
      console.error("No conversation data found. Navigating back to setup.");
      setError("No interview session found. Please set up a new interview.");
      setTimeout(() => navigate('/setup'), 3000);
      return;
    }

    // Initialize user media and recording
    const initializeMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280 }, 
            height: { ideal: 720 },
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
        
        streamRef.current = stream;
        
        if (userVideoRef.current) {
          userVideoRef.current.srcObject = stream;
        }

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

        // Initialize MediaRecorder with optimal settings
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: selectedMimeType,
          videoBitsPerSecond: 2500000, // 2.5 Mbps for good quality
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
        console.log('Recording started with format:', selectedMimeType);

      } catch (err) {
        console.error("Failed to get user media:", err);
        setError("Failed to access camera and microphone. Please check your permissions and try again.");
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

  // Enhanced function to create and download recording
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
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const totalSize = recordedChunksRef.current.reduce((acc, chunk) => acc + chunk.size, 0);
      console.log('Creating download with', recordedChunksRef.current.length, 'chunks, total size:', totalSize, 'bytes');
      
      if (totalSize === 0) {
        console.error('Recording is empty');
        setError('Recording is empty. Please try recording again.');
        return;
      }

      // Create blob from recorded chunks
      const blob = new Blob(recordedChunksRef.current, { 
        type: 'video/webm' 
      });
      
      console.log('Created blob with size:', blob.size, 'bytes');

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `interview-recording-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
      
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      console.log('Download triggered successfully');
      
    } catch (error) {
      console.error('Error triggering download:', error);
      setError('Failed to download recording. Please try again.');
    }
  };

  // Enhanced session cleanup with proper order and error handling
  const handleEndSession = async () => {
    console.log('🛑 Ending interview session...');
    
    try {
      // Step 1: Stop recording first
      setIsRecording(false);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
        console.log('Recording stopped');
        // Wait for final data to be processed
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      
      // Step 2: Trigger download
      await triggerDownload();
      
      // Step 3: Stop all media tracks IMMEDIATELY (turn off camera light)
      if (streamRef.current) {
        console.log('Stopping all media tracks...');
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log(`Stopped ${track.kind} track`);
        });
        streamRef.current = null;
        
        // Clear video element
        if (userVideoRef.current) {
          userVideoRef.current.srcObject = null;
        }
        console.log('✅ Camera and microphone disconnected');
      }
      
      // Step 4: End conversation on backend to stop credit usage
      if (conversationId) {
        try {
          console.log('Ending conversation on backend...');
          const response = await fetch('http://localhost:3001/api/interview/end-conversation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversationId }),
          });
          
          if (response.ok) {
            console.log('✅ Conversation ended successfully on backend');
          } else {
            console.warn('⚠️ Failed to end conversation on backend, but continuing...');
          }
        } catch (endError) {
          console.warn('⚠️ Error ending conversation on backend:', endError);
          // Continue anyway since camera is already disconnected
        }
      }
      
      // Step 5: Store session completion data
      localStorage.setItem('sessionCompleted', 'true');
      localStorage.setItem('sessionEndTime', new Date().toISOString());
      localStorage.setItem('sessionDuration', sessionDuration.toString());
      
      // Step 6: Navigate to feedback page
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
        const data = JSON.stringify({ conversationId });
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
    };
  }, [conversationId]);

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
                Live Interview Session
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
              End Session
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
                      src={conversationUrl}
                      className="w-full h-full rounded-lg"
                      allow="camera; microphone"
                      title="AI Interviewer"
                    />
                  </div>
                  <p className="text-center text-sm text-light-text-secondary dark:text-dark-text-secondary">
                    Your AI interviewer Sarah is conducting the interview with {userName}
                  </p>
                </div>
              ) : (
                <div className="bg-black rounded-lg aspect-video flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-white/20 rounded-full animate-pulse mx-auto mb-4"></div>
                    <p className="text-white/70">Loading interviewer...</p>
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
                Your Video
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
                      <span>REC</span>
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
                  Download Recording
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
                    {isRecording ? 'Recording' : 'Ready'}
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
                  <span className="text-light-text-secondary dark:text-dark-text-secondary">Camera:</span>
                  <span className="text-green-500 font-medium">
                    {streamRef.current ? 'Active' : 'Disconnected'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Interview;