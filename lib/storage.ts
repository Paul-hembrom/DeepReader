import { ChatMessage, BookInfo } from '@/types/reader';

const STORAGE_PREFIX = 'pdf_reader_';

export function getPageChatKey(bookId: string, pageNumber: number): string {
  return `${STORAGE_PREFIX}chat_${bookId}_p${pageNumber}`;
}

export function loadPageChat(bookId: string, pageNumber: number): ChatMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const key = getPageChatKey(bookId, pageNumber);
    const data = localStorage.getItem(key);
    if (!data) return [];
    return JSON.parse(data) as ChatMessage[];
  } catch (err) {
    console.error('Failed to load page chat from localStorage', err);
    return [];
  }
}

export function savePageChat(bookId: string, pageNumber: number, messages: ChatMessage[]): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getPageChatKey(bookId, pageNumber);
    if (messages.length === 0) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(messages));
    }
  } catch (err) {
    console.error('Failed to save page chat to localStorage', err);
  }
}

export function clearPageChat(bookId: string, pageNumber: number): void {
  if (typeof window === 'undefined') return;
  try {
    const key = getPageChatKey(bookId, pageNumber);
    localStorage.removeItem(key);
  } catch (err) {
    console.error('Failed to clear page chat', err);
  }
}

export function getBookChatPageNumbers(bookId: string, totalPages: number): number[] {
  if (typeof window === 'undefined') return [];
  const pagesWithChat: number[] = [];
  try {
    for (let p = 1; p <= totalPages; p++) {
      const key = getPageChatKey(bookId, p);
      const data = localStorage.getItem(key);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed) && parsed.length > 0) {
            pagesWithChat.push(p);
          }
        } catch {
          // ignore
        }
      }
    }
  } catch (err) {
    console.error('Failed to scan pages with chat', err);
  }
  return pagesWithChat;
}

export function saveLastBookInfo(info: BookInfo): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}last_book`, JSON.stringify(info));
  } catch (err) {
    console.error('Failed to save last book info', err);
  }
}

export function getLastBookInfo(): BookInfo | null {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem(`${STORAGE_PREFIX}last_book`);
    if (!data) return null;
    return JSON.parse(data) as BookInfo;
  } catch {
    return null;
  }
}
