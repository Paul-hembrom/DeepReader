'use client';

import React from 'react';
import {
  BookOpen,
  Upload,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface ReaderNavbarProps {
  bookTitle: string;
  currentPage: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onUploadClick: () => void;
  onToggleThumbnails: () => void;
  isThumbnailsOpen: boolean;
  pagesWithChatCount: number;
}

export const ReaderNavbar: React.FC<ReaderNavbarProps> = ({
  bookTitle,
  currentPage,
  totalPages,
  onPageChange,
  onUploadClick,
  onToggleThumbnails,
  isThumbnailsOpen,
  pagesWithChatCount,
}) => {
  return (
    <header className="h-14 bg-white border-b border-stone-200 px-4 flex items-center justify-between shrink-0 select-none z-20">
      {/* Left: Brand & Book Title */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-stone-900 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <BookOpen className="w-4 h-4 text-stone-100" />
          </div>
          <span className="font-serif font-semibold text-stone-900 text-sm hidden md:inline tracking-tight">
            DeepReader
          </span>
        </div>

        <div className="h-4 w-px bg-stone-200 hidden md:block" />

        <div className="min-w-0 flex items-center gap-2">
          <span
            className="text-xs font-medium text-stone-800 truncate max-w-[150px] sm:max-w-[280px] md:max-w-[340px]"
            title={bookTitle}
          >
            {bookTitle}
          </span>
        </div>
      </div>

      {/* Center: Page navigation controls */}
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-stone-100 rounded-lg p-0.5 border border-stone-200">
          <button
            type="button"
            onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-1 rounded-md text-stone-600 hover:text-stone-900 hover:bg-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="px-2 text-xs font-medium font-mono text-stone-800">
            {currentPage} <span className="text-stone-400 font-normal">/</span> {totalPages}
          </span>

          <button
            type="button"
            onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="p-1 rounded-md text-stone-600 hover:text-stone-900 hover:bg-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={onToggleThumbnails}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
            isThumbnailsOpen
              ? 'bg-stone-900 text-white border-stone-900'
              : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
          }`}
          title="Toggle page grid / thumbnail strip"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Pages</span>
          {pagesWithChatCount > 0 && (
            <span
              className={`text-[10px] px-1 py-0.2 rounded-full font-mono ${
                isThumbnailsOpen ? 'bg-stone-700 text-stone-200' : 'bg-stone-200 text-stone-700'
              }`}
            >
              {pagesWithChatCount}
            </span>
          )}
        </button>
      </div>

      {/* Right: Upload new book & info */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          id="change-book-btn"
          onClick={onUploadClick}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium transition-colors"
          title="Open a different PDF"
        >
          <Upload className="w-3.5 h-3.5 text-stone-600" />
          <span className="hidden sm:inline">Change Book</span>
        </button>
      </div>
    </header>
  );
};
