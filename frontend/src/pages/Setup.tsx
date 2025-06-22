// project/src/pages/Setup.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Target, MessageSquare, BarChart3, Loader2 } from 'lucide-react';
import Layout from '../components/Layout';

const Setup = () => {
  const navigate = useNavigate();
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [questionType, setQuestionType] = useState('preset');
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');
  const [feedbackMetrics, setFeedbackMetrics] = useState({
    answerStructure: true,
    speechDelivery: true,
    bodyLanguage: true,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const presetOptions = [
    { value: 'general', label: 'General Software Engineering' },
    { value: 'frontend', label: 'Frontend Development' },
    { value: 'backend', label: 'Backend Development' },
    { value: 'fullstack', label: 'Full Stack Development' },
    { value: 'product', label: 'Product Management' },
    { value: 'design', label: 'UX/UI Design' },
    { value: 'data', label: 'Data Science' },
    { value: 'devops', label: 'DevOps Engineering' },
  ];

  const pollForVideo = async (videoId: string): Promise<string> => {
    for (let i = 0; i < 40; i++) {
      try {
        const statusResponse = await fetch(`http://localhost:3001/api/interview/status/${videoId}`);
        if (!statusResponse.ok) throw new Error('Failed to get video status.');
        const data = await statusResponse.json();

        console.log(`Polling attempt ${i + 1}: Status is '${data.status}'`);
        if (data.status === 'completed') return data.hosted_url;
        if (data.status === 'error') throw new Error('Tavus video generation failed.');
        
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (err) {
        console.error("Polling error:", err);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    throw new Error('Video generation timed out.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const startResponse = await fetch('http://localhost:3001/api/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobTitle, customPrompt }),
      });

      if (!startResponse.ok) {
        const errorData = await startResponse.json();
        throw new Error(errorData.message || 'Failed to initiate interview session.');
      }
      
      const { videoId } = await startResponse.json();
      const finalVideoUrl = await pollForVideo(videoId);
      
      localStorage.setItem('aiVideoUrl', finalVideoUrl);
      navigate('/interview');

    } catch (err) {
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
          {/* Step 1: Basics */}
          <div className="bg-light-secondary dark:bg-dark-secondary p-6 rounded-xl border border-light-border dark:border-dark-border">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center"><Target className="h-4 w-4 text-white" /></div>
              <h2 className="font-poppins font-semibold text-xl text-light-text-primary dark:text-dark-text-primary">Step 1: Interview Basics</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="jobTitle" className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-2">Target Job Title *</label>
                <input type="text" id="jobTitle" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className="w-full px-4 py-3 border border-light-border dark:border-dark-border rounded-lg bg-light-primary dark:bg-dark-primary focus:outline-none" placeholder="e.g., Senior Frontend Developer" required />
              </div>
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-2">Target Company</label>
                <input type="text" id="company" value={company} onChange={(e) => setCompany(e.target.value)} className="w-full px-4 py-3 border border-light-border dark:border-dark-border rounded-lg bg-light-primary dark:bg-dark-primary focus:outline-none" placeholder="e.g., Netflix" />
              </div>
            </div>
          </div>

          {/* Step 2: Questions */}
          <div className="bg-light-secondary dark:bg-dark-secondary p-6 rounded-xl border border-light-border dark:border-dark-border">
            <div className="flex items-center space-x-3 mb-6">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center"><MessageSquare className="h-4 w-4 text-white" /></div>
                <h2 className="font-poppins font-semibold text-xl text-light-text-primary dark:text-dark-text-primary">Step 2: Interview Questions</h2>
            </div>
            <textarea id="customPrompt" rows={4} value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} className="w-full px-4 py-3 border border-light-border dark:border-dark-border rounded-lg bg-light-primary dark:bg-dark-primary focus:outline-none" placeholder="Optional: Enter your own question or prompt for the AI..."/>
          </div>

          {/* Error Message Display */}
          {error && (
            <div className="text-center p-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg">
              <p><strong>Error:</strong> {error}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <button type="submit" disabled={isLoading} className="inline-flex items-center justify-center px-8 py-4 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
              {isLoading ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Generating...</>
              ) : (
                <>Begin Interview <ArrowRight className="ml-2 h-5 w-5" /></>
              )}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default Setup;