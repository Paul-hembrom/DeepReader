'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PdfUploader } from '@/components/PdfUploader';
import { PdfPageView } from '@/components/PdfPageView';
import { PageChat } from '@/components/PageChat';
import { ReaderNavbar } from '@/components/ReaderNavbar';
import { ThumbnailStrip } from '@/components/ThumbnailStrip';
import { getPdfjs } from '@/lib/pdf-loader';
import {
  saveLastBookInfo,
  getLastBookInfo,
  getBookChatPageNumbers,
} from '@/lib/storage';
import { BookInfo } from '@/types/reader';
import {
  BookOpen,
  MessageSquare,
  FileText,
  HelpCircle,
  X,
  Key,
} from 'lucide-react';

export default function DeepReaderPage() {
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [bookInfo, setBookInfo] = useState<BookInfo | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [currentPageText, setCurrentPageText] = useState<string>('');
  const [isThumbnailsOpen, setIsThumbnailsOpen] = useState<boolean>(false);
  const [pagesWithChat, setPagesWithChat] = useState<number[]>([]);
  const [loadingPdf, setLoadingPdf] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mobileActiveTab, setMobileActiveTab] = useState<'reader' | 'chat'>('reader');
  const [showKeyInfoModal, setShowKeyInfoModal] = useState<boolean>(false);

  // Keep a reference to the active PDF bytes for potential reload
  const pdfBytesRef = useRef<ArrayBuffer | null>(null);

  // Refresh the list of pages that have chat history
  const refreshPagesWithChat = useCallback(() => {
    if (!bookInfo) return;
    const pages = getBookChatPageNumbers(bookInfo.id, bookInfo.totalPages);
    setPagesWithChat(pages);
  }, [bookInfo]);

  // Load a PDF ArrayBuffer into pdfjs
  const loadPdfData = useCallback(
    async (
      data: ArrayBuffer,
      fileName: string,
      fileSize: number,
      initialPage: number = 1
    ) => {
      try {
        setLoadingPdf(true);
        setLoadError(null);
        pdfBytesRef.current = data;

        const pdfjs = await getPdfjs();
        // Create a copy of the ArrayBuffer slice so PDF.js doesn't detach the original
        const loadingTask = pdfjs.getDocument({
          data: data.slice(0),
        });

        const doc = await loadingTask.promise;
        const total = doc.numPages;

        // Generate a stable book ID from filename and size
        const bookId = `book_${encodeURIComponent(fileName.replace(/\s+/g, '_'))}_${fileSize}`;

        const info: BookInfo = {
          id: bookId,
          name: fileName,
          size: fileSize,
          totalPages: total,
          lastVisitedPage: Math.min(Math.max(1, initialPage), total),
        };

        setPdfDocument(doc);
        setBookInfo(info);
        setCurrentPage(info.lastVisitedPage);
        saveLastBookInfo(info);

        const pages = getBookChatPageNumbers(bookId, total);
        setPagesWithChat(pages);
      } catch (err: any) {
        console.error('Failed to load PDF document:', err);
        setLoadError(
          err?.message ||
            'Could not parse this PDF. Please ensure the file is a valid, uncorrupted PDF.'
        );
      } finally {
        setLoadingPdf(false);
      }
    },
    []
  );

  // Auto-load sample book on initial load if no custom book is stored
  useEffect(() => {
    const init = async () => {
      const savedInfo = getLastBookInfo();
      // If the last book was the sample book, auto-load it
      if (savedInfo && savedInfo.name.includes('Meditations')) {
        try {
          const res = await fetch('/sample-book.pdf');
          if (res.ok) {
            const buf = await res.arrayBuffer();
            await loadPdfData(
              buf,
              savedInfo.name,
              buf.byteLength,
              savedInfo.lastVisitedPage || 1
            );
            return;
          }
        } catch {
          // ignore fallback
        }
      }
    };
    init();
  }, [loadPdfData]);

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (!bookInfo) return;
    const clamped = Math.min(Math.max(1, newPage), bookInfo.totalPages);
    setCurrentPage(clamped);

    // Update last visited page in local state
    const updated = { ...bookInfo, lastVisitedPage: clamped };
    setBookInfo(updated);
    saveLastBookInfo(updated);
  };

  // Handle extracted text from current page canvas
  const handlePageTextExtracted = useCallback(
    (pageNum: number, text: string) => {
      if (pageNum === currentPage) {
        setCurrentPageText(text);
      }
    },
    [currentPage]
  );

  // Handle new file upload
  const handleFileSelect = async (
    fileOrBuffer: File | ArrayBuffer,
    fileName: string,
    fileSize: number
  ) => {
    let buffer: ArrayBuffer;
    if (fileOrBuffer instanceof File) {
      buffer = await fileOrBuffer.arrayBuffer();
    } else {
      buffer = fileOrBuffer;
    }
    await loadPdfData(buffer, fileName, fileSize, 1);
  };

  const handleResetToUploader = () => {
    setPdfDocument(null);
    setBookInfo(null);
    setCurrentPage(1);
    setCurrentPageText('');
    setIsThumbnailsOpen(false);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-stone-100 font-sans text-stone-900">
      {/* If no book is loaded yet, show full screen uploader */}
      {!pdfDocument ? (
        <main className="flex-1 overflow-y-auto flex items-center justify-center p-4">
          <div className="w-full max-w-2xl">
            {loadError && (
              <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs">
                {loadError}
              </div>
            )}
            <PdfUploader
              onFileSelect={handleFileSelect}
              isLoading={loadingPdf}
            />
          </div>
        </main>
      ) : (
        /* Workspace when book is loaded */
        <div className="flex flex-col h-full w-full overflow-hidden">
          {/* Top Navigation Bar */}
          <ReaderNavbar
            bookTitle={bookInfo?.name || 'PDF Book'}
            currentPage={currentPage}
            totalPages={bookInfo?.totalPages || 1}
            onPageChange={handlePageChange}
            onUploadClick={handleResetToUploader}
            onToggleThumbnails={() => setIsThumbnailsOpen((prev) => !prev)}
            isThumbnailsOpen={isThumbnailsOpen}
            pagesWithChatCount={pagesWithChat.length}
          />

          {/* Mobile Tab Switcher (Visible only on small screens) */}
          <div className="md:hidden flex items-center border-b border-stone-200 bg-white px-2 py-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setMobileActiveTab('reader')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                mobileActiveTab === 'reader'
                  ? 'bg-stone-900 text-white'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Page {currentPage} View</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileActiveTab('chat')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                mobileActiveTab === 'chat'
                  ? 'bg-stone-900 text-white'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Page {currentPage} AI</span>
              {pagesWithChat.includes(currentPage) && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              )}
            </button>
          </div>

          {/* Split Screen Workspace: Left = Chat (42%), Right = PDF Page (58%) */}
          <div className="flex-1 flex overflow-hidden relative">
            {/* Left side: Page-Specific AI Chat */}
            <div
              className={`w-full md:w-[42%] lg:w-[40%] xl:w-[38%] h-full flex flex-col border-r border-stone-200 bg-white ${
                mobileActiveTab === 'chat' ? 'flex' : 'hidden md:flex'
              }`}
            >
              {bookInfo && (
                <PageChat
                  key={`${bookInfo.id}_p${currentPage}`}
                  bookId={bookInfo.id}
                  bookTitle={bookInfo.name}
                  currentPage={currentPage}
                  totalPages={bookInfo.totalPages}
                  currentPageText={currentPageText}
                  onChatUpdated={refreshPagesWithChat}
                />
              )}
            </div>

            {/* Right side: Single Page PDF Viewer */}
            <div
              className={`w-full md:w-[58%] lg:w-[60%] xl:w-[62%] h-full flex flex-col overflow-hidden bg-stone-100 ${
                mobileActiveTab === 'reader' ? 'flex' : 'hidden md:flex'
              }`}
            >
              <div className="flex-1 overflow-hidden relative">
                <PdfPageView
                  pdfDocument={pdfDocument}
                  currentPage={currentPage}
                  totalPages={bookInfo?.totalPages || 1}
                  onPageChange={handlePageChange}
                  onPageTextExtracted={handlePageTextExtracted}
                  onToggleThumbnails={() => setIsThumbnailsOpen((prev) => !prev)}
                  isThumbnailsOpen={isThumbnailsOpen}
                />
              </div>

              {/* Bottom Thumbnail Strip (Toggleable) */}
              {isThumbnailsOpen && bookInfo && (
                <div className="shrink-0">
                  <ThumbnailStrip
                    pdfDocument={pdfDocument}
                    totalPages={bookInfo.totalPages}
                    currentPage={currentPage}
                    pagesWithChat={pagesWithChat}
                    onSelectPage={(pageNum) => {
                      handlePageChange(pageNum);
                    }}
                    onClose={() => setIsThumbnailsOpen(false)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Gemini API info modal button in bottom left corner */}
      <button
        type="button"
        onClick={() => setShowKeyInfoModal(true)}
        className="fixed bottom-3 left-3 z-30 p-2 rounded-full bg-white/90 backdrop-blur-xs border border-stone-200 text-stone-500 hover:text-stone-900 hover:border-stone-400 shadow-sm transition-all text-xs flex items-center gap-1.5"
        title="Gemini API & Setup Info"
      >
        <HelpCircle className="w-4 h-4 text-stone-600" />
        <span className="hidden sm:inline font-medium text-[11px]">API Info</span>
      </button>

      {/* Gemini API Key & Setup Info Modal */}
      {showKeyInfoModal && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-stone-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-700">
                  <Key className="w-4 h-4 text-stone-800" />
                </div>
                <h3 className="font-semibold text-stone-900 text-base">
                  Gemini API Configuration
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowKeyInfoModal(false)}
                className="p-1 rounded-md text-stone-400 hover:text-stone-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-stone-600 leading-relaxed">
              <p>
                This app uses Google&apos;s latest <strong className="text-stone-900">gemini-3.8-flash</strong> model via the official <code className="bg-stone-100 px-1 py-0.5 rounded text-stone-800 font-mono">@google/genai</code> SDK.
              </p>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 space-y-1.5">
                <p className="font-semibold text-stone-800 text-[11px] uppercase tracking-wider">
                  How the key is loaded:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-stone-600">
                  <li>
                    In <strong>Google AI Studio</strong>, the key is automatically injected at runtime into <code className="bg-white px-1 py-0.5 rounded text-stone-800 font-mono">process.env.GEMINI_API_KEY</code> from your <strong>Settings &gt; Secrets</strong> panel.
                  </li>
                  <li>
                    Server-side API routes proxy all Gemini calls to keep your keys secure.
                  </li>
                </ul>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 space-y-1.5">
                <p className="font-semibold text-stone-800 text-[11px] uppercase tracking-wider">
                  Page Isolation Guarantee:
                </p>
                <p>
                  Each page maintains its own independent conversation history stored in <code className="bg-white px-1 py-0.5 rounded text-stone-800 font-mono">localStorage</code>. When switching pages, the AI chat dynamically resets its context strictly to the new page content.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowKeyInfoModal(false)}
                className="px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-medium hover:bg-stone-800 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
