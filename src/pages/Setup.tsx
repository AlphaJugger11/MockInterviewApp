import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Target, MessageSquare, BarChart3 } from 'lucide-react';
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/interview');
  };

  const toggleMetric = (metric: keyof typeof feedbackMetrics) => {
    setFeedbackMetrics(prev => ({
      ...prev,
      [metric]: !prev[metric]
    }));
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
              <div className="w-8 h-8 bg-light-accent dark:bg-dark-accent rounded-full flex items-center justify-center">
                <Target className="h-4 w-4 text-white" />
              </div>
              <h2 className="font-poppins font-semibold text-xl text-light-text-primary dark:text-dark-text-primary">
                Step 1: Interview Basics
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
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

              <div>
                <label htmlFor="company" className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-2">
                  Target Company *
                </label>
                <input
                  type="text"
                  id="company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full px-4 py-3 border border-light-border dark:border-dark-border rounded-lg bg-light-primary dark:bg-dark-primary text-light-text-primary dark:text-dark-text-primary placeholder-light-text-secondary dark:placeholder-dark-text-secondary focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent focus:border-transparent"
                  placeholder="e.g., Netflix"
                  required
                />
              </div>
            </div>
          </div>

          {/* Step 2: Questions */}
          <div className="bg-light-secondary dark:bg-dark-secondary p-6 rounded-xl border border-light-border dark:border-dark-border">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-8 h-8 bg-light-accent dark:bg-dark-accent rounded-full flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-white" />
              </div>
              <h2 className="font-poppins font-semibold text-xl text-light-text-primary dark:text-dark-text-primary">
                Step 2: Interview Questions
              </h2>
            </div>

            <div className="space-y-4">
              <div className="flex space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="questionType"
                    value="preset"
                    checked={questionType === 'preset'}
                    onChange={(e) => setQuestionType(e.target.value)}
                    className="text-light-accent dark:text-dark-accent focus:ring-light-accent dark:focus:ring-dark-accent"
                  />
                  <span className="font-medium text-light-text-primary dark:text-dark-text-primary">
                    Preset Path
                  </span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="questionType"
                    value="custom"
                    checked={questionType === 'custom'}
                    onChange={(e) => setQuestionType(e.target.value)}
                    className="text-light-accent dark:text-dark-accent focus:ring-light-accent dark:focus:ring-dark-accent"
                  />
                  <span className="font-medium text-light-text-primary dark:text-dark-text-primary">
                    Use My Own Prompt
                  </span>
                </label>
              </div>

              {questionType === 'preset' && (
                <div>
                  <label htmlFor="preset" className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-2">
                    Choose Interview Type
                  </label>
                  <select
                    id="preset"
                    value={selectedPreset}
                    onChange={(e) => setSelectedPreset(e.target.value)}
                    className="w-full px-4 py-3 border border-light-border dark:border-dark-border rounded-lg bg-light-primary dark:bg-dark-primary text-light-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent focus:border-transparent"
                    required={questionType === 'preset'}
                  >
                    <option value="">Select an interview type...</option>
                    {presetOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {questionType === 'custom' && (
                <div>
                  <label htmlFor="customPrompt" className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-2">
                    Custom Interview Prompt
                  </label>
                  <textarea
                    id="customPrompt"
                    rows={4}
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    className="w-full px-4 py-3 border border-light-border dark:border-dark-border rounded-lg bg-light-primary dark:bg-dark-primary text-light-text-primary dark:text-dark-text-primary placeholder-light-text-secondary dark:placeholder-dark-text-secondary focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent focus:border-transparent"
                    placeholder="e.g., Act as a hiring manager for a Senior Frontend Developer role at Netflix. Focus on React, TypeScript, and system design questions. Be friendly but thorough in your evaluation..."
                    required={questionType === 'custom'}
                  />
                </div>
              )}
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

            <div className="space-y-4">
              <p className="text-light-text-secondary dark:text-dark-text-secondary mb-4">
                Select which aspects you'd like our AI to analyze and provide feedback on:
              </p>

              <div className="space-y-3">
                {[
                  { key: 'answerStructure', label: 'Answer Structure', description: 'STAR method, clarity, and organization' },
                  { key: 'speechDelivery', label: 'Speech & Delivery', description: 'Pace, filler words, and vocal confidence' },
                  { key: 'bodyLanguage', label: 'Body Language', description: 'Eye contact, posture, and gestures' },
                ].map((metric) => (
                  <div key={metric.key} className="flex items-center justify-between p-4 bg-light-primary dark:bg-dark-primary rounded-lg border border-light-border dark:border-dark-border">
                    <div className="flex-1">
                      <h4 className="font-medium text-light-text-primary dark:text-dark-text-primary">
                        {metric.label}
                      </h4>
                      <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                        {metric.description}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleMetric(metric.key as keyof typeof feedbackMetrics)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent focus:ring-offset-2 ${
                        feedbackMetrics[metric.key as keyof typeof feedbackMetrics]
                          ? 'bg-light-accent dark:bg-dark-accent'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          feedbackMetrics[metric.key as keyof typeof feedbackMetrics]
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center px-8 py-4 bg-light-accent dark:bg-dark-accent text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              Begin Interview
              <ArrowRight className="ml-2 h-5 w-5" />
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default Setup;