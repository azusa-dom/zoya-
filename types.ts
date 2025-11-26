export interface ZoyaCard {
  id: string | number;
  term: string;
  chineseTranslation?: string; // 中文翻译
  roots: string;
  synonyms: string[];
  layman: string;
  example: string;
  sentences: string[];
  definition: string;
  
  // SRS (Spaced Repetition System) fields
  nextReviewDate?: number; // Timestamp for next review
  interval?: number;       // Current interval in days
  repetition?: number;     // Consecutive correct reviews
  easeFactor?: number;     // Difficulty factor (default 2.5)
  createdAt?: number;      // Creation timestamp
}

export enum ConnectionStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}
