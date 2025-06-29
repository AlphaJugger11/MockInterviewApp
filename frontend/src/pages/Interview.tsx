import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Square, AlertCircle } from 'lucide-react';
import FullSessionRecorder from '../components/FullSessionRecorder';

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
  const [capturedTranscript, setCapturedTranscript] = useState<any[]>([]);
  const [recordingData, setRecordingData] = useState<any>(null);

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
      if (!isEnding) {
        setSessionDuration(Math.floor((Date.now() - sessionStartTimeRef.current) / 1000));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate, isEnding]);

  // Enhanced transcript capture with webhook data
  useEffect(() => {
    const captureTranscript = async () => {
      if (!conversationId || isEnding) return;

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
            console.log('📝 Live transcript updated from webhook:', data.transcriptEvents.length, 'events');
            
            // Check if this is webhook data
            if (data.hasWebhookData) {
              console.log('✅ Using REAL webhook transcript data');
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ Error capturing live transcript:', error);
      }
    };

    // Start transcript capture interval every 5 seconds
    if (conversationId && !transcriptIntervalRef.current && !isEnding) {
      // Initial capture
      captureTranscript();
      
      // Set up interval
      transcriptIntervalRef.current = setInterval(captureTranscript, 5000); // Every 5 seconds
      console.log('📝 Started live transcript capture every 5 seconds');
    }

    return () => {
      if (transcriptIntervalRef.current) {
        clearInterval(transcriptIntervalRef.current);
        transcriptIntervalRef.current = null;
      }
    };
  }, [conversationId, isEnding]);

  // Handle recording completion
  const handleRecordingComplete = (data: any) => {
    setRecordingData(data);
    console.log('✅ Recording completed:', data);
  };

  // Handle transcript updates
  const handleTranscriptUpdate = (transcript: any[]) => {
    setCapturedTranscript(transcript);
    console.log('📝 Transcript updated:', transcript.length, 'events');
  };

  // Enhanced session cleanup with user data
  const handleEndSession = async () => {
    if (isEnding || endingInProgressRef.current) return;
    
    console.log('🛑 Ending interview session with enhanced cleanup...');
    setIsEnding(true);
    endingInProgressRef.current = true;
    
    try {
      // Get user data for persistent storage
      const userId = localStorage.getItem('userId');
      const jobTitle = localStorage.getItem('jobTitle');
      const company = localStorage.getItem('company');
      
      // Store final session data
      const finalSessionData = {
        conversationId,
        transcript: capturedTranscript,
        duration: sessionDuration,
        endTime: new Date().toISOString(),
        userName,
        jobTitle,
        company,
        recordingData: recordingData,
        transcriptLength: capturedTranscript.length,
        userId: userId
      };
      
      localStorage.setItem(`session_${conversationId}`, JSON.stringify(finalSessionData));
      localStorage.setItem(`transcript_${conversationId}`, JSON.stringify(capturedTranscript));
      localStorage.setItem('sessionCompleted', 'true');
      localStorage.setItem('sessionEndTime', new Date().toISOString());
      localStorage.setItem('sessionDuration', sessionDuration.toString());
      
      console.log('💾 Final session data stored');

      // End conversation on backend with user data for persistent storage
      if (conversationId) {
        try {
          console.log('🛑 Ending conversation on backend with user data...');
          const response = await fetch('http://localhost:3001/api/interview/end-conversation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              conversationId,
              dynamicPersonaId,
              userId: userId,
              userName: userName,
              jobTitle: jobTitle,
              company: company
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('✅ Conversation ended successfully on backend');
            
            // Store user transcript URL if available
            if (data.conversationData?.userTranscriptUrl) {
              localStorage.setItem(`user_transcript_${conversationId}`, data.conversationData.userTranscriptUrl);
              console.log('💾 User transcript URL stored for persistent access');
            }
          }
        } catch (endError) {
          console.warn('⚠️ Error ending conversation on backend:', endError);
        }
      }
      
      // Navigate to feedback page
      setTimeout(() => {
        console.log('✅ Navigating to feedback page...');
        navigate('/feedback/1');
      }, 2000);
      
    } catch (error) {
      console.error('❌ Error during session cleanup:', error);
      setError('Error ending session. Please try again.');
      setIsEnding(false);
      endingInProgressRef.current = false;
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
                Live Interview Session - Webhook Transcription Active
              </span>
              {isRecording && !isEnding && (
                <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                  Duration: {formatDuration(sessionDuration)} • Transcript: {capturedTranscript.length} events
                </span>
              )}
            </div>
            <button
              onClick={handleEndSession}
              disabled={isEnding}
              className="inline-flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Square className="h-4 w-4 mr-2" />
              {isEnding ? 'Ending & Saving...' : 'End Session & Save'}
            </button>
          </div>
        </div>
      </div>
      
      <div className="max-w-6xl mx-auto p-8">
        {/* Interview Area */}
        <div className="bg-light-secondary dark:bg-dark-secondary rounded-2xl p-6 border border-light-border dark:border-dark-border mb-6">
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
                    <span>Tavus Cloud Interview</span>
                  </div>
                  <div className="inline-flex items-center space-x-2 bg-purple-500/10 text-purple-600 dark:text-purple-400 px-3 py-1 rounded-full text-sm">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                    <span>Webhook Transcription</span>
                  </div>
                  <div className="inline-flex items-center space-x-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full text-sm">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span>Client-Side Recording</span>
                  </div>
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

        {/* Client-Side Recording System */}
        {conversationId && (
          <FullSessionRecorder
            conversationId={conversationId}
            userName={userName}
            onRecordingComplete={handleRecordingComplete}
            onTranscriptUpdate={handleTranscriptUpdate}
          />
        )}

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
              <span className="text-light-text-secondary dark:text-dark-text-secondary">Transcription:</span>
              <span className="text-purple-500 font-medium">
                Webhook Active
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
              <span className="text-light-text-secondary dark:text-dark-text-secondary">Transcript Events:</span>
              <span className="text-purple-500 font-medium">
                {capturedTranscript.length}
              </span>
            </div>
          </div>

          {/* Webhook Transcription Info */}
          <div className="mt-4 p-4 bg-light-primary dark:bg-dark-primary rounded-lg border border-light-border dark:border-dark-border">
            <h4 className="font-medium text-light-text-primary dark:text-dark-text-primary mb-2">
              Enhanced Transcription System
            </h4>
            <ul className="text-xs text-light-text-secondary dark:text-dark-text-secondary space-y-1">
              <li>• Webhook transcription captures REAL conversation data from Tavus</li>
              <li>• Transcript events captured in real-time every 5 seconds</li>
              <li>• Client-side recording provides backup video with enhanced audio</li>
              <li>• Automatic upload to Supabase Storage for cloud backup</li>
              <li>• Persistent user transcript storage for long-term access</li>
              <li>• AI analysis uses REAL conversation data for accurate feedback</li>
              <li>• Session cleanup preserves user data while removing temporary files</li>
              <li>• Enhanced audio capture ensures both AI voice and user voice are recorded</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Interview;