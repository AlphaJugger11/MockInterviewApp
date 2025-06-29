import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, User, AlertCircle, CheckCircle } from 'lucide-react';
import Layout from '../components/Layout';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // ENHANCED EMAIL VALIDATION with multiple checks
  const validateEmail = (email: string): { isValid: boolean; error?: string } => {
    const trimmedEmail = email.trim().toLowerCase();
    
    // Basic format check
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmedEmail)) {
      return { isValid: false, error: 'Please enter a valid email format (e.g., user@example.com)' };
    }
    
    // Length check
    if (trimmedEmail.length < 5 || trimmedEmail.length > 254) {
      return { isValid: false, error: 'Email must be between 5 and 254 characters' };
    }
    
    // Domain validation
    const parts = trimmedEmail.split('@');
    if (parts.length !== 2) {
      return { isValid: false, error: 'Email must contain exactly one @ symbol' };
    }
    
    const [localPart, domain] = parts;
    if (localPart.length === 0 || domain.length === 0) {
      return { isValid: false, error: 'Email must have both local and domain parts' };
    }
    
    // Domain must have at least one dot
    if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) {
      return { isValid: false, error: 'Domain must be valid (e.g., example.com)' };
    }
    
    // Check for consecutive dots
    if (trimmedEmail.includes('..')) {
      return { isValid: false, error: 'Email cannot contain consecutive dots' };
    }
    
    // Check for valid characters
    const validChars = /^[a-zA-Z0-9._%+-]+$/;
    if (!validChars.test(localPart)) {
      return { isValid: false, error: 'Email contains invalid characters' };
    }
    
    return { isValid: true };
  };

  // ENHANCED PASSWORD VALIDATION
  const validatePassword = (password: string): { isValid: boolean; error?: string } => {
    if (password.length < 6) {
      return { isValid: false, error: 'Password must be at least 6 characters long' };
    }
    if (password.length > 128) {
      return { isValid: false, error: 'Password must be less than 128 characters' };
    }
    return { isValid: true };
  };

  // ENHANCED NAME VALIDATION
  const validateName = (name: string): { isValid: boolean; error?: string } => {
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      return { isValid: false, error: 'Name must be at least 2 characters long' };
    }
    if (trimmedName.length > 50) {
      return { isValid: false, error: 'Name must be less than 50 characters' };
    }
    if (!/^[a-zA-Z\s'-]+$/.test(trimmedName)) {
      return { isValid: false, error: 'Name can only contain letters, spaces, hyphens, and apostrophes' };
    }
    return { isValid: true };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // STRICT CLIENT-SIDE VALIDATION
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedName = name.trim();

      // Validate email format with detailed error messages
      const emailValidation = validateEmail(trimmedEmail);
      if (!emailValidation.isValid) {
        throw new Error(emailValidation.error);
      }

      // Validate password
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.error);
      }

      // Validate name for registration
      if (!isLogin) {
        const nameValidation = validateName(trimmedName);
        if (!nameValidation.isValid) {
          throw new Error(nameValidation.error);
        }
      }

      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const payload = isLogin 
        ? { email: trimmedEmail, password }
        : { email: trimmedEmail, password, name: trimmedName };

      console.log('🔐 Attempting authentication:', { 
        endpoint, 
        email: trimmedEmail, 
        isLogin,
        emailValid: emailValidation.isValid,
        passwordValid: passwordValidation.isValid,
        nameValid: !isLogin ? validateName(trimmedName).isValid : true
      });

      const response = await fetch(`http://localhost:3001${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response error:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        
        throw new Error(errorData.error || 'Authentication failed');
      }

      const data = await response.json();
      console.log('✅ Authentication response:', data);

      if (data.success && data.token && data.user) {
        // VALIDATE SERVER RESPONSE DATA
        const serverEmailValidation = validateEmail(data.user.email);
        if (!serverEmailValidation.isValid) {
          throw new Error('Invalid email received from server');
        }

        if (!data.user.name || data.user.name.trim().length < 2) {
          throw new Error('Invalid name received from server');
        }

        if (!data.user.id) {
          throw new Error('Invalid user ID received from server');
        }

        // Store user data and token with validated email
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userId', data.user.id);
        localStorage.setItem('userEmail', data.user.email.toLowerCase());
        localStorage.setItem('userName', data.user.name);
        
        console.log('✅ Authentication successful, stored data:', {
          token: data.token.substring(0, 20) + '...',
          userId: data.user.id,
          userEmail: data.user.email.toLowerCase(),
          userName: data.user.name,
          emailValid: serverEmailValidation.isValid
        });
        
        // Navigate to dashboard
        navigate('/dashboard');
      } else {
        throw new Error(data.error || 'Authentication failed - invalid response format');
      }
    } catch (err) {
      console.error('❌ Authentication error:', err);
      setError(err instanceof Error ? err.message : 'Network error. Please check if the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  // Get validation status for real-time feedback
  const emailValidation = validateEmail(email);
  const passwordValidation = validatePassword(password);
  const nameValidation = validateName(name);

  return (
    <Layout isPublic>
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="font-poppins font-bold text-3xl text-light-text-primary dark:text-dark-text-primary">
              {isLogin ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="mt-2 font-inter text-light-text-secondary dark:text-dark-text-secondary">
              {isLogin ? 'Sign in to your account' : 'Start your interview preparation journey'}
            </p>
          </div>

          <div className="bg-light-secondary dark:bg-dark-secondary p-8 rounded-2xl border border-light-border dark:border-dark-border">
            {/* Email Validation Notice */}
            <div className="mb-6 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-blue-600 dark:text-blue-400 text-sm">
                <strong>📧 Valid Email Required:</strong> Please use a real email address for account verification and security.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              {!isLogin && (
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-2">
                    Full Name *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-light-text-secondary dark:text-dark-text-secondary" />
                    </div>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={`block w-full pl-10 pr-10 py-3 border rounded-lg bg-light-primary dark:bg-dark-primary text-light-text-primary dark:text-dark-text-primary placeholder-light-text-secondary dark:placeholder-dark-text-secondary focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent focus:border-transparent ${
                        name && !nameValidation.isValid 
                          ? 'border-red-500 dark:border-red-400' 
                          : name && nameValidation.isValid
                          ? 'border-green-500 dark:border-green-400'
                          : 'border-light-border dark:border-dark-border'
                      }`}
                      placeholder="Enter your full name"
                      required={!isLogin}
                    />
                    {name && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        {nameValidation.isValid ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                    )}
                  </div>
                  {name && !nameValidation.isValid && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                      {nameValidation.error}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-2">
                  Email address *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-light-text-secondary dark:text-dark-text-secondary" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`block w-full pl-10 pr-10 py-3 border rounded-lg bg-light-primary dark:bg-dark-primary text-light-text-primary dark:text-dark-text-primary placeholder-light-text-secondary dark:placeholder-dark-text-secondary focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent focus:border-transparent ${
                      email && !emailValidation.isValid 
                        ? 'border-red-500 dark:border-red-400' 
                        : email && emailValidation.isValid
                        ? 'border-green-500 dark:border-green-400'
                        : 'border-light-border dark:border-dark-border'
                    }`}
                    placeholder="Enter your email (e.g., user@example.com)"
                    required
                  />
                  {email && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      {emailValidation.isValid ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                  )}
                </div>
                {email && !emailValidation.isValid && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {emailValidation.error}
                  </p>
                )}
                {email && emailValidation.isValid && (
                  <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                    ✓ Valid email format
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-2">
                  Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-light-text-secondary dark:text-dark-text-secondary" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`block w-full pl-10 pr-10 py-3 border rounded-lg bg-light-primary dark:bg-dark-primary text-light-text-primary dark:text-dark-text-primary placeholder-light-text-secondary dark:placeholder-dark-text-secondary focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent focus:border-transparent ${
                      password && !passwordValidation.isValid 
                        ? 'border-red-500 dark:border-red-400' 
                        : password && passwordValidation.isValid
                        ? 'border-green-500 dark:border-green-400'
                        : 'border-light-border dark:border-dark-border'
                    }`}
                    placeholder="Enter your password (min 6 characters)"
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-light-text-secondary dark:text-dark-text-secondary" />
                    ) : (
                      <Eye className="h-5 w-5 text-light-text-secondary dark:text-dark-text-secondary" />
                    )}
                  </button>
                </div>
                {password && !passwordValidation.isValid && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {passwordValidation.error}
                  </p>
                )}
                {password && passwordValidation.isValid && (
                  <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                    ✓ Password meets requirements
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !emailValidation.isValid || !passwordValidation.isValid || (!isLogin && !nameValidation.isValid)}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-light-accent dark:bg-dark-accent hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-light-accent dark:focus:ring-dark-accent transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Please wait...' : (isLogin ? 'Sign in' : 'Create account')}
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-light-border dark:border-dark-border" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-light-secondary dark:bg-dark-secondary text-light-text-secondary dark:text-dark-text-secondary">
                    Or continue with
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="w-full flex justify-center items-center py-3 px-4 border border-light-border dark:border-dark-border rounded-lg bg-light-primary dark:bg-dark-primary text-light-text-primary dark:text-dark-text-primary hover:bg-light-secondary dark:hover:bg-dark-secondary transition-colors"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-light-accent dark:text-dark-accent hover:underline"
              >
                {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Auth;