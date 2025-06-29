import { Request, Response, NextFunction } from 'express';
import { supabase } from '../services/supabaseService';
import CryptoJS from 'crypto-js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-to-something-secure';
const HASH_SECRET = process.env.HASH_SECRET || 'hash-secret-key-change-this';

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

// Register new user
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

    // Validate input
    if (email.length < 3 || !email.includes('@')) {
      res.status(400).json({
        success: false,
        error: 'Please enter a valid email address'
      });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
      return;
    }

    if (name.length < 2) {
      res.status(400).json({
        success: false,
        error: 'Name must be at least 2 characters long'
      });
      return;
    }

    console.log('👤 Registering new user:', { email, name });

    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (existingUser) {
      console.log('❌ User already exists:', email);
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
          email: email.toLowerCase().trim(),
          password_hash: hashedPassword,
          name: name.trim(),
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

// Login user
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

    console.log('🔐 User login attempt:', email);

    // Get user from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name, password_hash')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (userError || !user) {
      console.log('❌ User not found:', email, userError?.message);
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
      console.log('❌ Invalid password for user:', email);
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

// Verify token middleware
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
    
    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
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