// Utility functions for managing session data in browser storage

export interface SessionData {
  conversationId: string;
  userName: string;
  jobTitle: string;
  company?: string;
  transcript: ConversationEvent[];
  metrics: SpeechMetric[];
  recording?: string;
  duration: number;
  startTime: string;
  endTime?: string;
  analysisData?: any;
}

export interface ConversationEvent {
  timestamp: string;
  type: string;
  content: string;
  participant: string;
  sessionId: string;
}

export interface SpeechMetric {
  timestamp: string;
  audioLevel?: number;
  speaking?: boolean;
  sessionId: string;
}

export class SessionStorageManager {
  private static readonly STORAGE_PREFIX = 'ascend_ai_';
  
  // Store session data
  static storeSession(sessionData: SessionData): void {
    try {
      const key = `${this.STORAGE_PREFIX}session_${sessionData.conversationId}`;
      localStorage.setItem(key, JSON.stringify(sessionData));
      console.log('✅ Session data stored:', sessionData.conversationId);
    } catch (error) {
      console.error('❌ Error storing session data:', error);
    }
  }
  
  // Retrieve session data
  static getSession(conversationId: string): SessionData | null {
    try {
      const key = `${this.STORAGE_PREFIX}session_${conversationId}`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('❌ Error retrieving session data:', error);
      return null;
    }
  }
  
  // Store conversation transcript
  static storeTranscript(conversationId: string, transcript: ConversationEvent[]): void {
    try {
      const key = `${this.STORAGE_PREFIX}transcript_${conversationId}`;
      localStorage.setItem(key, JSON.stringify(transcript));
      console.log('📝 Transcript stored for:', conversationId);
    } catch (error) {
      console.error('❌ Error storing transcript:', error);
    }
  }
  
  // Retrieve conversation transcript
  static getTranscript(conversationId: string): ConversationEvent[] {
    try {
      const key = `${this.STORAGE_PREFIX}transcript_${conversationId}`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('❌ Error retrieving transcript:', error);
      return [];
    }
  }
  
  // Store speech metrics
  static storeMetrics(conversationId: string, metrics: SpeechMetric[]): void {
    try {
      const key = `${this.STORAGE_PREFIX}metrics_${conversationId}`;
      localStorage.setItem(key, JSON.stringify(metrics));
      console.log('📊 Metrics stored for:', conversationId);
    } catch (error) {
      console.error('❌ Error storing metrics:', error);
    }
  }
  
  // Retrieve speech metrics
  static getMetrics(conversationId: string): SpeechMetric[] {
    try {
      const key = `${this.STORAGE_PREFIX}metrics_${conversationId}`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('❌ Error retrieving metrics:', error);
      return [];
    }
  }
  
  // Store recording blob
  static storeRecording(conversationId: string, recordingBlob: Blob): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();
        reader.onload = () => {
          const base64Data = reader.result as string;
          const key = `${this.STORAGE_PREFIX}recording_${conversationId}`;
          const metadataKey = `${this.STORAGE_PREFIX}recording_meta_${conversationId}`;
          
          localStorage.setItem(key, base64Data);
          localStorage.setItem(metadataKey, JSON.stringify({
            size: recordingBlob.size,
            type: recordingBlob.type,
            timestamp: new Date().toISOString()
          }));
          
          console.log('📹 Recording stored for:', conversationId);
          resolve();
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(recordingBlob);
      } catch (error) {
        console.error('❌ Error storing recording:', error);
        reject(error);
      }
    });
  }
  
  // Retrieve recording URL
  static getRecording(conversationId: string): string | null {
    try {
      const key = `${this.STORAGE_PREFIX}recording_${conversationId}`;
      return localStorage.getItem(key);
    } catch (error) {
      console.error('❌ Error retrieving recording:', error);
      return null;
    }
  }
  
  // Get all user sessions
  static getAllSessions(): SessionData[] {
    try {
      const sessions: SessionData[] = [];
      const prefix = `${this.STORAGE_PREFIX}session_`;
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          const data = localStorage.getItem(key);
          if (data) {
            sessions.push(JSON.parse(data));
          }
        }
      }
      
      // Sort by start time (newest first)
      return sessions.sort((a, b) => 
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );
    } catch (error) {
      console.error('❌ Error retrieving all sessions:', error);
      return [];
    }
  }
  
  // Delete session data
  static deleteSession(conversationId: string): void {
    try {
      const keys = [
        `${this.STORAGE_PREFIX}session_${conversationId}`,
        `${this.STORAGE_PREFIX}transcript_${conversationId}`,
        `${this.STORAGE_PREFIX}metrics_${conversationId}`,
        `${this.STORAGE_PREFIX}recording_${conversationId}`,
        `${this.STORAGE_PREFIX}recording_meta_${conversationId}`
      ];
      
      keys.forEach(key => localStorage.removeItem(key));
      console.log('🗑️ Session data deleted for:', conversationId);
    } catch (error) {
      console.error('❌ Error deleting session data:', error);
    }
  }
  
  // Clear all session data (for logout or reset)
  static clearAllSessions(): void {
    try {
      const keysToDelete: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.STORAGE_PREFIX)) {
          keysToDelete.push(key);
        }
      }
      
      keysToDelete.forEach(key => localStorage.removeItem(key));
      console.log('🧹 All session data cleared');
    } catch (error) {
      console.error('❌ Error clearing session data:', error);
    }
  }
  
  // Get storage usage statistics
  static getStorageStats(): { totalSessions: number; totalSize: number; recordings: number } {
    try {
      let totalSessions = 0;
      let totalSize = 0;
      let recordings = 0;
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.STORAGE_PREFIX)) {
          const data = localStorage.getItem(key);
          if (data) {
            totalSize += data.length;
            
            if (key.includes('session_')) totalSessions++;
            if (key.includes('recording_')) recordings++;
          }
        }
      }
      
      return { totalSessions, totalSize, recordings };
    } catch (error) {
      console.error('❌ Error getting storage stats:', error);
      return { totalSessions: 0, totalSize: 0, recordings: 0 };
    }
  }
}

export default SessionStorageManager;