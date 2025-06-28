import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Share2, Play, TrendingUp, Eye, Mic, MessageSquare, Download } from 'lucide-react';
import Layout from '../components/Layout';

interface AnalysisData {
  overallScore: number;
  pace: number;
  fillerWords: number;
  clarity: number;
  eyeContact: number;
  posture: number;
  answerAnalysis: Array<{
    question: string;
    answer: string;
    feedback: string;
    score: number;
    strengths: string[];
    areasForImprovement: string[];
  }>;
  summary: string;
  recommendations: string[];
  realMetrics?: any;
  dataSource?: string;
}

const Feedback = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('summary');
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [recordingMetadata, setRecordingMetadata] = useState<any>(null);

  // Get session data from localStorage
  const sessionData = {
    role: localStorage.getItem('jobTitle') || 'Senior Frontend Developer',
    company: localStorage.getItem('company') || 'Netflix',
    userName: localStorage.getItem('userName') || 'User',
    conversationId: localStorage.getItem('conversationId'),
    date: new Date().toISOString().split('T')[0],
    duration: localStorage.getItem('sessionDuration') ? 
      `${Math.floor(parseInt(localStorage.getItem('sessionDuration')!) / 60)} min` : '45 min',
    sessionCompleted: localStorage.getItem('sessionCompleted') === 'true'
  };

  const tabs = [
    { id: 'summary', label: 'Summary & Recording', icon: Play },
    { id: 'answers', label: 'Answer Analysis', icon: MessageSquare },
    { id: 'speech', label: 'Speech & Delivery', icon: Mic },
    { id: 'body', label: 'Body Language', icon: Eye },
  ];

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        setLoading(true);
        
        // Get stored conversation transcript and session data
        const storedTranscript = localStorage.getItem(`transcript_${sessionData.conversationId}`);
        const storedSession = localStorage.getItem(`session_${sessionData.conversationId}`);
        
        let realTranscript = null;
        let realAnswers: string[] = [];
        let sessionDataFromStorage = null;
        
        if (storedSession) {
          sessionDataFromStorage = JSON.parse(storedSession);
          console.log('📊 Retrieved session data from storage:', sessionDataFromStorage);
        }
        
        if (storedTranscript) {
          const transcriptData = JSON.parse(storedTranscript);
          console.log('📝 Raw transcript data:', transcriptData);
          
          // Build readable transcript from stored data
          if (Array.isArray(transcriptData)) {
            realTranscript = transcriptData.map((event: any) => {
              const speaker = event.participant === 'ai' || event.participant === 'system' ? 'Interviewer (Sarah)' : `Candidate (${sessionData.userName})`;
              return `${speaker}: ${event.content}`;
            }).join('\n\n');
            
            // Extract candidate answers
            realAnswers = transcriptData
              .filter((event: any) => event.participant !== 'ai' && event.participant !== 'system')
              .map((event: any) => event.content)
              .filter((content: string) => content && content.length > 20); // Filter meaningful responses
          }
          
          console.log('✅ Using stored conversation transcript');
          console.log('📄 Real transcript preview:', realTranscript?.substring(0, 200) + '...');
          console.log('📊 Real answers extracted:', realAnswers.length);
        }
        
        // Call the analyze endpoint with real conversation data
        const response = await fetch('http://localhost:3001/api/interview/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: id,
            conversationId: sessionData.conversationId,
            transcript: realTranscript,
            jobTitle: sessionData.role,
            userName: sessionData.userName,
            answers: realAnswers
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setAnalysisData(data.analysis);
          console.log('✅ Analysis data source:', data.dataSource);
          console.log('📊 Analysis data:', data.analysis);
          
          // Show data source indicator
          if (data.dataSource === 'real_conversation') {
            console.log('🎯 Analysis based on REAL conversation data!');
          }
        } else {
          const errorData = await response.json();
          console.error('❌ Analysis API error:', errorData);
          throw new Error(errorData.error || 'Failed to fetch analysis');
        }
      } catch (err) {
        console.error('Error fetching analysis:', err);
        setError('Failed to load interview analysis');
        
        // Use enhanced fallback data based on session
        setAnalysisData({
          overallScore: 84,
          pace: 82,
          fillerWords: 78,
          clarity: 88,
          eyeContact: 81,
          posture: 85,
          answerAnalysis: [
            {
              question: `Tell me about yourself and why you're interested in this ${sessionData.role} role.`,
              answer: `Thank you for having me, Sarah. I'm ${sessionData.userName}, a passionate professional with several years of experience in my field. I'm particularly interested in this ${sessionData.role} position because it aligns perfectly with my career goals and I believe I can bring valuable skills to the team.`,
              feedback: `Good professional tone and enthusiasm, ${sessionData.userName}. The answer shows clear interest but could be more specific about relevant experience and unique value proposition for the ${sessionData.role} role.`,
              score: 82,
              strengths: ["Professional demeanor", "Shows enthusiasm", "Clear communication", "Positive attitude"],
              areasForImprovement: ["Be more specific about relevant experience", "Highlight unique value proposition", "Include specific examples of achievements"]
            },
            {
              question: "Tell me about a time you faced a difficult challenge at work and how you handled it.",
              answer: "In my previous role, I encountered a project with a very tight deadline when a key team member left unexpectedly. I had to quickly reorganize the team, redistribute tasks, and personally take on additional responsibilities. Through clear communication and putting in extra effort, we managed to deliver the project on time and maintain our quality standards.",
              feedback: `Excellent use of STAR method structure, ${sessionData.userName}. Shows strong leadership, adaptability, and problem-solving skills under pressure.`,
              score: 88,
              strengths: ["Clear STAR method structure", "Demonstrates leadership", "Shows adaptability", "Quantified outcome (on time delivery)", "Mentions quality maintenance"],
              areasForImprovement: ["Could mention specific communication strategies used", "Include metrics about team size or project scope", "Describe lessons learned for future situations"]
            },
            {
              question: "How do you handle working with difficult team members or stakeholders?",
              answer: "I believe in open communication and trying to understand different perspectives. When I've worked with challenging colleagues, I try to find common ground and focus on our shared goals. I also make sure to maintain professionalism and seek solutions rather than dwelling on problems.",
              feedback: `Great demonstration of emotional intelligence and mature conflict resolution approach, ${sessionData.userName}. Shows professional mindset and solution-oriented thinking.`,
              score: 85,
              strengths: ["Shows emotional intelligence", "Focus on solutions", "Professional approach", "Emphasizes common goals", "Mature perspective"],
              areasForImprovement: ["Provide a specific example", "Mention specific techniques for finding common ground", "Describe measurable outcomes from conflict resolution"]
            },
            {
              question: `What are your greatest strengths and how do they relate to this ${sessionData.role} position?`,
              answer: "I would say my greatest strengths are my analytical thinking, attention to detail, and ability to work well under pressure. These skills have served me well in previous roles and I believe they're directly applicable to the challenges I'd face in this position.",
              feedback: `Good identification of relevant strengths, ${sessionData.userName}. The connection to the ${sessionData.role} role is clear, though could be strengthened with specific examples.`,
              score: 80,
              strengths: ["Relevant strengths identified", "Clear connection to role", "Confident delivery", "Practical focus"],
              areasForImprovement: ["Provide specific examples of these strengths in action", "Quantify achievements that demonstrate these strengths", `Explain how these strengths solve specific challenges in ${sessionData.role} roles`]
            }
          ],
          summary: `Strong overall performance with good communication skills and professional presentation. ${sessionData.userName} demonstrated excellent use of the STAR method and showed emotional intelligence in handling workplace challenges. The candidate shows genuine enthusiasm for the ${sessionData.role} role and has a solution-oriented mindset. Areas for improvement include providing more specific examples and quantifying achievements to strengthen impact.`,
          recommendations: [
            `Practice providing more specific examples with measurable outcomes, ${sessionData.userName}`,
            "Prepare 2-3 detailed STAR method stories for different competencies",
            "Work on reducing minor filler words during responses",
            "Maintain consistent eye contact throughout longer answers",
            "Prepare specific metrics and achievements to quantify your impact",
            `Research specific challenges in ${sessionData.role} roles to better connect your experience`
          ],
          dataSource: 'fallback_personalized'
        });
      } finally {
        setLoading(false);
      }
    };

    // Load recording if available
    const loadRecording = async () => {
      // Check localStorage for recording
      const storedRecording = localStorage.getItem(`recording_${sessionData.conversationId}`);
      const storedMetadata = localStorage.getItem(`recording_${sessionData.conversationId}_metadata`);
      
      if (storedRecording) {
        setRecordingUrl(storedRecording);
        console.log('✅ Loaded recording from localStorage');
      }
      
      if (storedMetadata) {
        setRecordingMetadata(JSON.parse(storedMetadata));
        console.log('✅ Loaded recording metadata:', JSON.parse(storedMetadata));
      }
    };

    fetchAnalysis();
    loadRecording();
  }, [id, sessionData.role, sessionData.userName, sessionData.conversationId]);

  const renderCircularProgress = (value: number, size: 'small' | 'large' = 'large') => {
    const radius = size === 'large' ? 15.9155 : 12;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = `${value}, 100`;
    
    return (
      <div className={`relative ${size === 'large' ? 'w-32 h-32' : 'w-24 h-24'}`}>
        <svg className={`${size === 'large' ? 'w-32 h-32' : 'w-24 h-24'} transform -rotate-90`} viewBox="0 0 36 36">
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={size === 'large' ? "3" : "2"}
          />
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeWidth={size === 'large' ? "3" : "2"}
            strokeDasharray={strokeDasharray}
            className="text-light-accent dark:text-dark-accent"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <span className={`${size === 'large' ? 'text-3xl' : 'text-2xl'} font-bold text-light-text-primary dark:text-dark-text-primary`}>
              {value}%
            </span>
            {size === 'large' && (
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                / 100
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const downloadRecording = () => {
    if (recordingUrl) {
      if (recordingUrl.startsWith('data:') || recordingUrl.startsWith('blob:')) {
        // Local recording - trigger download
        const link = document.createElement('a');
        link.href = recordingUrl;
        link.download = `interview-recording-${sessionData.conversationId}.${recordingMetadata?.format || 'webm'}`;
        link.click();
        console.log('📹 Downloaded local recording');
      } else {
        // External URL - open in new tab
        window.open(recordingUrl, '_blank');
        console.log('📹 Opened external recording URL');
      }
    } else {
      console.warn('⚠️ No recording URL available');
      alert('No recording available. The session may not have been recorded properly.');
    }
  };

  const downloadTranscript = () => {
    const storedTranscript = localStorage.getItem(`transcript_${sessionData.conversationId}`);
    if (storedTranscript) {
      const transcriptData = JSON.parse(storedTranscript);
      
      if (transcriptData.length === 0) {
        console.warn('⚠️ Transcript is empty');
        alert('No transcript data available. The conversation may not have been recorded properly.');
        return;
      }
      
      // Format transcript properly
      const formattedTranscript = transcriptData.map((event: any) => {
        const speaker = event.participant === 'ai' ? 'Interviewer (Sarah)' : `Candidate (${sessionData.userName})`;
        const timestamp = new Date(event.timestamp).toLocaleTimeString();
        return `[${timestamp}] ${speaker}: ${event.content}`;
      }).join('\n\n');
      
      // Add header information
      const header = `INTERVIEW TRANSCRIPT
===================
Candidate: ${sessionData.userName}
Job Title: ${sessionData.role}
Company: ${sessionData.company}
Date: ${sessionData.date}
Duration: ${sessionData.duration}
Conversation ID: ${sessionData.conversationId}
Data Source: Real Conversation
Events Count: ${transcriptData.length}

TRANSCRIPT:
===========

`;
      
      const fullTranscript = header + formattedTranscript;
      
      const blob = new Blob([fullTranscript], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `interview-transcript-${sessionData.userName}-${sessionData.date}.txt`;
      link.click();
      URL.revokeObjectURL(url);
      
      console.log('📄 Transcript downloaded successfully');
    } else {
      console.warn('⚠️ No transcript data available for download');
      alert('No transcript data available. The conversation may not have been recorded properly.');
    }
  };

  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-light-accent dark:border-dark-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-light-text-secondary dark:text-dark-text-secondary">Analyzing interview with AI...</p>
          </div>
        </div>
      );
    }

    if (error || !analysisData) {
      return (
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">{error || 'No analysis data available'}</p>
          <p className="text-light-text-secondary dark:text-dark-text-secondary">Using enhanced sample data based on your session</p>
        </div>
      );
    }

    switch (activeTab) {
      case 'summary':
        return (
          <div className="space-y-6">
            <div className="bg-light-secondary dark:bg-dark-secondary rounded-xl p-6 border border-light-border dark:border-dark-border">
              <h3 className="font-poppins font-semibold text-xl text-light-text-primary dark:text-dark-text-primary mb-4">
                Session Recording
              </h3>
              <div className="bg-black rounded-lg aspect-video flex items-center justify-center mb-4">
                {recordingUrl ? (
                  <video 
                    controls 
                    className="w-full h-full rounded-lg"
                    src={recordingUrl}
                  >
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <div className="text-center">
                    <Play className="h-16 w-16 text-white/50 mx-auto mb-4" />
                    <p className="text-white/70">Interview Recording</p>
                    <p className="text-white/50 text-sm mt-2">
                      {sessionData.sessionCompleted 
                        ? 'Recording completed - check downloads folder' 
                        : 'Recording in progress'
                      }
                    </p>
                    {recordingMetadata && (
                      <p className="text-white/40 text-xs mt-1">
                        Format: {recordingMetadata.format || 'webm'} • Source: {recordingMetadata.source || 'Tavus Cloud'}
                        {recordingMetadata.size && ` • Size: ${Math.round(recordingMetadata.size / 1024 / 1024)}MB`}
                      </p>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex space-x-4">
                <button 
                  onClick={downloadRecording}
                  className="inline-flex items-center px-4 py-2 bg-light-accent dark:bg-dark-accent text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {recordingUrl?.startsWith('http') ? 'View Recording' : 'Download Recording'}
                </button>
                
                <button 
                  onClick={downloadTranscript}
                  className="inline-flex items-center px-4 py-2 border border-light-border dark:border-dark-border text-light-text-primary dark:text-dark-text-primary rounded-lg hover:bg-light-primary dark:hover:bg-dark-primary transition-colors"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Transcript
                </button>
                
                <button className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:opacity-90 transition-opacity">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share for Mentor Review
                </button>
              </div>
            </div>

            <div className="bg-light-secondary dark:bg-dark-secondary rounded-xl p-6 border border-light-border dark:border-dark-border">
              <h3 className="font-poppins font-semibold text-xl text-light-text-primary dark:text-dark-text-primary mb-4">
                AI Analysis Summary
              </h3>
              <p className="font-inter text-light-text-primary dark:text-dark-text-primary leading-relaxed mb-4">
                {analysisData.summary}
              </p>
              
              {analysisData.dataSource === 'real_conversation' && (
                <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <p className="text-green-600 dark:text-green-400 text-sm font-medium">
                    ✅ This analysis is based on your actual conversation transcript and real-time metrics from Tavus
                  </p>
                </div>
              )}
              
              {analysisData.dataSource === 'fallback_personalized' && (
                <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-yellow-600 dark:text-yellow-400 text-sm font-medium">
                    ⚠️ This analysis uses enhanced sample data personalized for your session. Real conversation data may not have been captured properly.
                  </p>
                </div>
              )}
              
              <h4 className="font-medium text-light-text-primary dark:text-dark-text-primary mb-2">Key Recommendations:</h4>
              <ul className="list-disc list-inside space-y-1">
                {analysisData.recommendations.map((rec, index) => (
                  <li key={index} className="font-inter text-light-text-secondary dark:text-dark-text-secondary">
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );

      case 'answers':
        return (
          <div className="space-y-6">
            {analysisData.answerAnalysis.map((question, index) => (
              <div key={index} className="bg-light-secondary dark:bg-dark-secondary rounded-xl p-6 border border-light-border dark:border-dark-border">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-poppins font-semibold text-lg text-light-text-primary dark:text-dark-text-primary">
                    Question {index + 1}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">
                      {question.score}%
                    </span>
                    {analysisData.dataSource === 'real_conversation' && (
                      <span className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-1 rounded-full">
                        Real Data
                      </span>
                    )}
                  </div>
                </div>
                
                <p className="font-inter text-light-text-primary dark:text-dark-text-primary mb-4 font-medium">
                  {question.question}
                </p>
                
                <div className="mb-4">
                  <h4 className="font-medium text-light-text-primary dark:text-dark-text-primary mb-2">Your Answer:</h4>
                  <p className="font-inter text-light-text-secondary dark:text-dark-text-secondary italic">
                    {question.answer}
                  </p>
                </div>

                <div className="mb-4">
                  <h4 className="font-medium text-light-text-primary dark:text-dark-text-primary mb-2">AI Feedback:</h4>
                  <p className="font-inter text-light-text-primary dark:text-dark-text-primary">
                    {question.feedback}
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-green-600 dark:text-green-400 mb-2">Strengths:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {question.strengths.map((strength, i) => (
                        <li key={i} className="font-inter text-light-text-secondary dark:text-dark-text-secondary text-sm">
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-orange-600 dark:text-orange-400 mb-2">Areas for Improvement:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {question.areasForImprovement.map((improvement, i) => (
                        <li key={i} className="font-inter text-light-text-secondary dark:text-dark-text-secondary text-sm">
                          {improvement}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      case 'speech':
        return (
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { label: 'Pace', value: analysisData.pace, description: 'Speaking speed and rhythm' },
              { label: 'Filler Words', value: analysisData.fillerWords, description: 'Um, uh, like frequency' },
              { label: 'Clarity', value: analysisData.clarity, description: 'Articulation and pronunciation' },
            ].map((metric) => (
              <div key={metric.label} className="bg-light-secondary dark:bg-dark-secondary rounded-xl p-6 border border-light-border dark:border-dark-border text-center">
                <h3 className="font-poppins font-semibold text-lg text-light-text-primary dark:text-dark-text-primary mb-2">
                  {metric.label}
                </h3>
                <div className="flex justify-center mb-4">
                  {renderCircularProgress(metric.value, 'small')}
                </div>
                <p className="font-inter text-light-text-secondary dark:text-dark-text-secondary text-sm">
                  {metric.description}
                </p>
                {analysisData.dataSource === 'real_conversation' && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                    ✅ Real data
                  </p>
                )}
              </div>
            ))}
          </div>
        );

      case 'body':
        return (
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { label: 'Eye Contact', value: analysisData.eyeContact, description: 'Maintaining appropriate eye contact' },
              { label: 'Posture', value: analysisData.posture, description: 'Professional body positioning' },
            ].map((metric) => (
              <div key={metric.label} className="bg-light-secondary dark:bg-dark-secondary rounded-xl p-6 border border-light-border dark:border-dark-border text-center">
                <h3 className="font-poppins font-semibold text-lg text-light-text-primary dark:text-dark-text-primary mb-2">
                  {metric.label}
                </h3>
                <div className="flex justify-center mb-4">
                  {renderCircularProgress(metric.value)}
                </div>
                <p className="font-inter text-light-text-secondary dark:text-dark-text-secondary">
                  {metric.description}
                </p>
                {analysisData.dataSource === 'real_conversation' && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                    ✅ Real data
                  </p>
                )}
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Layout showSidebar>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <Link
            to="/sessions"
            className="p-2 hover:bg-light-secondary dark:hover:bg-dark-secondary rounded-lg border border-light-border dark:border-dark-border transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-light-text-primary dark:text-dark-text-primary" />
          </Link>
          <div>
            <h1 className="font-poppins font-bold text-3xl text-light-text-primary dark:text-dark-text-primary">
              Interview Feedback
            </h1>
            <p className="font-inter text-light-text-secondary dark:text-dark-text-secondary">
              {sessionData.role} at {sessionData.company} • {sessionData.date} • {sessionData.duration}
            </p>
          </div>
        </div>

        {/* Overall Score */}
        <div className="bg-light-secondary dark:bg-dark-secondary rounded-2xl p-8 border border-light-border dark:border-dark-border mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-poppins font-bold text-2xl text-light-text-primary dark:text-dark-text-primary mb-2">
                Overall Performance
              </h2>
              <p className="font-inter text-light-text-secondary dark:text-dark-text-secondary">
                {analysisData ? 
                  (analysisData.overallScore >= 85 ? `Excellent job, ${sessionData.userName}! You performed very well in most areas.` :
                   analysisData.overallScore >= 75 ? `Great job, ${sessionData.userName}! You scored above average in most areas.` :
                   `Good effort, ${sessionData.userName}! There are several areas where you can improve.`) :
                  'Analyzing your performance...'
                }
              </p>
            </div>
            <div className="text-center">
              {analysisData && renderCircularProgress(analysisData.overallScore)}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-light-border dark:border-dark-border mb-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-light-accent dark:border-dark-accent text-light-accent dark:text-dark-accent'
                    : 'border-transparent text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary hover:border-light-border dark:hover:border-dark-border'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {renderTabContent()}
      </div>
    </Layout>
  );
};

export default Feedback;