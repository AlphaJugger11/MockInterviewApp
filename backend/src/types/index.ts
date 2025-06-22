export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface InterviewSession {
  sessionId: string;
  jobTitle: string;
  company?: string;
  questionType: 'preset' | 'custom';
  selectedPreset?: string;
  customPrompt?: string;
  feedbackMetrics: {
    answerStructure: boolean;
    speechDelivery: boolean;
    bodyLanguage: boolean;
  };
  status: 'generating' | 'ready' | 'in-progress' | 'completed' | 'failed';
  videoUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TavusVideoRequest {
  replica_id: string;
  script: string;
  video_name?: string;
  callback_url?: string;
}

export interface TavusVideoResponse {
  video_id: string;
  status: string;
  download_url?: string;
  stream_url?: string;
}