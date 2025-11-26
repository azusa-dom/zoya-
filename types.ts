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
}

export enum ConnectionStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}
