export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  format: 'EPUB' | 'PDF' | 'TXT';
  content?: string;
  coverStyle?: string;
  currentPage?: number;
  totalPages?: number;
}

export interface Card {
  id: string;
  bookId: string;
  bookTitle: string;
  chapter: string;
  author: string;
  content: string;
  title?: string;
  type: 'notebook' | 'insight' | 'question' | 'quote' | 'marriage';
  date?: string;
  user?: string;
  styleConfig?: {
    fontFamily?: string;
    backgroundColor?: string;
    textColor?: string;
    borderColor?: string;
    layoutType?: 'centered' | 'left' | 'bordered' | 'minimal' | 'notebook' | 'card' | 'poster' | 'handwritten' | 'left-border' | 'blue-dot';
    decoration?: 'none' | 'sticker-star' | 'sticker-heart' | 'sticker-flower' | 'line-top' | 'line-bottom' | 'quote-mark';
  };
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  avatar?: string;
  content: string;
  isAI: boolean;
  timestamp: string;
  likes?: number;
  isLiked?: boolean;
  replies?: Comment[];
}

export interface ModelConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}
