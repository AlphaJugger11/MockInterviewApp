import { Request, Response, NextFunction } from 'express';
import { supabase } from '../services/supabaseService';
import CryptoJS from 'crypto-js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-to-something-secure';
const HASH_SECRET = process.env.HASH_SECRET || 'hash-secret-key-change-this';

// Enhanced email validation function
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

// Hash password using crypto-js (WebContainer compatible)
const hashPassword = (password: string): string => {
  return CryptoJS.PBKDF2(password, HASH_SECRET, {
    keySize: 256/32,
    iterations: 10000
  }).toString();
};

// Verify password
const verifyPassword = (password: string, hashedPassword: string): boolean => {
  const hash = hashPassword(password);
  return hash === hashedPassword;
};

// Register new user with ENHANCED VALIDATION
export const registerUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password, name } = req.body;
    
    console.log('👤 Registration attempt:', { email, name, hasPassword: !!password });
    
    if (!email || !password || !name) {
      res.status(400).json({
        success: false,
        error: 'Email, password, and name are required'
      });
      return;
    }

    // ENHANCED EMAIL VALIDATION
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      console.log('❌ Invalid email format:', email, emailValidation.error);
      res.status(400).json({
        success: false,
        error: emailValidation.error
      });
      return;
    }

    // ENHANCED PASSWORD VALIDATION
    if (password.length < 6) {
      res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
      return;
    }

    if (password.length > 128) {
      res.status(400).json({
        success: false,
        error: 'Password must be less than 128 characters'
      });
      return;
    }

    // ENHANCED NAME VALIDATION
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      res.status(400).json({
        success: false,
        error: 'Name must be at least 2 characters long'
      });
      return;
    }

    if (trimmedName.length > 50) {
      res.status(400).json({
        success: false,
        error: 'Name must be less than 50 characters'
      });
      return;
    }

    if (!/^[a-zA-Z\s'-]+$/.test(trimmedName)) {
      res.status(400).json({
        success: false,
        error: 'Name can only contain letters, spaces, hyphens, and apostrophes'
      });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    console.log('👤 Registering new user with validated data:', { email: cleanEmail, name: trimmedName });

    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', cleanEmail)
      .single();

    if (existingUser) {
      console.log('❌ User already exists:', cleanEmail);
      res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
      return;
    }

    // Hash password using crypto-js
    const hashedPassword = hashPassword(password);
    console.log('🔐 Password hashed successfully');

    // Insert user into database
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([
        {
          email: cleanEmail,
          password_hash: hashedPassword,
          name: trimmedName,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error creating user:', insertError);
      
      if (insertError.message.includes('duplicate key') || insertError.message.includes('unique')) {
        res.status(400).json({
          success: false,
          error: 'User with this email already exists'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to create user account. Please try again.'
        });
      }
      return;
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ User registered successfully:', { id: newUser.id, email: newUser.email });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name
      },
      token
    });

  } catch (error) {
    console.error('❌ Error in registerUser:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error. Please try again.'
    });
  }
};

// Login user with ENHANCED VALIDATION
export const loginUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;
    
    console.log('🔐 Login attempt:', { email, hasPassword: !!password });
    
    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
      return;
    }

    // ENHANCED EMAIL VALIDATION
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      console.log('❌ Invalid email format during login:', email, emailValidation.error);
      res.status(400).json({
        success: false,
        error: emailValidation.error
      });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    console.log('🔐 User login attempt with validated email:', cleanEmail);

    // Get user from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name, password_hash')
      .eq('email', cleanEmail)
      .single();

    if (userError || !user) {
      console.log('❌ User not found:', cleanEmail, userError?.message);
      res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
      return;
    }

    console.log('👤 User found:', { id: user.id, email: user.email });

    // Verify password using crypto-js
    const isPasswordValid = verifyPassword(password, user.password_hash);
    
    if (!isPasswordValid) {
      console.log('❌ Invalid password for user:', cleanEmail);
      res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
      return;
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ User logged in successfully:', { id: user.id, email: user.email });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      token
    });

  } catch (error) {
    console.error('❌ Error in loginUser:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error. Please try again.'
    });
  }
};

// Verify token middleware with ENHANCED VALIDATION
export const verifyToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');
    
    console.log('🔍 Token verification attempt:', { hasAuthHeader: !!authHeader, hasToken: !!token });
    
    if (!token) {
      res.status(401).json({
        success: false,
        error: 'No token provided'
      });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    console.log('🔓 Token decoded:', { userId: decoded.userId, email: decoded.email });
    
    // VALIDATE EMAIL FROM TOKEN
    const emailValidation = validateEmail(decoded.email);
    if (!emailValidation.isValid) {
      console.log('❌ Invalid email in token:', decoded.email);
      res.status(401).json({
        success: false,
        error: 'Invalid token - email format invalid'
      });
      return;
    }
    
    // Get user from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('id', decoded.userId)
      .single();

    if (userError || !user) {
      console.log('❌ Invalid token for user:', decoded.userId, userError?.message);
      res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
      return;
    }

    // VALIDATE EMAIL FROM DATABASE
    const dbEmailValidation = validateEmail(user.email);
    if (!dbEmailValidation.isValid) {
      console.log('❌ Invalid email in database:', user.email);
      res.status(401).json({
        success: false,
        error: 'Invalid user data'
      });
      return;
    }

    console.log('✅ Token verified successfully:', { id: user.id, email: user.email });

    // Add user to request object
    (req as any).user = user;
    next();

  } catch (error) {
    console.error('❌ Error verifying token:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
};

// Get current user
export const getCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = (req as any).user;
    
    console.log('👤 Getting current user:', { id: user.id, email: user.email });
    
    // VALIDATE USER EMAIL BEFORE RETURNING
    const emailValidation = validateEmail(user.email);
    if (!emailValidation.isValid) {
      console.log('❌ Invalid email for current user:', user.email);
      res.status(400).json({
        success: false,
        error: 'Invalid user email data'
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email.toLowerCase(),
        name: user.name
      }
    });

  } catch (error) {
    console.error('❌ Error in getCurrentUser:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};