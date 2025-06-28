import { Request, Response, NextFunction } from 'express';

interface InterviewStartRequest {
  jobTitle: string;
  customPrompt?: string;
  company?: string;
  questionType?: 'preset' | 'custom';
  selectedPreset?: string;
}

interface ConversationRequest {
  jobTitle: string;
  userName: string;
  customInstructions?: string;
  customCriteria?: string;
}

export const validateConversationRequest = (
  req: Request<{}, {}, ConversationRequest>,
  res: Response,
  next: NextFunction
): void => {
  const { jobTitle, userName, customInstructions, customCriteria } = req.body;

  // Validate required fields
  if (!jobTitle || typeof jobTitle !== 'string' || jobTitle.trim().length === 0) {
    res.status(400).json({
      success: false,
      error: 'Job title is required and must be a non-empty string',
    });
    return;
  }

  if (!userName || typeof userName !== 'string' || userName.trim().length === 0) {
    res.status(400).json({
      success: false,
      error: 'User name is required and must be a non-empty string',
    });
    return;
  }

  // Validate job title length
  if (jobTitle.length > 100) {
    res.status(400).json({
      success: false,
      error: 'Job title must be 100 characters or less',
    });
    return;
  }

  // Validate user name length
  if (userName.length > 50) {
    res.status(400).json({
      success: false,
      error: 'User name must be 50 characters or less',
    });
    return;
  }

  // Validate custom instructions length
  if (customInstructions && customInstructions.length > 5000) {
    res.status(400).json({
      success: false,
      error: 'Custom instructions must be 5000 characters or less',
    });
    return;
  }

  // Validate custom criteria length
  if (customCriteria && customCriteria.length > 2000) {
    res.status(400).json({
      success: false,
      error: 'Custom criteria must be 2000 characters or less',
    });
    return;
  }

  next();
};

export const validateInterviewRequest = (
  req: Request<{}, {}, InterviewStartRequest>,
  res: Response,
  next: NextFunction
): void => {
  const { jobTitle, questionType, customPrompt, selectedPreset } = req.body;

  // Validate required fields
  if (!jobTitle || typeof jobTitle !== 'string' || jobTitle.trim().length === 0) {
    res.status(400).json({
      success: false,
      error: 'Job title is required and must be a non-empty string',
    });
    return;
  }

  // Validate question type
  if (questionType && !['preset', 'custom'].includes(questionType)) {
    res.status(400).json({
      success: false,
      error: 'Question type must be either "preset" or "custom"',
    });
    return;
  }

  // Validate preset selection
  if (questionType === 'preset' && (!selectedPreset || selectedPreset.trim().length === 0)) {
    res.status(400).json({
      success: false,
      error: 'Selected preset is required when question type is "preset"',
    });
    return;
  }

  // Validate custom prompt
  if (questionType === 'custom' && (!customPrompt || customPrompt.trim().length === 0)) {
    res.status(400).json({
      success: false,
      error: 'Custom prompt is required when question type is "custom"',
    });
    return;
  }

  // Validate job title length
  if (jobTitle.length > 100) {
    res.status(400).json({
      success: false,
      error: 'Job title must be 100 characters or less',
    });
    return;
  }

  // Validate custom prompt length
  if (customPrompt && customPrompt.length > 2000) {
    res.status(400).json({
      success: false,
      error: 'Custom prompt must be 2000 characters or less',
    });
    return;
  }

  next();
};