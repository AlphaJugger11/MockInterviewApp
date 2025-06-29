import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Eye, Download } from 'lucide-react';
import Layout from '../components/Layout';

interface UserSession {
  id: string;
  role: string;
  company: string;
  date: string;
  duration: string;
  transcriptUrl?: string;
  conversationId: string;
}

const Sessions = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [userSessions, setUserSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);

  // Get user data from localStorage
  const userId = localStorage.getItem('userId');
  const userName = localStorage.getItem('userName') || 'User';

  useEffect(() => {
    const loadUserSessions = async () => {
      try {
        setLoading(true);
        
        // Load sessions from localStorage (in a real app, this would come from the database)
        const sessions: UserSession[] = [];
        
        // Check for stored session data
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('session_')) {
            try {
              const sessionData = JSON.parse(localStorage.getItem(key) || '{}');
              if (sessionData.jobTitle && sessionData.userName) {
                sessions.push({
                  id: sessionData.conversationId || key.replace('session_', ''),
                  role: sessionData.jobTitle,
                  company: sessionData.company || 'Not specified',
                  date: new Date(sessionData.endTime || sessionData.timestamp || Date.now()).toLocaleDateString(),
                  duration: sessionData.duration ? `${Math.floor(sessionData.duration / 60)}:${(sessionData.duration % 60).toString().padStart(2, '0')}` : 'Unknown',
                  conversationId: sessionData.conversationId || key.replace('session_', ''),
                  transcriptUrl: sessionData.userTranscriptUrl
                });
              }
            } catch (error) {
              console.warn('Error parsing session data:', error);
            }
          }
        }
        
        // Sort by date (newest first)
        sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        setUserSessions(sessions);
        console.log('📋 Loaded user sessions:', sessions);
        
      } catch (error) {
        console.error('❌ Error loading user sessions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserSessions();
  }, [userId]);

  const filteredSessions = userSessions
    .filter(session => {
      const matchesSearch = session.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           session.company.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else if (sortBy === 'role') {
        return a.role.localeCompare(b.role);
      }
      return 0;
    });

  const downloadTranscript = async (session: UserSession) => {
    try {
      // Try to get transcript from localStorage first
      const storedTranscript = localStorage.getItem(`transcript_${session.conversationId}`);
      
      if (storedTranscript) {
        const transcriptData = JSON.parse(storedTranscript);
        
        if (transcriptData.length === 0) {
          alert('No transcript data available for this session.');
          return;
        }
        
        // Format transcript for download
        const formattedTranscript = transcriptData.map((event: any) => {
          const speaker = event.participant === 'ai' ? 'Interviewer (Sarah)' : `Candidate (${userName})`;
          const timestamp = new Date(event.timestamp).toLocaleTimeString();
          return `[${timestamp}] ${speaker}: ${event.content}`;
        }).join('\n\n');
        
        // Add header
        const header = `INTERVIEW TRANSCRIPT
===================
Candidate: ${userName}
Job Title: ${session.role}
Company: ${session.company}
Date: ${session.date}
Duration: ${session.duration}
Conversation ID: ${session.conversationId}
Events Count: ${transcriptData.length}

TRANSCRIPT:
===========

`;
        
        const fullTranscript = header + formattedTranscript;
        
        // Create and trigger download
        const blob = new Blob([fullTranscript], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `interview-transcript-${session.role.replace(/\s+/g, '-')}-${session.date.replace(/\//g, '-')}.txt`;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Cleanup
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        
        console.log('📄 Transcript download triggered successfully');
      } else {
        alert('No transcript data available for this session.');
      }
    } catch (error) {
      console.error('❌ Error downloading transcript:', error);
      alert('Error downloading transcript. Please try again.');
    }
  };

  if (loading) {
    return (
      <Layout showSidebar>
        <div className="p-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-light-accent dark:border-dark-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-light-text-secondary dark:text-dark-text-secondary">Loading your sessions...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showSidebar>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="font-poppins font-bold text-3xl text-light-text-primary dark:text-dark-text-primary mb-2">
            My Interview Sessions
          </h1>
          <p className="font-inter text-light-text-secondary dark:text-dark-text-secondary">
            Review your past interview transcripts and performance history.
          </p>
        </div>

        {/* Filters and Search */}
        <div className="bg-light-secondary dark:bg-dark-secondary rounded-xl p-6 border border-light-border dark:border-dark-border mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-light-text-secondary dark:text-dark-text-secondary" />
              <input
                type="text"
                placeholder="Search by role or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-light-border dark:border-dark-border rounded-lg bg-light-primary dark:bg-dark-primary text-light-text-primary dark:text-dark-text-primary placeholder-light-text-secondary dark:placeholder-dark-text-secondary focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent focus:border-transparent"
              />
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-3 border border-light-border dark:border-dark-border rounded-lg bg-light-primary dark:bg-dark-primary text-light-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent focus:border-transparent appearance-none cursor-pointer"
            >
              <option value="date">Sort by Date</option>
              <option value="role">Sort by Role</option>
            </select>
          </div>
        </div>

        {/* Sessions Table */}
        <div className="bg-light-secondary dark:bg-dark-secondary rounded-xl border border-light-border dark:border-dark-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-light-primary dark:bg-dark-primary border-b border-light-border dark:border-dark-border">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                    Role & Company
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                    Duration
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light-border dark:divide-dark-border">
                {filteredSessions.map((session) => (
                  <tr key={session.id} className="hover:bg-light-primary dark:hover:bg-dark-primary transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-light-text-primary dark:text-dark-text-primary">
                          {session.role}
                        </p>
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                          {session.company}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-light-text-primary dark:text-dark-text-primary">
                      {session.date}
                    </td>
                    <td className="px-6 py-4 text-sm text-light-text-primary dark:text-dark-text-primary">
                      {session.duration}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => downloadTranscript(session)}
                          className="inline-flex items-center px-3 py-1 bg-light-accent dark:bg-dark-accent text-white text-sm rounded-md hover:opacity-90 transition-opacity"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download Transcript
                        </button>
                        <Link
                          to={`/feedback/${session.id}`}
                          className="inline-flex items-center px-3 py-1 bg-green-500 text-white text-sm rounded-md hover:opacity-90 transition-opacity"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Analysis
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredSessions.length === 0 && (
            <div className="text-center py-12">
              <p className="text-light-text-secondary dark:text-dark-text-secondary">
                {userSessions.length === 0 
                  ? "No interview sessions found. Start your first interview to see it here!"
                  : "No sessions found matching your search criteria."
                }
              </p>
              {userSessions.length === 0 && (
                <Link
                  to="/setup"
                  className="inline-flex items-center mt-4 px-4 py-2 bg-light-accent dark:bg-dark-accent text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  Start Your First Interview
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Sessions Summary */}
        {userSessions.length > 0 && (
          <div className="mt-8 grid md:grid-cols-3 gap-6">
            <div className="bg-light-secondary dark:bg-dark-secondary p-6 rounded-xl border border-light-border dark:border-dark-border text-center">
              <h3 className="font-poppins font-semibold text-lg text-light-text-primary dark:text-dark-text-primary mb-2">
                Total Sessions
              </h3>
              <p className="text-3xl font-bold text-light-accent dark:text-dark-accent">
                {userSessions.length}
              </p>
            </div>

            <div className="bg-light-secondary dark:bg-dark-secondary p-6 rounded-xl border border-light-border dark:border-dark-border text-center">
              <h3 className="font-poppins font-semibold text-lg text-light-text-primary dark:text-dark-text-primary mb-2">
                Most Recent
              </h3>
              <p className="text-lg font-bold text-light-accent dark:text-dark-accent">
                {userSessions[0]?.role || 'None'}
              </p>
            </div>

            <div className="bg-light-secondary dark:bg-dark-secondary p-6 rounded-xl border border-light-border dark:border-dark-border text-center">
              <h3 className="font-poppins font-semibold text-lg text-light-text-primary dark:text-dark-text-primary mb-2">
                This Month
              </h3>
              <p className="text-3xl font-bold text-light-accent dark:text-dark-accent">
                {userSessions.filter(session => {
                  const sessionDate = new Date(session.date);
                  const now = new Date();
                  return sessionDate.getMonth() === now.getMonth() && sessionDate.getFullYear() === now.getFullYear();
                }).length}
              </p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Sessions;