import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Calendar, Settings, User } from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();
  
  // Get user data from localStorage
  const userName = localStorage.getItem('userName') || 'User';
  const userEmail = localStorage.getItem('userEmail') || '';

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/sessions', icon: Calendar, label: 'My Sessions' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="w-64 bg-light-secondary dark:bg-dark-secondary border-r border-light-border dark:border-dark-border h-full">
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-10 h-10 bg-light-accent dark:bg-dark-accent rounded-full flex items-center justify-center">
            <User className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-poppins font-semibold text-light-text-primary dark:text-dark-text-primary">
              {userName}
            </h3>
            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
              {userEmail ? userEmail.substring(0, 20) + (userEmail.length > 20 ? '...' : '') : 'Pro Plan'}
            </p>
          </div>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-light-accent dark:bg-dark-accent text-white'
                    : 'text-light-text-secondary dark:text-dark-text-secondary hover:bg-light-primary dark:hover:bg-dark-primary hover:text-light-text-primary dark:hover:text-dark-text-primary'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;