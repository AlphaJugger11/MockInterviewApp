import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sun, Moon, Brain } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface NavbarProps {
  isPublic?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ isPublic = false }) => {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const isAuthPage = location.pathname === '/auth';

  return (
    <nav className="bg-light-secondary dark:bg-dark-secondary border-b border-light-border dark:border-dark-border">
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <Brain className="h-8 w-8 text-light-accent dark:text-dark-accent" />
            <span className="font-poppins font-bold text-xl text-light-text-primary dark:text-dark-text-primary">
              Ascend AI
            </span>
          </Link>

          <div className="flex items-center space-x-8">
            {isPublic && (
              <>
                <div className="hidden md:flex space-x-8">
                  <a href="#features" className="text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary transition-colors">
                    Features
                  </a>
                  <a href="#pricing" className="text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary transition-colors">
                    Pricing
                  </a>
                </div>
                <div className="flex items-center space-x-4">
                  {!isAuthPage && (
                    <>
                      <Link
                        to="/auth"
                        className="text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary transition-colors"
                      >
                        Login
                      </Link>
                      <Link
                        to="/auth"
                        className="bg-light-accent dark:bg-dark-accent text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
                      >
                        Sign Up
                      </Link>
                    </>
                  )}
                </div>
              </>
            )}

            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-light-border dark:border-dark-border bg-light-secondary dark:bg-dark-secondary hover:bg-light-primary dark:hover:bg-dark-primary transition-colors"
            >
              {theme === 'light' ? (
                <Moon className="h-5 w-5 text-light-text-primary dark:text-dark-text-primary" />
              ) : (
                <Sun className="h-5 w-5 text-light-text-primary dark:text-dark-text-primary" />
              )}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;