import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Eye } from 'lucide-react';
import Layout from '../components/Layout';
import { mockSessions } from '../data/mockData';

const Sessions = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('date');

  const filteredSessions = mockSessions
    .filter(session => {
      const matchesSearch = session.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           session.company.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterStatus === 'all' || session.status === filterStatus;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else if (sortBy === 'score') {
        return b.score - a.score;
      }
      return 0;
    });

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600 dark:text-green-400';
    if (score >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = 'px-2 py-1 rounded-full text-xs font-medium';
    switch (status) {
      case 'completed':
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400`;
      case 'in-progress':
        return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400`;
      case 'scheduled':
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400`;
    }
  };

  return (
    <Layout showSidebar>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="font-poppins font-bold text-3xl text-light-text-primary dark:text-dark-text-primary mb-2">
            My Interview Sessions
          </h1>
          <p className="font-inter text-light-text-secondary dark:text-dark-text-secondary">
            Review and analyze your past interview performances.
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

            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-light-text-secondary dark:text-dark-text-secondary" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="pl-10 pr-8 py-3 border border-light-border dark:border-dark-border rounded-lg bg-light-primary dark:bg-dark-primary text-light-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent focus:border-transparent appearance-none cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="in-progress">In Progress</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-3 border border-light-border dark:border-dark-border rounded-lg bg-light-primary dark:bg-dark-primary text-light-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent focus:border-transparent appearance-none cursor-pointer"
            >
              <option value="date">Sort by Date</option>
              <option value="score">Sort by Score</option>
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
                    Score
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
                    Status
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
                      {new Date(session.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm text-light-text-primary dark:text-dark-text-primary">
                      {session.duration}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-lg font-bold ${getScoreColor(session.score)}`}>
                        {session.score}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={getStatusBadge(session.status)}>
                        {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        to={`/feedback/${session.id}`}
                        className="inline-flex items-center px-3 py-1 bg-light-accent dark:bg-dark-accent text-white text-sm rounded-md hover:opacity-90 transition-opacity"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Feedback
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredSessions.length === 0 && (
            <div className="text-center py-12">
              <p className="text-light-text-secondary dark:text-dark-text-secondary">
                No sessions found matching your criteria.
              </p>
            </div>
          )}
        </div>

        {/* Sessions Summary */}
        <div className="mt-8 grid md:grid-cols-3 gap-6">
          <div className="bg-light-secondary dark:bg-dark-secondary p-6 rounded-xl border border-light-border dark:border-dark-border text-center">
            <h3 className="font-poppins font-semibold text-lg text-light-text-primary dark:text-dark-text-primary mb-2">
              Total Sessions
            </h3>
            <p className="text-3xl font-bold text-light-accent dark:text-dark-accent">
              {mockSessions.length}
            </p>
          </div>

          <div className="bg-light-secondary dark:bg-dark-secondary p-6 rounded-xl border border-light-border dark:border-dark-border text-center">
            <h3 className="font-poppins font-semibold text-lg text-light-text-primary dark:text-dark-text-primary mb-2">
              Average Score
            </h3>
            <p className="text-3xl font-bold text-light-accent dark:text-dark-accent">
              {Math.round(mockSessions.reduce((acc, session) => acc + session.score, 0) / mockSessions.length)}%
            </p>
          </div>

          <div className="bg-light-secondary dark:bg-dark-secondary p-6 rounded-xl border border-light-border dark:border-dark-border text-center">
            <h3 className="font-poppins font-semibold text-lg text-light-text-primary dark:text-dark-text-primary mb-2">
              Best Score
            </h3>
            <p className="text-3xl font-bold text-light-accent dark:text-dark-accent">
              {Math.max(...mockSessions.map(s => s.score))}%
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Sessions;