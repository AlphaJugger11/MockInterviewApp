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

// Load environment variables

const app = express();
const PORT = process.env.PORT || 3001;
// console.log(`TAVUS_API_KEY: ${process.env.TAVUS_API_ KEY}`); // Debugging line to check if the API key is loaded
// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:5173', // Vite dev server
    'http://localhost:3000', // Alternative React dev server
    'http://127.0.0.1:5173', // Alternative localhost format
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API routes
app.use('/api/interview', interviewRoutes);

// 404 handler
app.use(notFound);

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Ascend AI Backend Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  
  if (process.env.NODE_ENV !== 'production') {
    console.log(`🌐 CORS enabled for: http://localhost:5173`);
  }
});

export default app;