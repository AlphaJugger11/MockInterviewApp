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

  // Real conversation capture using Daily.js
  const conversationTranscriptRef = useRef<any[]>([]);
  const speechMetricsRef = useRef<any>({});
  const dailyCallRef = useRef<any>(null);
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
        // Get user camera and microphone for local preview
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
        
        streamRef.current = userStream;
        
        if (userVideoRef.current) {
          userVideoRef.current.srcObject = userStream; // Show user camera in preview
        }

        // Initialize Daily.js for conversation capture and recording
        if (url) {
          initializeDailyCapture(url, id!);
        }

        setIsRecording(true);
        sessionStartTimeRef.current = Date.now();
        console.log('✅ Media initialized successfully');

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

  // Initialize Daily.js for real conversation capture and recording
  const initializeDailyCapture = async (conversationUrl: string, conversationId: string) => {
    try {
      console.log('🎯 Initializing Daily.js for conversation capture and recording...');
      
      // Load Daily.js if not already loaded
      if (!(window as any).DailyIframe) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/@daily-co/daily-js';
        script.onload = () => {
          setupDailyCall(conversationUrl, conversationId);
        };
        document.head.appendChild(script);
      } else {
        setupDailyCall(conversationUrl, conversationId);
      }
      
    } catch (error) {
      console.error('Error initializing Daily.js:', error);
    }
  };

  // Setup Daily call for recording and transcript capture
  const setupDailyCall = (conversationUrl: string, conversationId: string) => {
    try {
      const Daily = (window as any).DailyIframe;
      
      // Create Daily call frame (hidden, just for API access)
      const callFrame = Daily.createFrame({
        showLeaveButton: false,
        showFullscreenButton: false,
        showLocalVideo: false,
        showParticipantsBar: false,
      });
      
      dailyCallRef.current = callFrame;
      
      // Listen for conversation events
      callFrame.on('participant-joined', (event: any) => {
        console.log('👤 Participant joined:', event.participant);
      });
      
      callFrame.on('participant-left', (event: any) => {
        console.log('👋 Participant left:', event.participant);
      });
      
      // Capture real-time transcript
      callFrame.on('app-message', (event: any) => {
        console.log('📝 Received app message:', event);
        
        if (event.data && (event.data.type === 'transcript' || event.data.transcript)) {
          const transcriptEvent = {
            timestamp: new Date().toISOString(),
            type: 'transcript',
            content: event.data.transcript || event.data.text || event.data.content,
            participant: event.data.participant || event.data.speaker || 'unknown',
            sessionId: conversationId,
            rawData: event.data
          };
          
          conversationTranscriptRef.current.push(transcriptEvent);
          
          // Store in localStorage for persistence
          const existingTranscript = JSON.parse(localStorage.getItem(`transcript_${conversationId}`) || '[]');
          existingTranscript.push(transcriptEvent);
          localStorage.setItem(`transcript_${conversationId}`, JSON.stringify(existingTranscript));
          
          console.log('💾 Real transcript event stored:', transcriptEvent);
        }
      });
      
      // Join the conversation
      callFrame.join({ url: conversationUrl }).then(() => {
        console.log('✅ Joined Daily call for transcript capture');
        
        // Start Daily.js recording using cloud recording
        setTimeout(() => {
          try {
            callFrame.startRecording({ 
              recordingType: 'cloud',
              layout: {
                preset: 'default'
              }
            });
            console.log('🎬 Started Daily.js cloud recording');
            setRecordingSize(1); // Indicate recording started
          } catch (recordError) {
            console.warn('⚠️ Could not start cloud recording:', recordError);
          }
        }, 2000);
        
      }).catch((error: any) => {
        console.error('❌ Failed to join Daily call:', error);
      });
      
    } catch (error) {
      console.error('Error setting up Daily call:', error);
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
      
      // Step 2: Stop Daily recording and leave call
      if (dailyCallRef.current) {
        try {
          console.log('🛑 Stopping Daily.js recording and leaving call...');
          await dailyCallRef.current.stopRecording();
          await dailyCallRef.current.leave();
          dailyCallRef.current.destroy();
          dailyCallRef.current = null;
          console.log('✅ Daily call ended and recording stopped');
        } catch (dailyError) {
          console.warn('⚠️ Error ending Daily call:', dailyError);
        }
      }
      
      // Step 3: Stop local recording if active
      setIsRecording(false);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
        console.log('Local recording stopped');
      }
      
      // Step 4: Capture final conversation data
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
      
      // Step 5: Download transcript
      downloadTranscript();
      
      // Step 6: End conversation on backend to stop credit usage and cleanup persona
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
      
      // Step 7: Store session completion data
      localStorage.setItem('sessionCompleted', 'true');
      localStorage.setItem('sessionEndTime', new Date().toISOString());
      localStorage.setItem('sessionDuration', sessionDuration.toString());
      
      // Step 8: Navigate to feedback page
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

  // Download conversation transcript
  const downloadTranscript = () => {
    try {
      const transcript = conversationTranscriptRef.current;
      
      if (transcript.length === 0) {
        console.warn('No transcript data to download');
        return;
      }
      
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

  // Handle unexpected tab close with immediate cleanup
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Stop all tracks immediately
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // Stop Daily call
      if (dailyCallRef.current) {
        dailyCallRef.current.leave();
        dailyCallRef.current.destroy();
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
      if (dailyCallRef.current) {
        dailyCallRef.current.leave();
        dailyCallRef.current.destroy();
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
                Live Interview Session (Daily.js Recording)
              </span>
              {isRecording && (
                <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                  Recording • {formatDuration(sessionDuration)} • Cloud Recording Active
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
                  <div className="text-center">
                    <div className="inline-flex items-center space-x-2 bg-green-500/10 text-green-600 dark:text-green-400 px-3 py-1 rounded-full text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span>Daily.js Cloud Recording Active</span>
                    </div>
                  </div>
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
                      <span>LIVE</span>
                    </div>
                  </div>
                )}
              </div>
              
              <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-2">
                Your camera preview - Daily.js is recording the complete interview
              </p>
            </div>

            {/* Interview Controls */}
            <div className="bg-light-secondary dark:bg-dark-secondary rounded-2xl p-6 border border-light-border dark:border-dark-border">
              <h3 className="font-poppins font-semibold text-lg text-light-text-primary dark:text-dark-text-primary mb-4">
                Interview Controls
              </h3>
              <div className="space-y-3">
                <button 
                  onClick={downloadTranscript}
                  disabled={conversationTranscriptRef.current.length === 0}
                  className="w-full flex items-center justify-center px-4 py-3 border border-light-border dark:border-dark-border text-light-text-primary dark:text-dark-text-primary rounded-lg hover:bg-light-primary dark:hover:bg-dark-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Real Transcript
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
                    {isRecording ? 'Live Interview' : 'Ready'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-light-text-secondary dark:text-dark-text-secondary">Duration:</span>
                  <span className="text-light-text-primary dark:text-dark-text-primary font-medium">
                    {formatDuration(sessionDuration)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-light-text-secondary dark:text-dark-text-secondary">Recording:</span>
                  <span className="text-green-500 font-medium">
                    Daily.js Cloud
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-light-text-secondary dark:text-dark-text-secondary">Camera/Mic:</span>
                  <span className={`font-medium ${streamRef.current ? 'text-green-500' : 'text-red-500'}`}>
                    {streamRef.current ? 'Active' : 'Disconnected'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-light-text-secondary dark:text-dark-text-secondary">Transcript Events:</span>
                  <span className="text-blue-500 font-medium">
                    {conversationTranscriptRef.current.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-light-text-secondary dark:text-dark-text-secondary">Daily Call:</span>
                  <span className={`font-medium ${dailyCallRef.current ? 'text-green-500' : 'text-gray-500'}`}>
                    {dailyCallRef.current ? 'Connected' : 'Disconnected'}
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