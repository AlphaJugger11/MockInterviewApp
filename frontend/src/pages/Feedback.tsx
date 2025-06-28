import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Share2, Play, TrendingUp, Eye, Mic, MessageSquare } from 'lucide-react';
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
}

const Feedback = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('summary');
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sessionData = {
    role: localStorage.getItem('jobTitle') || 'Senior Frontend Developer',
    company: 'Netflix',
    date: new Date().toISOString().split('T')[0],
    duration: '45 min',
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
        
        // Create a mock transcript for analysis
        const mockTranscript = `
        Interviewer: Tell me about a time you faced a difficult challenge at work.
        Candidate: I was leading a project with a tight deadline when our main developer left unexpectedly. I had to quickly reorganize the team, redistribute tasks, and personally take on additional coding responsibilities. Through clear communication and extra hours, we delivered the project on time and maintained quality standards.
        
        Interviewer: Describe a situation where you had to work with a difficult team member.
        Candidate: In my previous role, I worked with a colleague who was resistant to feedback and often missed deadlines. I approached them privately to understand their concerns and discovered they were overwhelmed with their workload. I helped them prioritize tasks and offered support, which improved our working relationship and team productivity.
        `;
        
        // Call the analyze endpoint
        const response = await fetch('http://localhost:3001/api/interview/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: id,
            transcript: mockTranscript,
            answers: ["Sample answer 1", "Sample answer 2"]
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setAnalysisData(data.analysis);
        } else {
          throw new Error('Failed to fetch analysis');
        }
      } catch (err) {
        console.error('Error fetching analysis:', err);
        setError('Failed to load interview analysis');
        
        // Use fallback data
        setAnalysisData({
          overallScore: 82,
          pace: 85,
          fillerWords: 72,
          clarity: 88,
          eyeContact: 79,
          posture: 83,
          answerAnalysis: [
            {
              question: "Tell me about a time you faced a difficult challenge at work.",
              answer: "I was leading a project with a tight deadline when our main developer left unexpectedly...",
              feedback: "Good use of STAR method. Clear situation and task description.",
              score: 85,
              strengths: ["Clear structure", "Specific examples", "Quantified results"],
              areasForImprovement: ["Could be more concise", "Add more emotional intelligence elements"]
            },
            {
              question: "Describe a situation where you had to work with a difficult team member.",
              answer: "In my previous role, I worked with a colleague who was resistant to feedback...",
              feedback: "Excellent demonstration of conflict resolution skills.",
              score: 88,
              strengths: ["Diplomatic approach", "Focus on solutions", "Professional tone"],
              areasForImprovement: ["Could include more specific outcomes"]
            }
          ],
          summary: "Strong performance with good technical knowledge and communication skills. Focus on reducing filler words and maintaining consistent eye contact.",
          recommendations: ["Practice the STAR method more", "Work on reducing 'um' and 'uh'", "Maintain better eye contact"]
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [id]);

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
          <p className="text-light-text-secondary dark:text-dark-text-secondary">Using sample data for demonstration</p>
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
                <div className="text-center">
                  <Play className="h-16 w-16 text-white/50 mx-auto mb-4" />
                  <p className="text-white/70">Interview Recording</p>
                  <button className="mt-4 px-6 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors">
                    Play Recording
                  </button>
                </div>
              </div>
              <button className="inline-flex items-center px-4 py-2 bg-light-accent dark:bg-dark-accent text-white rounded-lg hover:opacity-90 transition-opacity">
                <Share2 className="h-4 w-4 mr-2" />
                Share for Mentor Review
              </button>
            </div>

            <div className="bg-light-secondary dark:bg-dark-secondary rounded-xl p-6 border border-light-border dark:border-dark-border">
              <h3 className="font-poppins font-semibold text-xl text-light-text-primary dark:text-dark-text-primary mb-4">
                AI Analysis Summary
              </h3>
              <p className="font-inter text-light-text-primary dark:text-dark-text-primary leading-relaxed mb-4">
                {analysisData.summary}
              </p>
              
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
              {sessionData.role} at {sessionData.company} • {sessionData.date}
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
                Great job! You scored above average in most areas.
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