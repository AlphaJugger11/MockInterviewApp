import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SkipForward, Square, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import Layout from '../components/Layout';

const Interview = () => {
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isRecording, setIsRecording] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);

  const questions = [
    "Tell me about a time you faced a difficult challenge at work.",
    "Describe a situation where you had to work with a difficult team member.",
    "How do you prioritize tasks when everything seems urgent?",
    "Tell me about a project you're particularly proud of.",
    "How do you handle feedback and criticism?"
  ];

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      handleEndSession();
    }
  };

  const handleEndSession = () => {
    navigate('/feedback/1');
  };

  return (
    <div className="min-h-screen bg-light-primary dark:bg-dark-primary">
      {/* Header */}
      <div className="bg-light-secondary dark:bg-dark-secondary border-b border-light-border dark:border-dark-border p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="font-medium text-light-text-primary dark:text-dark-text-primary">
              Interview in Progress
            </span>
          </div>
          <div className="text-light-text-secondary dark:text-dark-text-secondary">
            Question {currentQuestion + 1} of {questions.length}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-8">
        <div className="grid lg:grid-cols-3 gap-8 h-full">
          {/* Main Video Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* User Video */}
            <div className="relative bg-black rounded-2xl overflow-hidden aspect-video">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Video className="h-16 w-16 text-white/50 mx-auto mb-4" />
                  <p className="text-white/70 text-lg">User Video Feed</p>
                  <p className="text-white/50 text-sm mt-2">Camera is {isVideoOn ? 'on' : 'off'}</p>
                </div>
              </div>
              
              {/* Video Controls */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-4">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`p-3 rounded-full ${
                    isMuted ? 'bg-red-500' : 'bg-white/20'
                  } backdrop-blur-sm border border-white/30 hover:bg-white/30 transition-colors`}
                >
                  {isMuted ? (
                    <MicOff className="h-5 w-5 text-white" />
                  ) : (
                    <Mic className="h-5 w-5 text-white" />
                  )}
                </button>
                
                <button
                  onClick={() => setIsVideoOn(!isVideoOn)}
                  className={`p-3 rounded-full ${
                    !isVideoOn ? 'bg-red-500' : 'bg-white/20'
                  } backdrop-blur-sm border border-white/30 hover:bg-white/30 transition-colors`}
                >
                  {isVideoOn ? (
                    <Video className="h-5 w-5 text-white" />
                  ) : (
                    <VideoOff className="h-5 w-5 text-white" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* AI Avatar */}
            <div className="bg-light-secondary dark:bg-dark-secondary rounded-2xl p-6 border border-light-border dark:border-dark-border">
              <h3 className="font-poppins font-semibold text-lg text-light-text-primary dark:text-dark-text-primary mb-4">
                AI Interviewer
              </h3>
              <div className="w-24 h-24 bg-gradient-to-br from-light-accent to-blue-600 dark:from-dark-accent dark:to-green-400 rounded-full mx-auto mb-4 flex items-center justify-center">
                <div className="w-12 h-12 bg-white/20 rounded-full animate-pulse"></div>
              </div>
              <p className="text-center text-sm text-light-text-secondary dark:text-dark-text-secondary">
                Sarah is listening...
              </p>
            </div>

            {/* Current Question */}
            <div className="bg-light-secondary dark:bg-dark-secondary rounded-2xl p-6 border border-light-border dark:border-dark-border">
              <h3 className="font-poppins font-semibold text-lg text-light-text-primary dark:text-dark-text-primary mb-4">
                Current Question
              </h3>
              <p className="font-inter text-light-text-primary dark:text-dark-text-primary leading-relaxed">
                {questions[currentQuestion]}
              </p>
            </div>

            {/* Interview Controls */}
            <div className="space-y-3">
              <button
                onClick={handleNextQuestion}
                className="w-full inline-flex items-center justify-center px-6 py-3 bg-light-accent dark:bg-dark-accent text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
              >
                <SkipForward className="h-5 w-5 mr-2" />
                {currentQuestion < questions.length - 1 ? 'Next Question' : 'Finish Interview'}
              </button>

              <button
                onClick={handleEndSession}
                className="w-full inline-flex items-center justify-center px-6 py-3 border border-red-500 text-red-500 font-semibold rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <Square className="h-5 w-5 mr-2" />
                End Session
              </button>
            </div>

            {/* Session Info */}
            <div className="bg-light-secondary dark:bg-dark-secondary rounded-2xl p-4 border border-light-border dark:border-dark-border">
              <div className="text-center">
                <p className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">
                  12:34
                </p>
                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                  Session Duration
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Interview;