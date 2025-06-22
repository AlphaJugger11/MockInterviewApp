import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Share2, Play, TrendingUp, Eye, Mic, MessageSquare } from 'lucide-react';
import Layout from '../components/Layout';
import { mockQuestions } from '../data/mockData';

const Feedback = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('summary');

  const overallScore = 82;
  const sessionData = {
    role: 'Senior Frontend Developer',
    company: 'Netflix',
    date: '2024-01-15',
    duration: '45 min',
  };

  const metrics = {
    pace: 85,
    fillerWords: 72,
    clarity: 88,
    eyeContact: 79,
    posture: 83,
  };

  const tabs = [
    { id: 'summary', label: 'Summary & Recording', icon: Play },
    { id: 'answers', label: 'Answer Analysis', icon: MessageSquare },
    { id: 'speech', label: 'Speech & Delivery', icon: Mic },
    { id: 'body', label: 'Body Language', icon: Eye },
  ];

  const renderTabContent = () => {
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
                Overall Summary
              </h3>
              <p className="font-inter text-light-text-primary dark:text-dark-text-primary leading-relaxed">
                You demonstrated strong technical knowledge and communication skills throughout the interview. 
                Your answers were well-structured and showed good understanding of the role requirements. 
                There are opportunities to improve in reducing filler words and maintaining more consistent eye contact.
              </p>
            </div>
          </div>
        );

      case 'answers':
        return (
          <div className="space-y-6">
            {mockQuestions.map((question, index) => (
              <div key={question.id} className="bg-light-secondary dark:bg-dark-secondary rounded-xl p-6 border border-light-border dark:border-dark-border">
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
                      {question.improvements.map((improvement, i) => (
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
              { label: 'Pace', value: metrics.pace, description: 'Speaking speed and rhythm' },
              { label: 'Filler Words', value: metrics.fillerWords, description: 'Um, uh, like frequency' },
              { label: 'Clarity', value: metrics.clarity, description: 'Articulation and pronunciation' },
            ].map((metric) => (
              <div key={metric.label} className="bg-light-secondary dark:bg-dark-secondary rounded-xl p-6 border border-light-border dark:border-dark-border text-center">
                <h3 className="font-poppins font-semibold text-lg text-light-text-primary dark:text-dark-text-primary mb-2">
                  {metric.label}
                </h3>
                <div className="relative w-24 h-24 mx-auto mb-4">
                  <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="2"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeDasharray={`${metric.value}, 100`}
                      className="text-light-accent dark:text-dark-accent"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">
                      {metric.value}%
                    </span>
                  </div>
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
              { label: 'Eye Contact', value: metrics.eyeContact, description: 'Maintaining appropriate eye contact' },
              { label: 'Posture', value: metrics.posture, description: 'Professional body positioning' },
            ].map((metric) => (
              <div key={metric.label} className="bg-light-secondary dark:bg-dark-secondary rounded-xl p-6 border border-light-border dark:border-dark-border text-center">
                <h3 className="font-poppins font-semibold text-lg text-light-text-primary dark:text-dark-text-primary mb-2">
                  {metric.label}
                </h3>
                <div className="relative w-32 h-32 mx-auto mb-4">
                  <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="2"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeDasharray={`${metric.value}, 100`}
                      className="text-light-accent dark:text-dark-accent"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold text-light-text-primary dark:text-dark-text-primary">
                      {metric.value}%
                    </span>
                  </div>
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
              <div className="relative w-32 h-32">
                <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray={`${overallScore}, 100`}
                    className="text-light-accent dark:text-dark-accent"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <span className="text-3xl font-bold text-light-text-primary dark:text-dark-text-primary">
                      {overallScore}
                    </span>
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                      / 100
                    </p>
                  </div>
                </div>
              </div>
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