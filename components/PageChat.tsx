'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Sparkles,
  Trash2,
  Bot,
  User,
  AlertCircle,
  FileText,
  CornerDownLeft,
  BookOpen,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage } from '@/types/reader';
import { loadPageChat, savePageChat, clearPageChat } from '@/lib/storage';
import { generateUniqueId, getTimestamp } from '@/lib/utils';

interface PageChatProps {
  bookId: string;
  bookTitle: string;
  currentPage: number;
  totalPages: number;
  currentPageText: string;
  onChatUpdated?: () => void;
}

const QUICK_PROMPTS_EN = [
  { label: 'Summarize Page', prompt: 'Please provide a clear, structured summary of this page.' },
  { label: 'Key Takeaways', prompt: 'What are the main takeaways and central arguments on this page?' },
  { label: 'Explain Simply', prompt: 'Explain the core idea on this page in simple, plain terms.' },
  { label: 'Define Terms', prompt: 'Identify and explain any key terms, jargon, or vocabulary used on this page.' },
];

const QUICK_PROMPTS_NE = [
  { label: 'यस पृष्ठको सारांश (Summary)', prompt: 'यस पृष्ठको मुख्य विषयवस्तु र स्पष्ट सारांश नेपालीमा प्रस्तुत गर्नुहोस्।' },
  { label: 'मुख्य बुँदाहरू (Key Points)', prompt: 'यस पृष्ठमा भएका मुख्य बुँदाहरू र महत्त्वपूर्ण निष्कर्षहरू नेपालीमा सूचीकृत गर्नुहोस्।' },
  { label: 'सरल व्याख्या (Explanation)', prompt: 'यस पृष्ठमा प्रस्तुत गरिएको अवधारणालाई सरल र बुझिने नेपाली भाषामा व्याख्या गर्नुहोस्।' },
  { label: 'शब्दावली र अर्थ (Vocabulary)', prompt: 'यस पृष्ठमा प्रयोग भएका महत्त्वपूर्ण तथा कठिन शब्दहरू र तिनको अर्थ नेपालीमा बताउनुहोस्।' },
];

