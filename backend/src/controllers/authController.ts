import { Request, Response, NextFunction } from 'express';
import { supabase } from '../services/supabaseService';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Register new user
export const registerUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password || !name) {
      res.status(400).json({
        success: false,
        error: 'Email, password, and name are required'
      });
      return;
    }

    console.log('👤 Registering new user:', { email, name });

    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
      return;
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert user into database
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([
        {
          email: email.toLowerCase().trim(),
          password_hash: hashedPassword,
          name: name.trim(),
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error creating user:', insertError);
      res.status(500).json({
        success: false,
        error: 'Failed to create user account'
      });
      return;
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ User registered successfully:', newUser.id);

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
      error: 'Internal server error'
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
      res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
      return;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isPasswordValid) {
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

    console.log('✅ User logged in successfully:', user.id);

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
      error: 'Internal server error'
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
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      res.status(401).json({
        success: false,
        error: 'No token provided'
      });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Get user from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('id', decoded.userId)
      .single();

    if (userError || !user) {
      res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
      return;
    }

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