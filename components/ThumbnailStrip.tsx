'use client';

import React, { useEffect, useState, useRef } from 'react';
import { MessageSquare, X, BookOpen } from 'lucide-react';

interface ThumbnailStripProps {
  pdfDocument: any;
  totalPages: number;
  currentPage: number;
  pagesWithChat: number[];
  onSelectPage: (pageNumber: number) => void;
  onClose?: () => void;
}

export const ThumbnailStrip: React.FC<ThumbnailStripProps> = ({
  pdfDocument,
  totalPages,
  currentPage,
  pagesWithChat,
  onSelectPage,
  onClose,
}) => {
  const activeItemRef = useRef<HTMLDivElement>(null);
  const [thumbnails, setThumbnails] = useState<Record<number, string>>({});
  const thumbnailsRef = useRef<Record<number, string>>({});

  // Keep thumbnailsRef in sync
  useEffect(() => {
    thumbnailsRef.current = thumbnails;
  }, [thumbnails]);

  // Auto-scroll active thumbnail into view
  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [currentPage]);

  // Generate lightweight thumbnails for pages in the background
  useEffect(() => {
    if (!pdfDocument) return;

    let isMounted = true;

    const generateThumbnails = async () => {
      // Prioritize rendering nearby pages first, then the rest
      const pageList: number[] = [];
      pageList.push(currentPage);
      for (let i = 1; i <= totalPages; i++) {
        if (i !== currentPage) pageList.push(i);
      }

      for (const pageNum of pageList) {
        if (!isMounted) break;
        if (thumbnailsRef.current[pageNum]) continue;

        try {
          const page = await pdfDocument.getPage(pageNum);
          const viewport = page.getViewport({ scale: 0.25 });
          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          const ctx = canvas.getContext('2d');

          if (ctx) {
            await page.render({ canvasContext: ctx, viewport }).promise;
            const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
            if (isMounted) {
              setThumbnails((prev) => ({ ...prev, [pageNum]: dataUrl }));
            }
          }
        } catch {
          // Ignore cancellation/errors for thumbnail rendering
        }
      }
    };

    generateThumbnails();

    return () => {
      isMounted = false;
    };
  }, [pdfDocument, totalPages, currentPage]);

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="bg-stone-50 border-t border-stone-200 p-3 shadow-inner select-none animate-in slide-in-from-bottom duration-200">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <BookOpen className="w-3.5 h-3.5 text-stone-500" />
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-600">
            All Book Pages ({totalPages})
          </span>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-700 rounded-md transition-colors"
            title="Close page strip"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin scrollbar-thumb-stone-300">
        {pages.map((p) => {
          const isActive = p === currentPage;
          const hasChat = pagesWithChat.includes(p);
          const thumbUrl = thumbnails[p];

          return (
            <div
              key={p}
              ref={isActive ? activeItemRef : null}
              id={`thumbnail-page-${p}`}
              onClick={() => onSelectPage(p)}
              className={`shrink-0 cursor-pointer group flex flex-col items-center rounded-lg p-1.5 transition-all duration-150 ${
                isActive
                  ? 'bg-white ring-2 ring-stone-900 shadow-sm'
                  : 'hover:bg-stone-200/70 opacity-80 hover:opacity-100'
              }`}
              style={{ width: '82px' }}
            >
              {/* Thumbnail preview box */}
              <div className="relative w-full aspect-[1/1.35] bg-white rounded border border-stone-300 overflow-hidden flex items-center justify-center shadow-2xs">
                {thumbUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={thumbUrl}
                    alt={`Page ${p}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-[10px] text-stone-400 font-serif">
                    <span>Page</span>
                    <span className="font-semibold text-xs text-stone-500">{p}</span>
                  </div>
                )}

                {hasChat && (
                  <div
                    className="absolute top-1 right-1 bg-stone-900 text-white p-0.5 rounded shadow-xs"
                    title={`Page ${p} has saved chat history`}
                  >
                    <MessageSquare className="w-2.5 h-2.5 text-amber-300" />
                  </div>
                )}
              </div>

              {/* Page label */}
              <div className="mt-1 flex items-center justify-between w-full px-0.5">
                <span
                  className={`text-[11px] font-mono ${
                    isActive ? 'font-bold text-stone-900' : 'text-stone-600'
                  }`}
                >
                  P.{p}
                </span>
                {hasChat && (
                  <span className="text-[9px] text-amber-700 bg-amber-100 px-1 rounded-sm font-medium">
                    notes
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
