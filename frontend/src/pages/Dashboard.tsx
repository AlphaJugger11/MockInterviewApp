import React from 'react';
import { Link } from 'react-router-dom';
import { Play, TrendingUp, Calendar, Award } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Layout from '../components/Layout';
import { scoreData } from '../data/mockData';

const Dashboard = () => {
  // Get user data from localStorage
  const userName = localStorage.getItem('userName') || 'User';
  const userEmail = localStorage.getItem('userEmail') || '';
  
  // Load user sessions from localStorage
  const userSessions: any[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('session_')) {
      try {
        const sessionData = JSON.parse(localStorage.getItem(key) || '{}');
        if (sessionData.jobTitle && sessionData.userName) {
          userSessions.push(sessionData);
        }
      } catch (error) {
        console.warn('Error parsing session data:', error);
      }
    }
  }

  const totalSessions = userSessions.length;
  const averageScore = totalSessions > 0 ? 
    Math.round(userSessions.reduce((acc, session) => acc + (session.score || 85), 0) / totalSessions) : 
    0;
  const improvement = '+12%';

  // Get recent sessions (last 3)
  const recentSessions = userSessions
    .sort((a, b) => new Date(b.endTime || b.timestamp || 0).getTime() - new Date(a.endTime || a.timestamp || 0).getTime())
    .slice(0, 3)
    .map((session, index) => ({
      id: session.conversationId || `session_${index}`,
      role: session.jobTitle,
      company: session.company || 'Not specified',
      date: new Date(session.endTime || session.timestamp || Date.now()).toLocaleDateString(),
      score: session.score || Math.floor(Math.random() * 20) + 75, // Random score between 75-95
      duration: session.duration ? `${Math.floor(session.duration / 60)}:${(session.duration % 60).toString().padStart(2, '0')}` : 'Unknown'
    }));

  return (
    <Layout showSidebar>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="font-poppins font-bold text-3xl text-light-text-primary dark:text-dark-text-primary mb-2">
            Welcome back, {userName}!
          </h1>
          <p className="font-inter text-light-text-secondary dark:text-dark-text-secondary">
            Ready to ace your next interview? Let's continue your preparation.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-light-secondary dark:bg-dark-secondary p-6 rounded-xl border border-light-border dark:border-dark-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">Total Sessions</p>
                <p className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">{totalSessions}</p>
              </div>
              <div className="p-3 bg-light-accent dark:bg-dark-accent rounded-lg">
                <Calendar className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-light-secondary dark:bg-dark-secondary p-6 rounded-xl border border-light-border dark:border-dark-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">Average Score</p>
                <p className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">
                  {averageScore > 0 ? `${averageScore}%` : 'N/A'}
                </p>
              </div>
              <div className="p-3 bg-light-accent dark:bg-dark-accent rounded-lg">
                <Award className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-light-secondary dark:bg-dark-secondary p-6 rounded-xl border border-light-border dark:border-dark-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">Improvement</p>
                <p className="text-2xl font-bold text-green-500">{improvement}</p>
              </div>
              <div className="p-3 bg-light-accent dark:bg-dark-accent rounded-lg">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Start New Interview Card */}
          <div className="lg:col-span-2">
            <Link
              to="/setup"
              className="block bg-gradient-to-r from-light-accent to-blue-600 dark:from-dark-accent dark:to-green-400 p-8 rounded-2xl text-white hover:opacity-90 transition-opacity"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-poppins font-bold text-2xl mb-2">Start a New Mock Interview</h3>
                  <p className="text-white/90">Practice with AI-powered interviews tailored to your target role</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Play className="h-8 w-8" />
                  <span className="font-semibold">Begin</span>
                </div>
              </div>
            </Link>
          </div>

          {/* Score Trend Chart */}
          <div className="bg-light-secondary dark:bg-dark-secondary p-6 rounded-xl border border-light-border dark:border-dark-border">
            <h3 className="font-poppins font-semibold text-xl text-light-text-primary dark:text-dark-text-primary mb-6">
              Overall Score Trend
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={scoreData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333333" />
                  <XAxis 
                    dataKey="session" 
                    stroke="#A0A0A0"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#A0A0A0"
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#1E1E1E',
                      border: '1px solid #333333',
                      borderRadius: '8px',
                      color: '#EAEAEA'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#00F5A0" 
                    strokeWidth={3}
                    dot={{ fill: '#00F5A0', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Sessions */}
          <div className="bg-light-secondary dark:bg-dark-secondary p-6 rounded-xl border border-light-border dark:border-dark-border">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-poppins font-semibold text-xl text-light-text-primary dark:text-dark-text-primary">
                Recent Sessions
              </h3>
              <Link
                to="/sessions"
                className="text-light-accent dark:text-dark-accent hover:underline text-sm font-medium"
              >
                View All
              </Link>
            </div>

            <div className="space-y-4">
              {recentSessions.length > 0 ? (
                recentSessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-4 bg-light-primary dark:bg-dark-primary rounded-lg border border-light-border dark:border-dark-border">
                    <div className="flex-1">
                      <h4 className="font-medium text-light-text-primary dark:text-dark-text-primary">
                        {session.role}
                      </h4>
                      <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                        {session.company} • {session.date}
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="font-semibold text-light-text-primary dark:text-dark-text-primary">
                          {session.score}%
                        </p>
                        <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                          {session.duration}
                        </p>
                      </div>
                      <Link
                        to={`/feedback/${session.id}`}
                        className="px-3 py-1 bg-light-accent dark:bg-dark-accent text-white text-sm rounded-md hover:opacity-90 transition-opacity"
                      >
                        View Analysis
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-light-text-secondary dark:text-dark-text-secondary mb-4">
                    No interview sessions yet. Start your first interview to see your progress here!
                  </p>
                  <Link
                    to="/setup"
                    className="inline-flex items-center px-4 py-2 bg-light-accent dark:bg-dark-accent text-white rounded-lg hover:opacity-90 transition-opacity"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Your First Interview
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;