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
  const [hasVisitedLanding, setHasVisitedLanding] = useState(false);

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        // Check if user has visited landing page
        const visitedLanding = localStorage.getItem('visitedLanding') === 'true';
        setHasVisitedLanding(visitedLanding);

        // Check if user is authenticated
        const token = localStorage.getItem('authToken');
        const userId = localStorage.getItem('userId');
        const userEmail = localStorage.getItem('userEmail');
        
        console.log('🔍 Checking authentication:', { 
          hasToken: !!token, 
          hasUserId: !!userId, 
          hasEmail: !!userEmail,
          email: userEmail,
          visitedLanding
        });
        
        // STRICT VALIDATION: All required data must be present
        if (token && userId && userEmail) {
          // VALIDATE EMAIL FORMAT STRICTLY
          const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
          if (!emailRegex.test(userEmail)) {
            console.error('❌ Invalid email format in localStorage:', userEmail);
            throw new Error('Invalid email format');
          }
          
          // Additional email validation checks
          if (userEmail.length < 5 || userEmail.length > 254) {
            console.error('❌ Email length invalid:', userEmail.length);
            throw new Error('Invalid email length');
          }

          if (!userEmail.includes('.') || userEmail.startsWith('.') || userEmail.endsWith('.')) {
            console.error('❌ Email format invalid:', userEmail);
            throw new Error('Invalid email format');
          }
          
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
            
            if (data.success && data.user && data.user.email) {
              // VALIDATE EMAIL FROM SERVER RESPONSE
              if (!emailRegex.test(data.user.email)) {
                console.error('❌ Invalid email format from server:', data.user.email);
                throw new Error('Invalid email format from server');
              }
              
              // Additional server email validation
              if (data.user.email.toLowerCase() !== userEmail.toLowerCase()) {
                console.error('❌ Email mismatch between local and server:', { local: userEmail, server: data.user.email });
                throw new Error('Email mismatch');
              }
              
              // Update localStorage with fresh user data
              localStorage.setItem('userId', data.user.id);
              localStorage.setItem('userEmail', data.user.email.toLowerCase());
              localStorage.setItem('userName', data.user.name);
              
              setIsAuthenticated(true);
              console.log('✅ User authenticated successfully with valid email');
            } else {
              throw new Error('Invalid token response');
            }
          } else {
            throw new Error(`Token verification failed: ${response.status}`);
          }
        } else {
          console.log('❌ Missing authentication data');
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('❌ Authentication check failed:', error);
        
        // Clear ALL authentication data on any error
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
          <p className="text-light-text-secondary dark:text-dark-text-secondary">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <Router>
        <div className="min-h-screen bg-light-primary dark:bg-dark-primary">
          <Routes>
            {/* ALWAYS start at landing page for new users */}
            <Route 
              path="/" 
              element={
                isAuthenticated && hasVisitedLanding ? 
                  <Navigate to="/dashboard" replace /> : 
                  <Landing />
              } 
            />
            
            {/* Authentication route */}
            <Route 
              path="/auth" 
              element={
                isAuthenticated ? 
                  <Navigate to="/dashboard" replace /> : 
                  <Auth />
              } 
            />
            
            {/* Protected routes - require authentication AND landing page visit */}
            <Route 
              path="/dashboard" 
              element={
                isAuthenticated && hasVisitedLanding ? 
                  <Dashboard /> : 
                  <Navigate to={isAuthenticated ? "/" : "/auth"} replace />
              } 
            />
            <Route 
              path="/setup" 
              element={
                isAuthenticated && hasVisitedLanding ? 
                  <Setup /> : 
                  <Navigate to={isAuthenticated ? "/" : "/auth"} replace />
              } 
            />
            <Route 
              path="/interview" 
              element={
                isAuthenticated && hasVisitedLanding ? 
                  <Interview /> : 
                  <Navigate to={isAuthenticated ? "/" : "/auth"} replace />
              } 
            />
            <Route 
              path="/feedback/:id" 
              element={
                isAuthenticated && hasVisitedLanding ? 
                  <Feedback /> : 
                  <Navigate to={isAuthenticated ? "/" : "/auth"} replace />
              } 
            />
            <Route 
              path="/sessions" 
              element={
                isAuthenticated && hasVisitedLanding ? 
                  <Sessions /> : 
                  <Navigate to={isAuthenticated ? "/" : "/auth"} replace />
              } 
            />
            <Route 
              path="/settings" 
              element={
                isAuthenticated && hasVisitedLanding ? 
                  <Settings /> : 
                  <Navigate to={isAuthenticated ? "/" : "/auth"} replace />
              } 
            />
            
            {/* Catch all route - redirect to landing page */}
            <Route 
              path="*" 
              element={<Navigate to="/" replace />} 
            />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;