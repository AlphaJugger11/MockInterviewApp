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

  // Session tracking refs
  const sessionStartTimeRef = useRef<number>(Date.now());
  const conversationTranscriptRef = useRef<any[]>([]);
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

  // CRITICAL: Enhanced session cleanup with IMMEDIATE disconnection
  const handleEndSession = async () => {
    if (isEnding) return; // Prevent multiple calls
    
    console.log('🛑 CRITICAL: Ending interview session...');
    setIsEnding(true);
    
    try {
      // Step 1: Capture conversation data from Tavus iframe
      console.log('📊 Capturing conversation data...');
      let realTranscript: any[] = [];
      let conversationData: any = {};
      
      // Try to get conversation data from Tavus API
      if (conversationId) {
        try {
          console.log('🔍 Fetching REAL conversation data from Tavus API...');
          const response = await fetch(`http://localhost:3001/api/interview/get-conversation/${conversationId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (response.ok) {
            conversationData = await response.json();
            console.log('✅ Retrieved real conversation data:', conversationData);
            
            // Extract transcript from conversation data
            if (conversationData.transcript) {
              realTranscript = conversationData.transcript.split('\n').map((line: string, index: number) => ({
                timestamp: new Date().toISOString(),
                type: 'conversation',
                content: line.trim(),
                participant: line.includes('Sarah') || line.includes('Interviewer') ? 'ai' : 'user',
                sessionId: conversationId,
                index
              })).filter((item: any) => item.content.length > 0);
              
              console.log('📝 Extracted real transcript:', realTranscript.length, 'events');
            }
          }
        } catch (apiError) {
          console.warn('⚠️ Could not retrieve conversation data from API:', apiError);
        }
      }
      
      // Step 2: Store final session data with REAL transcript
      const finalSessionData = {
        conversationId,
        transcript: realTranscript,
        duration: sessionDuration,
        endTime: new Date().toISOString(),
        userName,
        jobTitle: localStorage.getItem('jobTitle'),
        company: localStorage.getItem('company'),
        conversationData: conversationData
      };
      
      localStorage.setItem(`session_${conversationId}`, JSON.stringify(finalSessionData));
      localStorage.setItem(`transcript_${conversationId}`, JSON.stringify(realTranscript));
      console.log('💾 Final session data stored with real transcript');
      
      // Step 3: Download REAL transcript immediately
      downloadRealTranscript(realTranscript);
      
      // Step 4: End conversation on backend to stop Tavus session
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
            console.log('✅ Conversation ended successfully on backend');
          } else {
            console.warn('⚠️ Failed to end conversation on backend');
          }
        } catch (endError) {
          console.warn('⚠️ Error ending conversation on backend:', endError);
        }
      }
      
      // Step 5: Store session completion data
      localStorage.setItem('sessionCompleted', 'true');
      localStorage.setItem('sessionEndTime', new Date().toISOString());
      localStorage.setItem('sessionDuration', sessionDuration.toString());
      
      // Step 6: Navigate to feedback page
      console.log('✅ Navigating to feedback page...');
      navigate('/feedback/1');
      
    } catch (error) {
      console.error('❌ Error during session cleanup:', error);
      setError('Error ending session. Please try again.');
      setIsEnding(false);
    }
  };

  // Download REAL conversation transcript
  const downloadRealTranscript = (transcript: any[]) => {
    try {
      if (transcript.length === 0) {
        console.warn('⚠️ No real transcript data to download');
        return;
      }
      
      // Format transcript for download
      const formattedTranscript = transcript.map(event => {
        const speaker = event.participant === 'ai' ? 'Interviewer (Sarah)' : `Candidate (${userName})`;
        return `[${event.timestamp}] ${speaker}: ${event.content}`;
      }).join('\n\n');
      
      const transcriptBlob = new Blob([formattedTranscript], { type: 'text/plain' });
      const url = URL.createObjectURL(transcriptBlob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `interview-transcript-${conversationId}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
      
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      console.log('📄 Real transcript downloaded successfully');
    } catch (error) {
      console.error('❌ Error downloading real transcript:', error);
    }
  };

  // Handle unexpected tab close
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
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
  }, [conversationId, dynamicPersonaId, isEnding]);

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
                Live Interview Session - Tavus Recording
              </span>
              {isRecording && !isEnding && (
                <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                  Recording • {formatDuration(sessionDuration)} • Cloud Recording Active
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
                <div className="inline-flex items-center space-x-2 bg-green-500/10 text-green-600 dark:text-green-400 px-3 py-1 rounded-full text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Tavus Cloud Recording Active</span>
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
                Tavus Cloud
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
            {dynamicPersonaId && (
              <div className="flex justify-between">
                <span className="text-light-text-secondary dark:text-dark-text-secondary">AI Persona:</span>
                <span className="text-purple-500 font-medium text-xs">
                  Dynamic
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Interview;