import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Target, MessageSquare, BarChart3, Loader2, User, AlertCircle } from 'lucide-react';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      console.log('Creating conversation with:', { 
        jobTitle, 
        userName, 
        customInstructions, 
        customCriteria 
      });
      
      const response = await fetch('http://localhost:3001/api/interview/create-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          jobTitle: jobTitle.trim(), 
          userName: userName.trim(),
          customInstructions: customInstructions.trim() || undefined, 
          customCriteria: customCriteria.trim() || undefined
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create interview conversation.');
      }
      
      const data = await response.json();
      const { conversation_url, conversation_id } = data;
      
      if (!conversation_url || !conversation_id) {
        throw new Error('No conversation URL or ID received from server.');
      }
      
      console.log('Conversation created successfully:', { conversation_url, conversation_id });
      
      // Store both conversation URL and ID for the interview page
      localStorage.setItem('conversationUrl', conversation_url);
      localStorage.setItem('conversationId', conversation_id);
      localStorage.setItem('userName', userName.trim());
      localStorage.setItem('jobTitle', jobTitle.trim());
      
      navigate('/interview');

    } catch (err) {
      console.error('Error creating conversation:', err);
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMetric = (metric: keyof typeof feedbackMetrics) => {
    setFeedbackMetrics(prev => ({ ...prev, [metric]: !prev[metric] }));
  };

  return (
    <Layout showSidebar>
      <div className="p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="font-poppins font-bold text-3xl text-light-text-primary dark:text-dark-text-primary mb-2">
            Set Up Your Mock Interview
          </h1>
          <p className="font-inter text-light-text-secondary dark:text-dark-text-secondary">
            Configure your interview session to get the most relevant practice experience.
          </p>
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
          </div>

          {/* Step 2: Customize Your Interviewer */}
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
              disabled={isLoading || !jobTitle.trim() || !userName.trim()} 
              className="inline-flex items-center justify-center px-8 py-4 bg-light-accent dark:bg-dark-accent text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating Interview...
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