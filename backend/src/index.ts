import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import interviewRoutes from './routes/interview';
import authRoutes from './routes/auth';
import { initializeStorageBuckets, initializeUserTable } from './services/supabaseService';

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));

// Enhanced CORS configuration
app.use(cors({
  origin: [
    'http://localhost:5173', // Vite dev server
    'http://localhost:3000', // Alternative React dev server
    'http://127.0.0.1:5173', // Alternative localhost format
    /^https:\/\/.*\.local-credentialless\.webcontainer-api\.io$/, // WebContainer URLs
    /^https:\/\/.*\.webcontainer-api\.io$/, // WebContainer URLs
    /^https:\/\/.*\.bolt\.new$/, // Bolt.new URLs
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
}));

// Handle preflight requests
app.options('*', cors());

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parsing middleware with increased limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    cors: 'enabled',
    supabase: 'configured',
    authentication: 'enabled'
  });
});

// Test endpoint for frontend connectivity
app.get('/api/test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Backend is connected and working!',
    timestamp: new Date().toISOString(),
    supabase: 'ready',
    authentication: 'ready'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/interview', interviewRoutes);

// 404 handler
app.use(notFound);

// Error handling middleware
app.use(errorHandler);

// Initialize Supabase Storage buckets and user table
const initializeSupabase = async () => {
  try {
    console.log('🔧 Initializing Supabase Storage buckets and user table...');
    await initializeStorageBuckets();
    await initializeUserTable();
    console.log('✅ Supabase initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing Supabase:', error);
    console.warn('⚠️ Server will continue without full Supabase functionality');
  }
};

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Ascend AI Backend Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Test endpoint: http://localhost:${PORT}/api/test`);
  console.log(`🔐 Authentication endpoints: http://localhost:${PORT}/api/auth/*`);
  
  if (process.env.NODE_ENV !== 'production') {
    console.log(`🌐 CORS enabled for WebContainer URLs`);
  }
  
  // Initialize Supabase after server starts
  await initializeSupabase();
});

// Handle server errors
server.on('error', (error: any) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Trying to kill existing process...`);
    process.exit(1);
  } else {
    console.error('❌ Server error:', error);
  }
});

export default app;