export const PageChat: React.FC<PageChatProps> = ({
  bookId,
  bookTitle,
  currentPage,
  totalPages,
  currentPageText,
  onChatUpdated,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadPageChat(bookId, currentPage));
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Detect whether the current textbook page or title contains Nepali (Devanagari script)
  const isNepali = /[\u0900-\u097F]/.test((currentPageText || '') + ' ' + (bookTitle || ''));
  const quickPrompts = isNepali ? QUICK_PROMPTS_NE : QUICK_PROMPTS_EN;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastSentQueryRef = useRef<string>('');

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Handle textarea auto-resize
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputMessage).trim();
    if (!text || isLoading) return;

    lastSentQueryRef.current = text;
    setErrorMessage(null);
    setInputMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Check if the last message in history is already this user query (retry case)
    const lastMsg = messages[messages.length - 1];
    const isRetryOfLast = lastMsg && lastMsg.role === 'user' && lastMsg.content === text;

    let updatedMessages = messages;
    if (!isRetryOfLast) {
      const userMessage: ChatMessage = {
        id: generateUniqueId('msg_user'),
        role: 'user',
        content: text,
        timestamp: getTimestamp(),
      };
      updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      savePageChat(bookId, currentPage, updatedMessages);
      if (onChatUpdated) onChatUpdated();
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pageNumber: currentPage,
          totalPages,
          bookTitle,
          pageText: currentPageText,
          message: text,
          history: messages.slice(-10).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get AI response');
      }

      const assistantMessage: ChatMessage = {
        id: generateUniqueId('msg_ai'),
        role: 'assistant',
        content: data.reply || 'No response returned.',
        timestamp: getTimestamp(),
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      savePageChat(bookId, currentPage, finalMessages);
      if (onChatUpdated) onChatUpdated();
    } catch (err: any) {
      console.error('Chat error:', err);
      setErrorMessage(err?.message || 'Error communicating with AI');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    clearPageChat(bookId, currentPage);
    setMessages([]);
    setShowClearConfirm(false);
    if (onChatUpdated) onChatUpdated();
  };

  return (
    <div className="flex flex-col h-full bg-stone-50/50">
      {/* Page-Specific Chat Header */}
      <div className="px-4 py-3 bg-white border-b border-stone-200 shrink-0 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-stone-900 text-white flex items-center justify-center font-serif text-sm font-semibold shadow-xs">
            {currentPage}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-semibold text-stone-900 tracking-tight">
                {isNepali ? `पृष्ठ ${currentPage} को कुराकानी` : `Chat for Page ${currentPage}`}
              </h2>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                isNepali
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-amber-100/80 text-amber-800 border border-amber-200'
              }`}>
                {isNepali ? 'नेपाली मोड' : 'Scoped'}
              </span>
            </div>
            <p className="text-[11px] text-stone-500">
              {isNepali
                ? `पृष्ठ ${currentPage} को सामग्रीमा आधारित (नेपालीमा मात्र जवाफ)`
                : `Grounded exclusively in Page ${currentPage} content`}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {messages.length > 0 && !showClearConfirm && (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors text-xs flex items-center gap-1"
              title="Clear chat for this page only"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline text-[11px]">Clear</span>
            </button>
          )}

          {showClearConfirm && (
            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg border border-stone-200">
              <span className="text-[10px] text-stone-600 pl-1 font-medium">Clear page?</span>
              <button
                type="button"
                onClick={handleClearChat}
                className="px-2 py-0.5 text-[10px] font-medium bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-2 py-0.5 text-[10px] font-medium bg-white text-stone-600 rounded border border-stone-300 hover:bg-stone-50 transition-colors"
              >
                No
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Context info banner */}
        <div className="p-2.5 rounded-lg bg-white border border-stone-200/80 shadow-2xs flex items-center justify-between text-xs text-stone-600">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-stone-400 shrink-0" />
            <span className="truncate max-w-[220px] font-medium text-stone-700">
              {bookTitle}
            </span>
          </div>
          <span className="text-[11px] font-mono text-stone-400">
            Page {currentPage} of {totalPages}
          </span>
        </div>

        {/* Empty State */}
        {messages.length === 0 && (
          <div className="py-8 text-center px-4">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-600 shadow-inner">
              <Sparkles className="w-6 h-6 text-stone-700" />
            </div>
            <h3 className="text-sm font-semibold text-stone-900 mb-1">
              {isNepali ? `पृष्ठ ${currentPage} सम्बन्धी केही सोध्नुहोस्` : `Ask anything about Page ${currentPage}`}
            </h3>
            <p className="text-xs text-stone-500 max-w-xs mx-auto mb-6 leading-relaxed">
              {isNepali
                ? 'एआईले यस पृष्ठको सामग्री अध्ययन गरी नेपालीमा सारांश, विस्तृत व्याख्या, मुख्य बुँदाहरू र प्रश्नहरूको उत्तर दिनेछ।'
                : 'The AI answers questions, explains difficult paragraphs, and draws insights strictly from this single page.'}
            </p>

            {/* Quick Prompt Chips */}
            <div className="space-y-1.5 text-left max-w-xs mx-auto">
              <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider block px-1">
                {isNepali ? 'सुझाव गरिएका प्रश्नहरू:' : 'Suggested questions:'}
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {quickPrompts.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(item.prompt)}
                    className="w-full text-left px-3 py-2 rounded-lg bg-white border border-stone-200 text-xs text-stone-700 hover:border-stone-400 hover:bg-stone-50/80 transition-all shadow-2xs flex items-center justify-between group"
                  >
                    <span>{item.label}</span>
                    <span className="text-stone-300 group-hover:text-stone-600 transition-colors text-[10px]">
                      →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Chat Message List */}
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-7 h-7 rounded-lg bg-stone-900 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-2xs ${
                  isUser
                    ? 'bg-stone-900 text-white rounded-tr-xs'
                    : 'bg-white text-stone-800 border border-stone-200/90 rounded-tl-xs'
                }`}
              >
                {isUser ? (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                ) : (
                  <div className="prose prose-stone prose-xs sm:prose-sm max-w-none text-stone-800 space-y-2 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_blockquote]:border-l-2 [&_blockquote]:border-stone-400 [&_blockquote]:pl-3 [&_blockquote]:italic [&_code]:bg-stone-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                )}

                <div
                  className={`text-[9px] mt-1 text-right font-mono ${
                    isUser ? 'text-stone-400' : 'text-stone-400'
                  }`}
                >
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>

              {isUser && (
                <div className="w-7 h-7 rounded-lg bg-stone-200 text-stone-700 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex gap-2.5 items-start">
            <div className="w-7 h-7 rounded-lg bg-stone-900 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl rounded-tl-xs px-4 py-3 shadow-2xs flex items-center gap-2">
              <span className="text-xs text-stone-500 font-medium">Reading Page {currentPage}</span>
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-stone-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">AI Service Notification</p>
              <p className="text-amber-700 mt-0.5">{errorMessage}</p>
              <button
                type="button"
                onClick={() => handleSendMessage(lastSentQueryRef.current)}
                className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-amber-900 underline hover:text-amber-950 transition-colors"
              >
                <span>Retry question</span>
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white border-t border-stone-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative rounded-xl border border-stone-300 bg-stone-50/70 focus-within:bg-white focus-within:border-stone-700 focus-within:ring-1 focus-within:ring-stone-700 transition-all"
        >
          <textarea
            ref={textareaRef}
            id="page-chat-textarea"
            rows={1}
            value={inputMessage}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={
              isNepali
                ? `पृष्ठ ${currentPage} सम्बन्धी केही सोध्नुहोस्... (Enter थिच्नुहोस्)`
                : `Ask about Page ${currentPage}... (Press Enter)`
            }
            disabled={isLoading}
            className="w-full bg-transparent px-3 py-2.5 pr-10 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none resize-none max-h-36"
          />

          <button
            type="submit"
            id="page-chat-send-btn"
            disabled={!inputMessage.trim() || isLoading}
            aria-label="Send message"
            className="absolute right-2 bottom-2 p-1.5 rounded-lg bg-stone-900 text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-stone-800 transition-colors shadow-2xs"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="flex items-center justify-between mt-1.5 px-1 text-[10px] text-stone-400">
          <span>
            {isNepali ? 'पठाउन Enter थिच्नुहोस्, नयाँ लाइनका लागि Shift+Enter' : 'Press Enter to send, Shift+Enter for new line'}
          </span>
          <span className="font-mono">
            {isNepali ? `पृ.${currentPage} अलग च्याट` : `P.${currentPage} Chat Isolated`}
          </span>
        </div>
      </div>
    </div>
  );
};
