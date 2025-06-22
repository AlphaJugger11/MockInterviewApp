import { Request, Response } from 'express';

export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found`,
    availableRoutes: [
      'GET /health',
      'POST /api/interview/start',
      'GET /api/interview/status/:sessionId',
      'POST /api/interview/end',
    ],
  });
};