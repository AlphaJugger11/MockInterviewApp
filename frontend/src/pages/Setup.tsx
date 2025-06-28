import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Target, User, BarChart3, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import Layout from '../components/Layout';

const Setup = () => {
  const navigate = useNavigate();
  const [jobTitle, setJobTitle] = useState('');
  const [userName, setUserName] = useState('');
  const [company, setCompany] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [customCriteria, setCustomCriteria] = useState('');
  const [feedbackMetrics, setFeedbackMetrics] = useState({
    answerStructure: true,
    speechDelivery: true,
    bodyLanguage: true,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  // Check backend connectivity on component mount
  useEffect(() => {
    const checkBackendConnection = async () => {
      try {
        console.log('🔍 Checking backend connectivity...');
        
        const response = await fetch('http://localhost:3001/api/test', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Backend connected:', data);
          setBackendStatus('connected');
        } else {
          throw new Error(`Backend responded with status: ${response.status}`);
        }
      } catch (err) {
        console.error('❌ Backend connection failed:', err);
        setBackendStatus('error');
        setError('Cannot connect to backend server. Please ensure the backend is running on port 3001.');
      }
    };

    checkBackendConnection();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (backendStatus !== 'connected') {
      setError('Backend is not connected. Please check the server status.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🚀 Creating conversation with enhanced recording:', { 
        jobTitle, 
        userName, 
        customInstructions, 
        customCriteria,
        feedbackMetrics
      });
      
      const response = await fetch('http://localhost:3001/api/interview/create-conversation', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          jobTitle: jobTitle.trim(), 
          userName: userName.trim(),
          customInstructions: customInstructions.trim() || undefined, 
          customCriteria: customCriteria.trim() || undefined,
          feedbackMetrics
        }),
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response error:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || 'Unknown error occurred' };
        }
        
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const { conversation_url, conversation_id, sessionData } = data;
      
      if (!conversation_url || !conversation_id) {
        throw new Error('No conversation URL or ID received from server.');
      }
      
      console.log('✅ Conversation created successfully:', { conversation_url, conversation_id, sessionData });
      
      // Store conversation data and session info for the interview page
      localStorage.setItem('conversationUrl', conversation_url);
      localStorage.setItem('conversationId', conversation_id);
      localStorage.setItem('userName', userName.trim());
      localStorage.setItem('jobTitle', jobTitle.trim());
      localStorage.setItem('company', company.trim());
      localStorage.setItem('feedbackMetrics', JSON.stringify(feedbackMetrics));
      
      // Store dynamic persona ID for cleanup
      if (sessionData.dynamicPersonaId) {
        localStorage.setItem('dynamicPersonaId', sessionData.dynamicPersonaId);
      }
      
      // Store custom instructions and criteria for later use in feedback
      if (customInstructions.trim()) {
        localStorage.setItem('customInstructions', customInstructions.trim());
      }
      if (customCriteria.trim()) {
        localStorage.setItem('customCriteria', customCriteria.trim());
      }
      
      console.log('💾 Session data stored, navigating to interview...');
      navigate('/interview');

    } catch (err) {
      console.error('❌ Error creating conversation:', err);
      
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Network error: Cannot connect to the backend server. Please check if the backend is running.');
      } else {
        setError(err instanceof Error ? err.message : "An unknown error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMetric = (metric: keyof typeof feedbackMetrics) => {
    setFeedbackMetrics(prev => ({ ...prev, [metric]: !prev[metric] }));
  };

  const retryBackendConnection = async () => {
    setBackendStatus('checking');
    setError(null);
    
    try {
      const response = await fetch('http://localhost:3001/api/test');
      if (response.ok) {
        setBackendStatus('connected');
      } else {
        throw new Error('Backend not responding');
      }
    } catch (err) {
      setBackendStatus('error');
      setError('Backend connection failed. Please ensure the server is running.');
    }
  };

  return (
    <Layout showSidebar>
      <div className="p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="font-poppins font-bold text-3xl text-light-text-primary dark:text-dark-text-primary mb-2">
            Set Up Your Mock Interview
          </h1>
          <p className="font-inter text-light-text-secondary dark:text-dark-text-secondary">
            Configure your interview session to get the most relevant practice experience with a personalized AI coach.
          </p>
        </div>

        {/* Backend Status Indicator */}
        <div className="mb-6 p-4 rounded-lg border border-light-border dark:border-dark-border bg-light-secondary dark:bg-dark-secondary">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {backendStatus === 'checking' && (
                <>
                  <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                  <span className="text-blue-500">Checking backend connection...</span>
                </>
              )}
              {backendStatus === 'connected' && (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-green-500">Backend connected and ready</span>
                </>
              )}
              {backendStatus === 'error' && (
                <>
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <span className="text-red-500">Backend connection failed</span>
                </>
              )}
            </div>
            {backendStatus === 'error' && (
              <button
                onClick={retryBackendConnection}
                className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
              >
                Retry
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Step 1: Interview Basics */}
          <div className="bg-light-secondary dark:bg-dark-secondary p-6 rounded-xl border border-light-border dark:border-dark-border">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-8 h-8 bg-light-accent dark:bg-dark-accent rounded-full flex items-center justify-center">
                <Target className="h-4 w-4 text-white" />
              </div>
              <h2 className="font-poppins font-semibold text-xl text-light-text-primary dark:text-dark-text-primary">
                Step 1: Interview Basics
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="userName" className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-2">
                  Your Name *
                </label>
                <input 
                  type="text" 
                  id="userName" 
                  value={userName} 
                  onChange={(e) => setUserName(e.target.value)} 
                  className="w-full px-4 py-3 border border-light-border dark:border-dark-border rounded-lg bg-light-primary dark:bg-dark-primary text-light-text-primary dark:text-dark-text-primary placeholder-light-text-secondary dark:placeholder-dark-text-secondary focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent focus:border-transparent" 
                  placeholder="e.g., John Doe" 
                  required 
                />
              </div>
              <div>
                <label htmlFor="jobTitle" className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-2">
                  Target Job Title *
                </label>
                <input 
                  type="text" 
                  id="jobTitle" 
                  value={jobTitle} 
                  onChange={(e) => setJobTitle(e.target.value)} 
                  className="w-full px-4 py-3 border border-light-border dark:border-dark-border rounded-lg bg-light-primary dark:bg-dark-primary text-light-text-primary dark:text-dark-text-primary placeholder-light-text-secondary dark:placeholder-dark-text-secondary focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent focus:border-transparent" 
                  placeholder="e.g., Senior Frontend Developer" 
                  required 
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="company" className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-2">
                  Target Company (Optional)
                </label>
                <input 
                  type="text" 
                  id="company" 
                  value={company} 
                  onChange={(e) => setCompany(e.target.value)} 
                  className="w-full px-4 py-3 border border-light-border dark:border-dark-border rounded-lg bg-light-primary dark:bg-dark-primary text-light-text-primary dark:text-dark-text-primary placeholder-light-text-secondary dark:placeholder-dark-text-secondary focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent focus:border-transparent" 
                  placeholder="e.g., Netflix" 
                />
              </div>
            </div>

            {/* AI Interviewer Info */}
            <div className="mt-6 p-4 bg-light-primary dark:bg-dark-primary rounded-lg border border-light-border dark:border-dark-border">
              <div className="flex items-center space-x-3 mb-2">
                <User className="h-5 w-5 text-light-accent dark:text-dark-accent" />
                <h3 className="font-medium text-light-text-primary dark:text-dark-text-primary">AI Interviewer: Sarah</h3>
              </div>
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                Your AI interviewer Sarah will be dynamically configured for your specific role and will greet you by name. 
                She has advanced vision capabilities and will provide real-time feedback on your answers, body language, and communication skills.
              </p>
            </div>
          </div>

          {/* Step 2: Customize Your AI Interviewer */}
          <div className="bg-light-secondary dark:bg-dark-secondary p-6 rounded-xl border border-light-border dark:border-dark-border">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-8 h-8 bg-light-accent dark:bg-dark-accent rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <h2 className="font-poppins font-semibold text-xl text-light-text-primary dark:text-dark-text-primary">
                Step 2: Customize Your AI Interviewer
              </h2>
            </div>
            
            <div className="space-y-6">
              <div>
                <label htmlFor="customInstructions" className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-2">
                  Custom Persona Instructions
                </label>
                <textarea 
                  id="customInstructions" 
                  rows={6} 
                  value={customInstructions} 
                  onChange={(e) => setCustomInstructions(e.target.value)} 
                  className="w-full px-4 py-3 border border-light-border dark:border-dark-border rounded-lg bg-light-primary dark:bg-dark-primary text-light-text-primary dark:text-dark-text-primary placeholder-light-text-secondary dark:placeholder-dark-text-secondary focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent focus:border-transparent" 
                  placeholder="Optional: Define your AI's personality, the questions it should ask, and its overall goal. Leave blank to auto-generate based on your job title using AI..."
                />
                <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-2">
                  If left empty, our AI will automatically generate personalized instructions based on your job title and name.
                </p>
              </div>

              <div>
                <label htmlFor="customCriteria" className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-2">
                  Custom Judgment Criteria
                </label>
                <textarea 
                  id="customCriteria" 
                  rows={3} 
                  value={customCriteria} 
                  onChange={(e) => setCustomCriteria(e.target.value)} 
                  className="w-full px-4 py-3 border border-light-border dark:border-dark-border rounded-lg bg-light-primary dark:bg-dark-primary text-light-text-primary dark:text-dark-text-primary placeholder-light-text-secondary dark:placeholder-dark-text-secondary focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent focus:border-transparent" 
                  placeholder="Optional: List specific things you want to be judged on (e.g., technical depth, leadership examples, problem-solving approach)..."
                />
                <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-2">
                  These will be combined with our standard evaluation criteria (STAR method, clarity, confidence, non-verbal communication).
                </p>
              </div>
            </div>
          </div>

          {/* Step 3: Feedback Metrics */}
          <div className="bg-light-secondary dark:bg-dark-secondary p-6 rounded-xl border border-light-border dark:border-dark-border">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-8 h-8 bg-light-accent dark:bg-dark-accent rounded-full flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-white" />
              </div>
              <h2 className="font-poppins font-semibold text-xl text-light-text-primary dark:text-dark-text-primary">
                Step 3: Feedback Metrics
              </h2>
            </div>
            
            <div className="grid md:grid-cols-3 gap-4">
              {Object.entries(feedbackMetrics).map(([key, value]) => (
                <label key={key} className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg border border-light-border dark:border-dark-border hover:bg-light-primary dark:hover:bg-dark-primary transition-colors">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={() => toggleMetric(key as keyof typeof feedbackMetrics)}
                    className="w-5 h-5 text-light-accent dark:text-dark-accent bg-light-primary dark:bg-dark-primary border-light-border dark:border-dark-border rounded focus:ring-light-accent dark:focus:ring-dark-accent focus:ring-2"
                  />
                  <span className="font-inter text-light-text-primary dark:text-dark-text-primary">
                    {key === 'answerStructure' && 'Answer Structure'}
                    {key === 'speechDelivery' && 'Speech Delivery'}
                    {key === 'bodyLanguage' && 'Body Language'}
                  </span>
                </label>
              ))}
            </div>
            <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary mt-4">
              Select the areas you want to receive detailed feedback on during your interview analysis.
            </p>
          </div>

          {/* Error Message Display */}
          {error && (
            <div className="flex items-center space-x-3 p-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-medium">Error occurred</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <button 
              type="submit" 
              disabled={isLoading || !jobTitle.trim() || !userName.trim() || backendStatus !== 'connected'} 
              className="inline-flex items-center justify-center px-8 py-4 bg-light-accent dark:bg-dark-accent text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating Enhanced Interview...
                </>
              ) : (
                <>
                  Begin Interview 
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default Setup;