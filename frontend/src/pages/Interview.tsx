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

  // Browser recording states
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);

  // Session tracking refs
  const sessionStartTimeRef = useRef<number>(Date.now());
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
      if (!isEnding) {
        setSessionDuration(Math.floor((Date.now() - sessionStartTimeRef.current) / 1000));
      }
    }, 1000);

    // Cleanup function
    return () => {
      clearInterval(timer);
    };
  }, [navigate, isEnding]);

  // Browser-based recording as fallback (since no S3 bucket)
  useEffect(() => {
    const startBrowserRecording = async () => {
      try {
        console.log('🎬 Starting browser-based screen recording...');
        
        // Request screen capture with audio
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { 
            mediaSource: 'screen',
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100
          }
        });
        
        // Create MediaRecorder with WebM format
        const recorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp9,opus'
        });
        
        const chunks: Blob[] = [];
        
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
            console.log('📊 Recording chunk received:', event.data.size, 'bytes');
          }
        };
        
        recorder.onstop = () => {
          console.log('🛑 Browser recording stopped, processing...');
          const blob = new Blob(chunks, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          
          console.log('✅ Recording blob created:', blob.size, 'bytes');
          
          // Store recording
          localStorage.setItem(`recording_${conversationId}`, url);
          localStorage.setItem(`recording_${conversationId}_metadata`, JSON.stringify({
            format: 'webm',
            source: 'browser_screen_capture',
            url: url,
            timestamp: new Date().toISOString(),
            size: blob.size,
            duration: sessionDuration
          }));
          
          setRecordingUrl(url);
          setRecordedChunks(chunks);
          console.log('💾 Browser recording saved to localStorage');
        };
        
        recorder.onerror = (event) => {
          console.error('❌ Recording error:', event);
        };
        
        // Start recording with data collection every second
        recorder.start(1000);
        setMediaRecorder(recorder);
        
        console.log('✅ Browser recording started successfully');
        
        // Handle stream end (user stops sharing)
        stream.getVideoTracks()[0].addEventListener('ended', () => {
          console.log('📺 Screen sharing ended by user');
          if (recorder.state === 'recording') {
            recorder.stop();
          }
        });
        
      } catch (error) {
        console.warn('⚠️ Browser recording not available:', error);
        // Continue without browser recording - Tavus will handle recording
      }
    };
    
    if (conversationId && !mediaRecorder && isRecording) {
      startBrowserRecording();
    }
  }, [conversationId, isRecording, sessionDuration]);

  // CRITICAL: Enhanced session cleanup with REAL transcript and recording capture
  const handleEndSession = async () => {
    if (isEnding) return; // Prevent multiple calls
    
    console.log('🛑 CRITICAL: Ending interview session...');
    setIsEnding(true);
    
    try {
      // Step 1: Stop browser recording first
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        console.log('🛑 Stopping browser recording...');
        mediaRecorder.stop();
        
        // Wait a moment for the recording to process
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Step 2: Capture REAL conversation data from Tavus API
      console.log('📊 Capturing REAL conversation data from Tavus...');
      let realTranscript: any[] = [];
      let conversationData: any = {};
      let tavusRecordingUrl: string | null = null;
      
      if (conversationId) {
        try {
          console.log('🔍 Fetching REAL conversation data from Tavus API...');
          const response = await fetch(`http://localhost:3001/api/interview/get-conversation/${conversationId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (response.ok) {
            conversationData = await response.json();
            console.log('✅ Retrieved REAL conversation data:', conversationData);
            
            // Extract REAL transcript from conversation data
            if (conversationData.transcriptEvents && conversationData.transcriptEvents.length > 0) {
              realTranscript = conversationData.transcriptEvents;
              console.log('📝 Extracted REAL transcript events:', realTranscript.length);
            } else if (conversationData.transcript) {
              // Convert string transcript to events
              const transcriptText = conversationData.transcript;
              realTranscript = transcriptText.split('\n').map((line: string, index: number) => {
                const trimmedLine = line.trim();
                if (trimmedLine.length === 0) return null;
                
                return {
                  timestamp: new Date().toISOString(),
                  type: 'conversation',
                  content: trimmedLine,
                  participant: trimmedLine.toLowerCase().includes('sarah') || 
                              trimmedLine.toLowerCase().includes('interviewer') ? 'ai' : 'user',
                  sessionId: conversationId,
                  index
                };
              }).filter(item => item !== null);
              
              console.log('📝 Converted transcript to events:', realTranscript.length);
            }
            
            // Get Tavus recording URL if available
            if (conversationData.recording_url) {
              tavusRecordingUrl = conversationData.recording_url;
              console.log('🎬 Tavus recording URL available:', tavusRecordingUrl);
            }
          }
        } catch (apiError) {
          console.warn('⚠️ Could not retrieve conversation data from API:', apiError);
        }
      }
      
      // Step 3: Store final session data with REAL transcript and recording
      const finalSessionData = {
        conversationId,
        transcript: realTranscript,
        duration: sessionDuration,
        endTime: new Date().toISOString(),
        userName,
        jobTitle: localStorage.getItem('jobTitle'),
        company: localStorage.getItem('company'),
        conversationData: conversationData,
        recordingUrl: tavusRecordingUrl || recordingUrl, // Prefer Tavus, fallback to browser
        browserRecordingUrl: recordingUrl,
        tavusRecordingUrl: tavusRecordingUrl
      };
      
      localStorage.setItem(`session_${conversationId}`, JSON.stringify(finalSessionData));
      localStorage.setItem(`transcript_${conversationId}`, JSON.stringify(realTranscript));
      
      // Store recording URLs if available
      if (tavusRecordingUrl) {
        localStorage.setItem(`recording_${conversationId}`, tavusRecordingUrl);
        localStorage.setItem(`recording_${conversationId}_metadata`, JSON.stringify({
          format: 'mp4',
          source: 'tavus_cloud',
          url: tavusRecordingUrl,
          timestamp: new Date().toISOString()
        }));
      } else if (recordingUrl) {
        // Keep browser recording as fallback
        console.log('📹 Using browser recording as fallback');
      }
      
      console.log('💾 Final session data stored with REAL transcript and recording');
      
      // Step 4: Download REAL transcript immediately
      if (realTranscript.length > 0) {
        downloadRealTranscript(realTranscript);
      } else {
        console.warn('⚠️ No real transcript available for download');
      }
      
      // Step 5: End conversation on backend to stop Tavus session
      if (conversationId) {
        try {
          console.log('🛑 Ending conversation on backend...');
          const response = await fetch('http://localhost:3001/api/interview/end-conversation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              conversationId,
              dynamicPersonaId
            }),
          });
          
          if (response.ok) {
            const endData = await response.json();
            console.log('✅ Conversation ended successfully on backend');
            
            // If backend returned additional conversation data, use it
            if (endData.conversationData && endData.conversationData.transcript) {
              console.log('📝 Backend returned additional transcript data');
            }
          } else {
            console.warn('⚠️ Failed to end conversation on backend');
          }
        } catch (endError) {
          console.warn('⚠️ Error ending conversation on backend:', endError);
        }
      }
      
      // Step 6: Store session completion data
      localStorage.setItem('sessionCompleted', 'true');
      localStorage.setItem('sessionEndTime', new Date().toISOString());
      localStorage.setItem('sessionDuration', sessionDuration.toString());
      
      // Step 7: Navigate to feedback page
      console.log('✅ Navigating to feedback page...');
      navigate('/feedback/1');
      
    } catch (error) {
      console.error('❌ Error during session cleanup:', error);
      setError('Error ending session. Please try again.');
      setIsEnding(false);
    }
  };

  // Download REAL conversation transcript with proper formatting
  const downloadRealTranscript = (transcript: any[]) => {
    try {
      if (transcript.length === 0) {
        console.warn('⚠️ No real transcript data to download');
        return;
      }
      
      // Format transcript for download with proper speaker identification
      const formattedTranscript = transcript.map(event => {
        const speaker = event.participant === 'ai' ? 'Interviewer (Sarah)' : `Candidate (${userName})`;
        const timestamp = new Date(event.timestamp).toLocaleTimeString();
        return `[${timestamp}] ${speaker}: ${event.content}`;
      }).join('\n\n');
      
      // Add header information
      const header = `INTERVIEW TRANSCRIPT
===================
Candidate: ${userName}
Job Title: ${localStorage.getItem('jobTitle') || 'Not specified'}
Company: ${localStorage.getItem('company') || 'Not specified'}
Date: ${new Date().toLocaleDateString()}
Duration: ${Math.floor(sessionDuration / 60)}:${(sessionDuration % 60).toString().padStart(2, '0')}
Conversation ID: ${conversationId}

TRANSCRIPT:
===========

`;
      
      const fullTranscript = header + formattedTranscript;
      
      const transcriptBlob = new Blob([fullTranscript], { type: 'text/plain' });
      const url = URL.createObjectURL(transcriptBlob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `interview-transcript-${userName}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
      
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      console.log('📄 REAL transcript downloaded successfully');
    } catch (error) {
      console.error('❌ Error downloading real transcript:', error);
    }
  };

  // Handle unexpected tab close
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Stop recording if active
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }
      
      // Use sendBeacon for reliable cleanup on tab close
      if (conversationId && !isEnding) {
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
  }, [conversationId, dynamicPersonaId, isEnding, mediaRecorder]);

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
                Live Interview Session - Tavus + Browser Recording
              </span>
              {isRecording && !isEnding && (
                <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                  Recording • {formatDuration(sessionDuration)} • Dual Recording Active
                </span>
              )}
            </div>
            <button
              onClick={handleEndSession}
              disabled={isEnding}
              className="inline-flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Square className="h-4 w-4 mr-2" />
              {isEnding ? 'Ending Session...' : 'End Session & Download'}
            </button>
          </div>
        </div>
      </div>
      
      <div className="max-w-6xl mx-auto p-8">
        {/* Single Interview Area - ONLY Tavus iframe */}
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
                  {mediaRecorder && mediaRecorder.state === 'recording' && (
                    <div className="inline-flex items-center space-x-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full text-sm">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <span>Browser Backup Recording</span>
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
              <span className={`font-medium ${isEnding ? 'text-orange-500' : 'text-green-500'}`}>
                {isEnding ? 'Ending Session...' : isRecording ? 'Live Interview' : 'Ready'}
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
                Tavus + Browser
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
                Real-time Capture
              </span>
            </div>
            {dynamicPersonaId && (
              <div className="flex justify-between">
                <span className="text-light-text-secondary dark:text-dark-text-secondary">AI Persona:</span>
                <span className="text-purple-500 font-medium text-xs">
                  Dynamic
                </span>
              </div>
            )}
            {mediaRecorder && (
              <div className="flex justify-between">
                <span className="text-light-text-secondary dark:text-dark-text-secondary">Browser Rec:</span>
                <span className={`font-medium text-xs ${mediaRecorder.state === 'recording' ? 'text-green-500' : 'text-gray-500'}`}>
                  {mediaRecorder.state}
                </span>
              </div>
            )}
          </div>
          
          {/* Additional Info */}
          <div className="mt-4 p-4 bg-light-primary dark:bg-dark-primary rounded-lg border border-light-border dark:border-dark-border">
            <h4 className="font-medium text-light-text-primary dark:text-dark-text-primary mb-2">
              Recording & Transcript Information
            </h4>
            <ul className="text-xs text-light-text-secondary dark:text-dark-text-secondary space-y-1">
              <li>• Primary recording handled by Tavus cloud infrastructure</li>
              <li>• Browser screen recording as backup (WebM format)</li>
              <li>• Real-time transcript captured during conversation</li>
              <li>• Both recording and transcript available for download when session ends</li>
              <li>• Analysis based on actual conversation content</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Interview;