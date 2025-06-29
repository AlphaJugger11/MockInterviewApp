import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Setup from './pages/Setup';
import Interview from './pages/Interview';
import Feedback from './pages/Feedback';
import Sessions from './pages/Sessions';
import Settings from './pages/Settings';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        // Check if user is authenticated
        const token = localStorage.getItem('authToken');
        const userId = localStorage.getItem('userId');
        
        console.log('🔍 Checking authentication:', { hasToken: !!token, hasUserId: !!userId });
        
        if (token && userId) {
          // Verify token with backend
          const response = await fetch('http://localhost:3001/api/auth/verify', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          console.log('📡 Token verification response:', response.status);
          
          if (response.ok) {
            const data = await response.json();
            console.log('✅ Token verification successful:', data);
            
            if (data.success && data.user) {
              // Update localStorage with fresh user data
              localStorage.setItem('userId', data.user.id);
              localStorage.setItem('userEmail', data.user.email);
              localStorage.setItem('userName', data.user.name);
              
              setIsAuthenticated(true);
              console.log('✅ User authenticated successfully');
            } else {
              throw new Error('Invalid token response');
            }
          } else {
            throw new Error(`Token verification failed: ${response.status}`);
          }
        } else {
          console.log('❌ No token or userId found');
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('❌ Authentication check failed:', error);
        
        // Clear invalid token data
        localStorage.removeItem('authToken');
        localStorage.removeItem('userId');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userName');
        
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthentication();
  }, []);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-light-primary dark:bg-dark-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-light-accent dark:border-dark-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-light-text-secondary dark:text-dark-text-secondary">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <Router>
        <div className="min-h-screen bg-light-primary dark:bg-dark-primary">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route 
              path="/auth" 
              element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Auth />} 
            />
            
            {/* Protected routes */}
            <Route 
              path="/dashboard" 
              element={isAuthenticated ? <Dashboard /> : <Navigate to="/auth" replace />} 
            />
            <Route 
              path="/setup" 
              element={isAuthenticated ? <Setup /> : <Navigate to="/auth" replace />} 
            />
            <Route 
              path="/interview" 
              element={isAuthenticated ? <Interview /> : <Navigate to="/auth" replace />} 
            />
            <Route 
              path="/feedback/:id" 
              element={isAuthenticated ? <Feedback /> : <Navigate to="/auth" replace />} 
            />
            <Route 
              path="/sessions" 
              element={isAuthenticated ? <Sessions /> : <Navigate to="/auth" replace />} 
            />
            <Route 
              path="/settings" 
              element={isAuthenticated ? <Settings /> : <Navigate to="/auth" replace />} 
            />
            
            {/* Catch all route */}
            <Route 
              path="*" 
              element={<Navigate to={isAuthenticated ? "/dashboard" : "/"} replace />} 
            />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;