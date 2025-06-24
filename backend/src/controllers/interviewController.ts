// src/pages/Setup.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// ... other imports from your project

const Setup = () => {
  const navigate = useNavigate();
  const [jobTitle, setJobTitle] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:3001/api/interview/create-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Send the user's input to the backend
        body: JSON.stringify({ jobTitle, customInstructions }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create conversation session.');
      }

      const { conversationUrl } = await response.json();
      localStorage.setItem('conversationUrl', conversationUrl);
      navigate('/interview');
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // Your full, styled JSX for the form goes here.
    // Ensure you have an <input> that sets the 'jobTitle'
    // and a <textarea> that sets the 'customInstructions'.
    // Here is a basic functional example:
    <div style={{ padding: '2rem', color: 'white', background: '#121212', minHeight: '100vh' }}>
      <h1>Set Up Your Mock Interview</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '500px' }}>
        <div>
          <label>Job Title You're Practicing For *</label>
          <input 
            type="text" 
            value={jobTitle} 
            onChange={(e) => setJobTitle(e.target.value)} 
            required 
            style={{ width: '100%', padding: '8px', background: '#333', border: '1px solid #555', borderRadius: '4px', color: 'white' }}
          />
        </div>
        <div>
          <label>Custom Instructions (Optional)</label>
          <textarea 
            rows={5}
            value={customInstructions} 
            onChange={(e) => setCustomInstructions(e.target.value)} 
            placeholder="Optional: Define the AI's personality, questions, etc."
            style={{ width: '100%', padding: '8px', background: '#333', border: '1px solid #555', borderRadius: '4px', color: 'white' }}
          />
        </div>
        {error && <p style={{ color: 'red' }}>Error: {error}</p>}
        <button type="submit" disabled={isLoading} style={{ padding: '10px', background: 'green', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          {isLoading ? 'Initializing...' : 'Begin Interview'}
        </button>
      </form>
    </div>
  );
};

export default Setup;