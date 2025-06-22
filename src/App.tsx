import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
  return (
    <ThemeProvider>
      <Router>
        <div className="min-h-screen bg-light-primary dark:bg-dark-primary">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/setup" element={<Setup />} />
            <Route path="/interview" element={<Interview />} />
            <Route path="/feedback/:id" element={<Feedback />} />
            <Route path="/sessions" element={<Sessions />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;