import React, { useState } from 'react';
import { User, Palette, CreditCard, Sun, Moon } from 'lucide-react';
import Layout from '../components/Layout';
import { useTheme } from '../contexts/ThemeContext';

const Settings = () => {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState({
    name: 'John Doe',
    email: 'john.doe@example.com',
  });

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'billing', label: 'Billing', icon: CreditCard },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="font-poppins font-semibold text-xl text-light-text-primary dark:text-dark-text-primary mb-4">
                Profile Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="w-full px-4 py-3 border border-light-border dark:border-dark-border rounded-lg bg-light-primary dark:bg-dark-primary text-light-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="w-full px-4 py-3 border border-light-border dark:border-dark-border rounded-lg bg-light-primary dark:bg-dark-primary text-light-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent focus:border-transparent"
                  />
                </div>
                <button className="px-6 py-3 bg-light-accent dark:bg-dark-accent text-white rounded-lg hover:opacity-90 transition-opacity">
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="font-poppins font-semibold text-xl text-light-text-primary dark:text-dark-text-primary mb-4">
                Theme Preferences
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-light-secondary dark:bg-dark-secondary rounded-lg border border-light-border dark:border-dark-border">
                  <div className="flex items-center space-x-3">
                    {theme === 'light' ? (
                      <Sun className="h-5 w-5 text-light-text-primary dark:text-dark-text-primary" />
                    ) : (
                      <Moon className="h-5 w-5 text-light-text-primary dark:text-dark-text-primary" />
                    )}
                    <div>
                      <h4 className="font-medium text-light-text-primary dark:text-dark-text-primary">
                        Theme Mode
                      </h4>
                      <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                        Currently using {theme} mode
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={toggleTheme}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent focus:ring-offset-2 ${
                      theme === 'dark'
                        ? 'bg-light-accent dark:bg-dark-accent'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'billing':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="font-poppins font-semibold text-xl text-light-text-primary dark:text-dark-text-primary mb-4">
                Billing Information
              </h3>
              <div className="bg-light-secondary dark:bg-dark-secondary p-6 rounded-lg border border-light-border dark:border-dark-border">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-medium text-light-text-primary dark:text-dark-text-primary">
                      Current Plan: Pro
                    </h4>
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                      $29/month • Next billing: February 15, 2024
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-light-accent dark:bg-dark-accent text-white text-sm rounded-full">
                    Active
                  </span>
                </div>
                <div className="space-y-3">
                  <button className="w-full md:w-auto px-6 py-3 bg-light-accent dark:bg-dark-accent text-white rounded-lg hover:opacity-90 transition-opacity">
                    Manage Billing
                  </button>
                  <button className="w-full md:w-auto px-6 py-3 border border-light-border dark:border-dark-border text-light-text-primary dark:text-dark-text-primary rounded-lg hover:bg-light-primary dark:hover:bg-dark-primary transition-colors ml-0 md:ml-3">
                    Download Invoice
                  </button>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-light-text-primary dark:text-dark-text-primary mb-4">
                Plan Features
              </h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-light-text-primary dark:text-dark-text-primary">Unlimited mock interviews</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-light-text-primary dark:text-dark-text-primary">Advanced AI feedback</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-light-text-primary dark:text-dark-text-primary">Body language analysis</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-light-text-primary dark:text-dark-text-primary">Performance analytics</span>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Layout showSidebar>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="font-poppins font-bold text-3xl text-light-text-primary dark:text-dark-text-primary mb-2">
            Settings
          </h1>
          <p className="font-inter text-light-text-secondary dark:text-dark-text-secondary">
            Manage your account preferences and billing information.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Tabs */}
          <div className="lg:w-64">
            <nav className="space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors text-left ${
                    activeTab === tab.id
                      ? 'bg-light-accent dark:bg-dark-accent text-white'
                      : 'text-light-text-secondary dark:text-dark-text-secondary hover:bg-light-secondary dark:hover:bg-dark-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary'
                  }`}
                >
                  <tab.icon className="h-5 w-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content Area */}
          <div className="flex-1">
            <div className="bg-light-secondary dark:bg-dark-secondary rounded-xl p-6 border border-light-border dark:border-dark-border">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;