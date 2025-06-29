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
  const [isEnding, setIsEnding] = useState(false);

  // Enhanced recording states with improved codec support
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [localRecordingUrl, setLocalRecordingUrl] = useState<string | null>(null);
  const [capturedTranscript, setCapturedTranscript] = useState<any[]>([]);
  const [recordingActive, setRecordingActive] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [recordingValidated, setRecordingValidated] = useState(false);

  // Session tracking refs
  const sessionStartTimeRef = useRef<number>(Date.now());
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const endingInProgressRef = useRef<boolean>(false);
  const transcriptIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
      setIsRecording(true);
      sessionStartTimeRef.current = Date.now();
      console.log('✅ Interview session started:', { url, id, personaId, name });
    } else {
      console.error("❌ No conversation data found. Navigating back to setup.");
      setError("No interview session found. Please set up a new interview.");
      setTimeout(() => navigate('/setup'), 3000);
      return;
    }

    // Session duration timer
    const timer = setInterval(() => {
      if (!isEnding && !sessionEnded) {
        setSessionDuration(Math.floor((Date.now() - sessionStartTimeRef.current) / 1000));
      }
    }, 1000);

    // Cleanup function
    return () => {
      clearInterval(timer);
      if (transcriptIntervalRef.current) {
        clearInterval(transcriptIntervalRef.current);
      }
    };
  }, [navigate, isEnding, sessionEnded]);

  // FIXED: Enhanced local recording with proper codec support
  useEffect(() => {
    const startLocalRecording = async () => {
      if (!conversationId || recordingActive || isEnding || sessionEnded) {
        return;
      }

      try {
        console.log('🎬 Starting local screen recording with improved codec...');
        
        // Request screen capture with audio
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { 
            mediaSource: 'screen',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 }
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100
          }
        });
        
        console.log('✅ Screen capture permission granted');
        
        // CRITICAL FIX: Use VP8 codec for better compatibility
        let mimeType = 'video/webm;codecs=vp8,opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm;codecs=vp9,opus';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'video/webm';
          }
        }
        
        console.log('🎥 Using MIME type:', mimeType);
        
        // Create MediaRecorder with compatible codec
        const recorder = new MediaRecorder(stream, {
          mimeType: mimeType,
          videoBitsPerSecond: 1000000, // Reduced bitrate for stability
          audioBitsPerSecond: 64000    // Reduced audio bitrate
        });
        
        const chunks: Blob[] = [];
        
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            chunks.push(event.data);
            console.log('📊 Recording chunk received:', event.data.size, 'bytes');
          }
        };
        
        recorder.onstop = () => {
          console.log('🛑 Local recording stopped, creating download file...');
          const blob = new Blob(chunks, { type: mimeType });
          
          // CRITICAL: Validate blob before storing
          if (blob.size > 1000) { // Ensure minimum file size
            const url = URL.createObjectURL(blob);
            
            console.log('✅ Valid recording blob created:', blob.size, 'bytes');
            
            // Store for immediate download
            setLocalRecordingUrl(url);
            setRecordedChunks(chunks);
            setRecordingValidated(true);
            
            // Store in localStorage for later access
            localStorage.setItem(`local_recording_${conversationId}`, url);
            localStorage.setItem(`local_recording_${conversationId}_metadata`, JSON.stringify({
              format: 'webm',
              codec: mimeType,
              source: 'local_screen_capture',
              url: url,
              timestamp: new Date().toISOString(),
              size: blob.size,
              duration: sessionDuration,
              quality: 'high',
              validated: true
            }));
            
            console.log('💾 Valid recording saved and ready for download');
          } else {
            console.error('❌ Recording too small, likely corrupted:', blob.size, 'bytes');
            setRecordingValidated(false);
          }
        };
        
        recorder.onerror = (event) => {
          console.error('❌ Recording error:', event);
          setRecordingActive(false);
          setRecordingValidated(false);
        };
        
        // Start recording with smaller intervals for stability
        recorder.start(500); // Collect data every 500ms
        setMediaRecorder(recorder);
        setRecordingActive(true);
        
        console.log('✅ Local screen recording started successfully with codec:', mimeType);
        
        // Handle stream end
        stream.getVideoTracks()[0].addEventListener('ended', () => {
          console.log('📺 Screen sharing ended by user');
          if (recorder.state === 'recording') {
            recorder.stop();
          }
          setRecordingActive(false);
        });
        
      } catch (error) {
        console.warn('⚠️ Screen recording not available:', error);
        setRecordingActive(false);
        setRecordingValidated(false);
        
        if (error instanceof Error && error.name === 'NotAllowedError') {
          console.log('📺 User denied screen sharing permission - continuing with Tavus recording only');
        }
      }
    };
    
    // Start local recording after a short delay
    if (conversationId && isRecording && !recordingActive && !isEnding && !sessionEnded) {
      const timeout = setTimeout(() => {
        startLocalRecording();
      }, 3000); // 3 second delay to ensure page is loaded
      
      return () => clearTimeout(timeout);
    }
  }, [conversationId, isRecording, recordingActive, sessionDuration, isEnding, sessionEnded]);

  // FIXED: Enhanced transcript capture with real-time monitoring
  useEffect(() => {
    const captureTranscript = async () => {
      if (!conversationId || isEnding || sessionEnded) return;

      try {
        const response = await fetch(`http://localhost:3001/api/interview/get-conversation/${conversationId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.transcriptEvents && data.transcriptEvents.length > 0) {
            setCapturedTranscript(data.transcriptEvents);
            
            // Store transcript in localStorage immediately
            localStorage.setItem(`live_transcript_${conversationId}`, JSON.stringify(data.transcriptEvents));
            console.log('📝 Live transcript updated:', data.transcriptEvents.length, 'events');
          }
        }
      } catch (error) {
        console.warn('⚠️ Error capturing live transcript:', error);
      }
    };

    // CRITICAL: Start transcript capture interval every 3 seconds
    if (conversationId && !transcriptIntervalRef.current && !isEnding && !sessionEnded) {
      // Initial capture
      captureTranscript();
      
      // Set up interval
      transcriptIntervalRef.current = setInterval(captureTranscript, 3000); // Every 3 seconds
      console.log('📝 Started live transcript capture every 3 seconds');
    }

    return () => {
      if (transcriptIntervalRef.current) {
        clearInterval(transcriptIntervalRef.current);
        transcriptIntervalRef.current = null;
      }
    };
  }, [conversationId, isEnding, sessionEnded]);

  // Enhanced session cleanup with guaranteed downloads
  const handleEndSession = async () => {
    if (isEnding || endingInProgressRef.current || sessionEnded) return;
    
    console.log('🛑 CRITICAL: Ending interview session and preparing downloads...');
    setIsEnding(true);
    setSessionEnded(true);
    endingInProgressRef.current = true;
    
    try {
      // Step 1: Stop local recording and prepare for download
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        console.log('🛑 Stopping local recording...');
        mediaRecorder.stop();
        
        // Wait for recording to process
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // Step 2: Capture final transcript
      console.log('📝 Capturing final transcript...');
      let finalTranscript: any[] = [];
      
      if (conversationId) {
        try {
          const response = await fetch(`http://localhost:3001/api/interview/get-conversation/${conversationId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (response.ok) {
            const conversationData = await response.json();
            if (conversationData.transcriptEvents && conversationData.transcriptEvents.length > 0) {
              finalTranscript = conversationData.transcriptEvents;
              console.log('✅ Retrieved final transcript:', finalTranscript.length, 'events');
            }
          }
        } catch (apiError) {
          console.warn('⚠️ Could not retrieve final transcript from API:', apiError);
        }
      }

      // Use captured transcript as fallback
      if (finalTranscript.length === 0 && capturedTranscript.length > 0) {
        finalTranscript = capturedTranscript;
        console.log('📝 Using captured transcript as fallback:', finalTranscript.length, 'events');
      }

      // Step 3: Store final session data
      const finalSessionData = {
        conversationId,
        transcript: finalTranscript,
        duration: sessionDuration,
        endTime: new Date().toISOString(),
        userName,
        jobTitle: localStorage.getItem('jobTitle'),
        company: localStorage.getItem('company'),
        localRecordingUrl: localRecordingUrl,
        hasLocalRecording: recordingValidated,
        transcriptLength: finalTranscript.length,
        recordingValidated: recordingValidated
      };
      
      localStorage.setItem(`session_${conversationId}`, JSON.stringify(finalSessionData));
      localStorage.setItem(`transcript_${conversationId}`, JSON.stringify(finalTranscript));
      
      console.log('💾 Final session data stored');

      // Step 4: Force download transcript immediately if available
      if (finalTranscript.length > 0) {
        downloadTranscriptFile(finalTranscript);
      } else {
        console.warn('⚠️ No transcript available for download');
        alert('No transcript was captured during the session. Please check if the conversation was recorded properly.');
      }

      // Step 5: Force download recording if available and validated
      if (localRecordingUrl && recordingValidated) {
        downloadRecordingFile();
      } else {
        console.warn('⚠️ No valid local recording available for download');
        alert('No valid local recording was captured. Only Tavus cloud recording may be available.');
      }

      // Step 6: End conversation on backend (non-blocking)
      if (conversationId) {
        try {
          console.log('🛑 Ending conversation on backend...');
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          fetch('http://localhost:3001/api/interview/end-conversation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              conversationId,
              dynamicPersonaId
            }),
            signal: controller.signal
          }).then(response => {
            clearTimeout(timeoutId);
            if (response.ok) {
              console.log('✅ Conversation ended successfully on backend');
            }
          }).catch(error => {
            console.warn('⚠️ Error ending conversation on backend (non-blocking):', error);
          });
        } catch (endError) {
          console.warn('⚠️ Error ending conversation on backend (non-blocking):', endError);
        }
      }
      
      // Step 7: Store completion data and navigate
      localStorage.setItem('sessionCompleted', 'true');
      localStorage.setItem('sessionEndTime', new Date().toISOString());
      localStorage.setItem('sessionDuration', sessionDuration.toString());
      
      // Navigate after a short delay to ensure downloads start
      setTimeout(() => {
        console.log('✅ Navigating to feedback page...');
        navigate('/feedback/1');
      }, 2000);
      
    } catch (error) {
      console.error('❌ Error during session cleanup:', error);
      setError('Error ending session. Please try again.');
      setIsEnding(false);
      setSessionEnded(false);
      endingInProgressRef.current = false;
    }
  };

  // Force download transcript file
  const downloadTranscriptFile = (transcript: any[]) => {
    try {
      if (transcript.length === 0) {
        console.warn('⚠️ No transcript data to download');
        return;
      }
      
      // Format transcript for download
      const formattedTranscript = transcript.map(event => {
        const speaker = event.participant === 'ai' ? 'Interviewer (Sarah)' : `Candidate (${userName})`;
        const timestamp = new Date(event.timestamp).toLocaleTimeString();
        return `[${timestamp}] ${speaker}: ${event.content}`;
      }).join('\n\n');
      
      // Add header
      const header = `INTERVIEW TRANSCRIPT
===================
Candidate: ${userName}
Job Title: ${localStorage.getItem('jobTitle') || 'Not specified'}
Company: ${localStorage.getItem('company') || 'Not specified'}
Date: ${new Date().toLocaleDateString()}
Duration: ${Math.floor(sessionDuration / 60)}:${(sessionDuration % 60).toString().padStart(2, '0')}
Conversation ID: ${conversationId}
Events Count: ${transcript.length}

TRANSCRIPT:
===========

`;
      
      const fullTranscript = header + formattedTranscript;
      
      // Create and trigger download
      const blob = new Blob([fullTranscript], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `interview-transcript-${userName}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      
      console.log('📄 Transcript download triggered successfully');
    } catch (error) {
      console.error('❌ Error downloading transcript:', error);
    }
  };

  // Force download recording file
  const downloadRecordingFile = () => {
    try {
      if (!localRecordingUrl) {
        console.warn('⚠️ No local recording URL available');
        return;
      }
      
      // Create and trigger download
      const link = document.createElement('a');
      link.href = localRecordingUrl;
      link.download = `interview-recording-${userName}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('🎬 Recording download triggered successfully');
    } catch (error) {
      console.error('❌ Error downloading recording:', error);
    }
  };

  // Handle unexpected tab close
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Stop recording if active
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }
      
      // Cleanup intervals
      if (transcriptIntervalRef.current) {
        clearInterval(transcriptIntervalRef.current);
      }
      
      // Use sendBeacon for reliable cleanup
      if (conversationId && !isEnding && !sessionEnded) {
        const data = JSON.stringify({ 
          conversationId,
          dynamicPersonaId 
        });
        navigator.sendBeacon('http://localhost:3001/api/interview/end-conversation', data);
      }
      
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [conversationId, dynamicPersonaId, isEnding, mediaRecorder, sessionEnded]);

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
                Live Interview Session - Recording Active
              </span>
              {isRecording && !isEnding && !sessionEnded && (
                <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                  Recording • {formatDuration(sessionDuration)} • 
                  {recordingActive && recordingValidated ? ' Local + Cloud Recording' : 
                   recordingActive ? ' Local Recording (Processing)' : ' Cloud Recording Only'}
                </span>
              )}
            </div>
            <button
              onClick={handleEndSession}
              disabled={isEnding || sessionEnded}
              className="inline-flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Square className="h-4 w-4 mr-2" />
              {isEnding ? 'Ending & Downloading...' : 'End Session & Download'}
            </button>
          </div>
        </div>
      </div>
      
      <div className="max-w-6xl mx-auto p-8">
        {/* Interview Area */}
        <div className="bg-light-secondary dark:bg-dark-secondary rounded-2xl p-6 border border-light-border dark:border-dark-border">
          <h3 className="font-poppins font-semibold text-lg text-light-text-primary dark:text-dark-text-primary mb-4">
            AI Interview with Sarah - {userName}
          </h3>
          
          {conversationUrl ? (
            <div className="space-y-4">
              <div className="bg-black rounded-lg aspect-video">
                <iframe
                  ref={iframeRef}
                  src={conversationUrl}
                  className="w-full h-full rounded-lg"
                  allow="camera; microphone"
                  title="AI Interview with Sarah"
                />
              </div>
              <div className="text-center">
                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-2">
                  Your AI interviewer Sarah is conducting a personalized interview with {userName}
                </p>
                <div className="flex justify-center space-x-4">
                  <div className="inline-flex items-center space-x-2 bg-green-500/10 text-green-600 dark:text-green-400 px-3 py-1 rounded-full text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Tavus Cloud Recording</span>
                  </div>
                  {recordingActive && (
                    <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                      recordingValidated 
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' 
                        : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                    }`}>
                      <div className={`w-2 h-2 rounded-full animate-pulse ${
                        recordingValidated ? 'bg-blue-500' : 'bg-yellow-500'
                      }`}></div>
                      <span>{recordingValidated ? 'Local Recording Active' : 'Local Recording Processing'}</span>
                    </div>
                  )}
                  {capturedTranscript.length > 0 && (
                    <div className="inline-flex items-center space-x-2 bg-purple-500/10 text-purple-600 dark:text-purple-400 px-3 py-1 rounded-full text-sm">
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                      <span>Transcript: {capturedTranscript.length} events</span>
                    </div>
                  )}
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

        {/* Session Info */}
        <div className="mt-6 bg-light-secondary dark:bg-dark-secondary rounded-2xl p-6 border border-light-border dark:border-dark-border">
          <h3 className="font-poppins font-semibold text-lg text-light-text-primary dark:text-dark-text-primary mb-4">
            Session Information
          </h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-light-text-secondary dark:text-dark-text-secondary">Status:</span>
              <span className={`font-medium ${isEnding || sessionEnded ? 'text-orange-500' : 'text-green-500'}`}>
                {isEnding || sessionEnded ? 'Ending Session...' : isRecording ? 'Live Interview' : 'Ready'}
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
              <span className={`font-medium ${
                recordingActive && recordingValidated ? 'text-green-500' : 
                recordingActive ? 'text-yellow-500' : 'text-blue-500'
              }`}>
                {recordingActive && recordingValidated ? 'Local + Cloud' : 
                 recordingActive ? 'Processing' : 'Cloud Only'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-light-text-secondary dark:text-dark-text-secondary">Candidate:</span>
              <span className="text-blue-500 font-medium">
                {userName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-light-text-secondary dark:text-dark-text-secondary">Job Title:</span>
              <span className="text-blue-500 font-medium">
                {localStorage.getItem('jobTitle') || 'Not specified'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-light-text-secondary dark:text-dark-text-secondary">Transcript:</span>
              <span className="text-purple-500 font-medium">
                {capturedTranscript.length} events
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-light-text-secondary dark:text-dark-text-secondary">Local Recording:</span>
              <span className={`font-medium text-xs ${
                recordingValidated ? 'text-green-500' : 
                recordingActive ? 'text-yellow-500' : 'text-gray-500'
              }`}>
                {recordingValidated ? 'Validated' : recordingActive ? 'Processing' : 'Not Started'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-light-text-secondary dark:text-dark-text-secondary">Download Ready:</span>
              <span className={`font-medium text-xs ${
                recordingValidated && capturedTranscript.length > 0 ? 'text-green-500' : 'text-yellow-500'
              }`}>
                {recordingValidated && capturedTranscript.length > 0 ? 'Yes' : 'Processing...'}
              </span>
            </div>
          </div>
          
          {/* Download Info */}
          <div className="mt-4 p-4 bg-light-primary dark:bg-dark-primary rounded-lg border border-light-border dark:border-dark-border">
            <h4 className="font-medium text-light-text-primary dark:text-dark-text-primary mb-2">
              Recording & Download Information
            </h4>
            <ul className="text-xs text-light-text-secondary dark:text-dark-text-secondary space-y-1">
              <li>• Local screen recording uses VP8 codec for maximum compatibility</li>
              <li>• Real-time transcript captured every 3 seconds during conversation</li>
              <li>• Both files automatically download when you end the session</li>
              <li>• Files saved locally on your machine for privacy</li>
              <li>• Transcript format: .txt file with timestamps and speaker identification</li>
              <li>• Recording format: .webm file (compatible with most players)</li>
              {!recordingActive && !isEnding && !sessionEnded && (
                <li className="text-yellow-600 dark:text-yellow-400">• Local recording will start automatically after screen share</li>
              )}
              {recordingActive && !recordingValidated && (
                <li className="text-yellow-600 dark:text-yellow-400">• ⏳ Local recording is processing and validating...</li>
              )}
              {recordingValidated && (
                <li className="text-green-600 dark:text-green-400">• ✅ Local recording is active and validated</li>
              )}
              {capturedTranscript.length > 0 && (
                <li className="text-green-600 dark:text-green-400">• ✅ Transcript capture is working ({capturedTranscript.length} events)</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Interview;