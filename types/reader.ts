export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface BookInfo {
  id: string;
  name: string;
  size: number;
  totalPages: number;
  lastVisitedPage: number;
}

export interface PageData {
  pageNumber: number;
  text: string;
  thumbnailUrl?: string;
  hasChat?: boolean;
}
