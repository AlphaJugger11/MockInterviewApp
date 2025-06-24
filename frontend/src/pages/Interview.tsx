import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SkipForward, Square, Mic, MicOff, Video, VideoOff, Download, AlertCircle } from 'lucide-react';

const Interview = () => {
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [conversationUrl, setConversationUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);

  // Recording refs and state
  const userVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionStartTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    // Get the conversation URL from localStorage
    const url = localStorage.getItem('conversationUrl');
    if (url) {
      setConversationUrl(url);
      console.log('Loaded conversation URL:', url);
    } else {
      console.error("No conversation URL found. Navigating back to setup.");
      setError("No interview session found. Please set up a new interview.");
      setTimeout(() => navigate('/setup'), 3000);
      return;
    }

    // Initialize user media and recording
    const initializeMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        
        streamRef.current = stream;
        
        if (userVideoRef.current) {
          userVideoRef.current.srcObject = stream;
        }

        // Initialize MediaRecorder
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp9'
        });
        
        mediaRecorderRef.current = mediaRecorder;
        recordedChunksRef.current = [];

        // Handle data available event
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        // Start recording
        mediaRecorder.start(1000); // Record in 1-second chunks
        setIsRecording(true);
        sessionStartTimeRef.current = Date.now();
        console.log('Recording started');

      } catch (err) {
        console.error("Failed to get user media:", err);
        setError("Failed to access camera and microphone. Please check your permissions.");
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
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [navigate]);

  // Function to trigger download
  const triggerDownload = () => {
    if (recordedChunksRef.current.length === 0) {
      console.log('No recorded data to download');
      return;
    }

    try {
      // Stop recording if still active
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }

      // Create blob and download
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `interview-recording-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
      
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('Download triggered successfully');
    } catch (error) {
      console.error('Error triggering download:', error);
      setError('Failed to download recording. Please try again.');
    }
  };

  // Handle automatic download on page unload/crash
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      triggerDownload();
      // Optional: Show confirmation dialog
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const handleEndSession = () => {
    setIsRecording(false);
    
    // Stop recording and trigger download
    triggerDownload();
    
    // Stop all media tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    // Clear conversation URL from localStorage
    localStorage.removeItem('conversationUrl');
    
    // Navigate to feedback page after a short delay to ensure download starts
    setTimeout(() => {
      navigate('/feedback/1');
    }, 1000);
  };

  const toggleMute = () => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTracks = streamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !isVideoOn;
      });
      setIsVideoOn(!isVideoOn);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
                  Recording • {formatDuration(sessionDuration)}
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
          {/* Main Video Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* User Video */}
            <div className="relative bg-black rounded-2xl overflow-hidden aspect-video">
              <video 
                ref={userVideoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover" 
              />
              
              {!isVideoOn && (
                <div className="absolute inset-0 bg-black flex items-center justify-center">
                  <div className="text-center">
                    <VideoOff className="h-16 w-16 text-white/50 mx-auto mb-4" />
                    <p className="text-white/70">Camera is off</p>
                  </div>
                </div>
              )}
              
              {/* Video Controls Overlay */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                <div className="flex items-center space-x-4 bg-black/50 backdrop-blur-sm rounded-full px-6 py-3">
                  <button
                    onClick={toggleMute}
                    className={`p-3 rounded-full transition-colors ${
                      isMuted 
                        ? 'bg-red-500 hover:bg-red-600' 
                        : 'bg-white/20 hover:bg-white/30'
                    }`}
                  >
                    {isMuted ? (
                      <MicOff className="h-5 w-5 text-white" />
                    ) : (
                      <Mic className="h-5 w-5 text-white" />
                    )}
                  </button>
                  
                  <button
                    onClick={toggleVideo}
                    className={`p-3 rounded-full transition-colors ${
                      !isVideoOn 
                        ? 'bg-red-500 hover:bg-red-600' 
                        : 'bg-white/20 hover:bg-white/30'
                    }`}
                  >
                    {!isVideoOn ? (
                      <VideoOff className="h-5 w-5 text-white" />
                    ) : (
                      <Video className="h-5 w-5 text-white" />
                    )}
                  </button>

                  <button
                    onClick={triggerDownload}
                    className="p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                    title="Download Recording"
                  >
                    <Download className="h-5 w-5 text-white" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* AI Interviewer */}
            <div className="bg-light-secondary dark:bg-dark-secondary rounded-2xl p-6 border border-light-border dark:border-dark-border">
              <h3 className="font-poppins font-semibold text-lg text-light-text-primary dark:text-dark-text-primary mb-4">
                AI Interviewer
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
                    Your AI interviewer is ready to begin
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

            {/* Interview Controls */}
            <div className="bg-light-secondary dark:bg-dark-secondary rounded-2xl p-6 border border-light-border dark:border-dark-border">
              <h3 className="font-poppins font-semibold text-lg text-light-text-primary dark:text-dark-text-primary mb-4">
                Interview Controls
              </h3>
              <div className="space-y-3">
                <button 
                  onClick={triggerDownload}
                  className="w-full flex items-center justify-center px-4 py-3 border border-light-border dark:border-dark-border text-light-text-primary dark:text-dark-text-primary rounded-lg hover:bg-light-primary dark:hover:bg-dark-primary transition-colors"
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
                  <span className="text-light-text-secondary dark:text-dark-text-secondary">Camera:</span>
                  <span className={`font-medium ${isVideoOn ? 'text-green-500' : 'text-red-500'}`}>
                    {isVideoOn ? 'On' : 'Off'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-light-text-secondary dark:text-dark-text-secondary">Microphone:</span>
                  <span className={`font-medium ${!isMuted ? 'text-green-500' : 'text-red-500'}`}>
                    {!isMuted ? 'On' : 'Muted'}
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