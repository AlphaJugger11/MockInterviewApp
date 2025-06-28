import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Square, Mic, MicOff, Video, VideoOff, Download, AlertCircle } from 'lucide-react';
// @ts-ignore
import muxjs from 'mux.js';

const Interview = () => {
  const navigate = useNavigate();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [conversationUrl, setConversationUrl] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [userName, setUserName] = useState<string>('');

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
          video: true, 
          audio: true 
        });
        
        streamRef.current = stream;
        
        if (userVideoRef.current) {
          userVideoRef.current.srcObject = stream;
        }

        // Initialize MediaRecorder for WebM format
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp9,opus'
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

  // Enhanced function to convert WebM to MP4 and trigger download
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

      // Create WebM blob
      const webmBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      
      // Convert WebM to MP4 using mux.js
      const reader = new FileReader();
      reader.onload = function() {
        try {
          const arrayBuffer = reader.result as ArrayBuffer;
          const uint8Array = new Uint8Array(arrayBuffer);
          
          // Use mux.js to remux WebM to MP4
          const transmuxer = new muxjs.mp4.Transmuxer();
          const mp4Segments: Uint8Array[] = [];
          
          transmuxer.on('data', (segment: any) => {
            mp4Segments.push(new Uint8Array(segment.initSegment));
            mp4Segments.push(new Uint8Array(segment.data));
          });
          
          transmuxer.on('done', () => {
            // Combine all segments into a single MP4 blob
            const mp4Blob = new Blob(mp4Segments, { type: 'video/mp4' });
            
            // Create download link for MP4
            const url = URL.createObjectURL(mp4Blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `interview-recording-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.mp4`;
            
            document.body.appendChild(a);
            a.click();
            
            // Cleanup
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log('MP4 download triggered successfully');
          });
          
          // Push WebM data to transmuxer
          transmuxer.push(uint8Array);
          transmuxer.flush();
          
        } catch (conversionError) {
          console.error('Error converting to MP4, falling back to WebM:', conversionError);
          
          // Fallback: download as WebM if conversion fails
          const url = URL.createObjectURL(webmBlob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = `interview-recording-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
          
          document.body.appendChild(a);
          a.click();
          
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          console.log('WebM download triggered as fallback');
        }
      };
      
      reader.readAsArrayBuffer(webmBlob);
      
    } catch (error) {
      console.error('Error triggering download:', error);
      setError('Failed to download recording. Please try again.');
    }
  };

  // Enhanced session cleanup with proper order
  const handleEndSession = async () => {
    console.log('🛑 Ending interview session...');
    setIsRecording(false);
    
    try {
      // Step 1: Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      
      // Step 2: Trigger download
      triggerDownload();
      
      // Step 3: Stop all media tracks (turn off camera light)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log(`Stopped ${track.kind} track`);
        });
      }
      
      // Step 4: End conversation on backend to stop credit usage
      if (conversationId) {
        try {
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
        }
      }
      
      // Step 5: Clean up localStorage and navigate
      localStorage.removeItem('conversationUrl');
      localStorage.removeItem('conversationId');
      localStorage.removeItem('userName');
      
      // Navigate to feedback page after a short delay
      setTimeout(() => {
        navigate('/feedback/1');
      }, 1000);
      
    } catch (error) {
      console.error('Error during session cleanup:', error);
      setError('Error ending session. Please try again.');
    }
  };

  // Handle unexpected tab close with beacon
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Use sendBeacon for reliable cleanup on tab close
      if (conversationId) {
        navigator.sendBeacon(
          'http://localhost:3001/api/interview/end-conversation',
          JSON.stringify({ conversationId })
        );
      }
      
      // Trigger download before leaving
      triggerDownload();
      
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [conversationId]);

  const toggleMute = () => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
      console.log(`Audio ${isMuted ? 'enabled' : 'disabled'}`);
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTracks = streamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !isVideoOn;
      });
      setIsVideoOn(!isVideoOn);
      console.log(`Video ${isVideoOn ? 'disabled' : 'enabled'}`);
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
          {/* Main AI Interviewer Area - Large area (2/3 of screen) */}
          <div className="lg:col-span-2 space-y-6">
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
                    Your AI interviewer Sarah is ready to begin with {userName}
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
                
                {!isVideoOn && (
                  <div className="absolute inset-0 bg-black flex items-center justify-center">
                    <div className="text-center">
                      <VideoOff className="h-8 w-8 text-white/50 mx-auto mb-2" />
                      <p className="text-white/70 text-sm">Camera is off</p>
                    </div>
                  </div>
                )}
                
                {/* Video Controls */}
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
                  <div className="flex items-center space-x-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-2">
                    <button
                      onClick={toggleMute}
                      className={`p-2 rounded-full transition-colors ${
                        isMuted 
                          ? 'bg-red-500 hover:bg-red-600' 
                          : 'bg-white/20 hover:bg-white/30'
                      }`}
                    >
                      {isMuted ? (
                        <MicOff className="h-3 w-3 text-white" />
                      ) : (
                        <Mic className="h-3 w-3 text-white" />
                      )}
                    </button>
                    
                    <button
                      onClick={toggleVideo}
                      className={`p-2 rounded-full transition-colors ${
                        !isVideoOn 
                          ? 'bg-red-500 hover:bg-red-600' 
                          : 'bg-white/20 hover:bg-white/30'
                      }`}
                    >
                      {!isVideoOn ? (
                        <VideoOff className="h-3 w-3 text-white" />
                      ) : (
                        <Video className="h-3 w-3 text-white" />
                      )}
                    </button>
                  </div>
                </div>
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