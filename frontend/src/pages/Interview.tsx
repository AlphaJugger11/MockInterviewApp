// project/src/pages/Interview.tsx

import React, { useState, useEffect, useRef } from 'react'; // --- MODIFIED: Added useEffect and useRef ---
import { useNavigate } from 'react-router-dom'; // Keep this
import { SkipForward, Square, Mic, MicOff, Video, VideoOff } from 'lucide-react'; // Keep this
// --- NOTE: We are removing Layout since this page is full-screen ---

const Interview = () => {
  const navigate = useNavigate(); // Keep this
  const [currentQuestion, setCurrentQuestion] = useState(0); // Keep this
  const [isMuted, setIsMuted] = useState(false); // Keep this
  const [isVideoOn, setIsVideoOn] = useState(true); // Keep this

  // --- NEW: Add state for the AI Interviewer's video URL and question text ---
  const [aiVideoUrl, setAiVideoUrl] = useState<string | null>(null);
  const [aiQuestion, setAiQuestion] = useState('Your interviewer is preparing the first question...');
  
  // --- NEW: Create a ref to access the video element directly ---
  const aiVideoRef = useRef<HTMLVideoElement>(null);
  const userVideoRef = useRef<HTMLVideoElement>(null);

  // --- NEW: This effect runs once when the page loads ---
  useEffect(() => {
    // 1. Get the video URL saved by the Setup page
    const url = localStorage.getItem('aiVideoUrl');
    if (url) {
      setAiVideoUrl(url);
    } else {
      // Handle case where user lands here directly
      console.error("No AI video URL found. Navigating back to setup.");
      navigate('/setup');
    }

    // 2. Get access to the user's webcam
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        if (userVideoRef.current) {
          userVideoRef.current.srcObject = stream;
        }
      })
      .catch(err => {
        console.error("Failed to get user media:", err);
        // You could show an error message to the user here
      });
  }, [navigate]); // navigate is a stable function, so this still runs only once

  // --- MODIFIED: The old hardcoded questions array is no longer needed ---
  // const questions = [ ... ]; // This can be deleted

  const handleEndSession = () => { /* ... Keep this function as is ... */ };

  return (
    <div className="min-h-screen bg-light-primary dark:bg-dark-primary">
      {/* ... Keep the Header as is ... */}
      
      <div className="max-w-6xl mx-auto p-8">
        <div className="grid lg:grid-cols-3 gap-8 h-full">
          {/* Main Video Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* --- MODIFIED: User Video now uses a ref to get the live stream --- */}
            <div className="relative bg-black rounded-2xl overflow-hidden aspect-video">
              <video ref={userVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              {/* ... Keep the video controls section as is ... */}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* --- MODIFIED: AI Avatar now contains the real video element --- */}
            <div className="bg-light-secondary dark:bg-dark-secondary rounded-2xl p-6 border border-light-border dark:border-dark-border">
              <h3 className="font-poppins font-semibold text-lg text-light-text-primary dark:text-dark-text-primary mb-4">
                AI Interviewer
              </h3>
              <div className="bg-black rounded-full mx-auto mb-4 w-24 h-24 overflow-hidden">
                {aiVideoUrl ? (
                  <video
                    ref={aiVideoRef}
                    src={aiVideoUrl}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                    onLoadedData={() => setAiQuestion('Tell me about a time you faced a difficult challenge at work.')} // Mock question display
                    onEnded={() => console.log('AI finished speaking')}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-light-accent to-blue-600 dark:from-dark-accent dark:to-green-400 flex items-center justify-center">
                    <div className="w-12 h-12 bg-white/20 rounded-full animate-pulse"></div>
                  </div>
                )}
              </div>
              <p className="text-center text-sm text-light-text-secondary dark:text-dark-text-secondary">
                {aiVideoUrl ? 'Sarah is speaking...' : 'Sarah is connecting...'}
              </p>
            </div>

            {/* --- MODIFIED: Current Question now uses state --- */}
            <div className="bg-light-secondary dark:bg-dark-secondary rounded-2xl p-6 border border-light-border dark:border-dark-border">
              <h3 className="font-poppins font-semibold text-lg text-light-text-primary dark:text-dark-text-primary mb-4">
                Current Question
              </h3>
              <p className="font-inter text-light-text-primary dark:text-dark-text-primary leading-relaxed">
                {aiQuestion}
              </p>
            </div>
            {/* ... Keep the Interview Controls and Session Info sections as they are ... */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Interview;