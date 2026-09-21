'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  Loader2,
  FileText,
} from 'lucide-react';
import { getPdfjs } from '@/lib/pdf-loader';

interface PdfPageViewProps {
  pdfDocument: any;
  currentPage: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onPageTextExtracted: (pageNumber: number, text: string, previewUrl?: string) => void;
  onToggleThumbnails?: () => void;
  isThumbnailsOpen?: boolean;
}

export const PdfPageView: React.FC<PdfPageViewProps> = ({
  pdfDocument,
  currentPage,
  totalPages,
  onPageChange,
  onPageTextExtracted,
  onToggleThumbnails,
  isThumbnailsOpen,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);

  const [scale, setScale] = useState<number>(1.2);
  const [rendering, setRendering] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPageInput, setEditingPageInput] = useState<string | null>(null);
  const [fitMode, setFitMode] = useState<'custom' | 'width'>('width');
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [retryCount, setRetryCount] = useState<number>(0);

  const displayPageValue = editingPageInput !== null ? editingPageInput : String(currentPage);

  useEffect(() => {
    let isCancelled = false;

    const executeRender = async () => {
      if (!pdfDocument || !canvasRef.current || !containerRef.current) return;

      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }

      try {
        const page = await pdfDocument.getPage(currentPage);
        if (isCancelled) return;

        try {
          const textContent = await page.getTextContent();
          const extractedText = textContent.items
            .map((item: any) => item.str || '')
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();

          onPageTextExtracted(currentPage, extractedText);
        } catch (textErr) {
          console.warn('Text extraction error:', textErr);
        }

        if (isCancelled || !canvasRef.current || !containerRef.current) return;

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d', { alpha: false });
        if (!context) return;

        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const containerWidth = containerRef.current.clientWidth - 48;

        let actualScale = scale;
        if (fitMode === 'width' && containerWidth > 100) {
          actualScale = Math.max(0.6, Math.min(2.5, containerWidth / unscaledViewport.width));
        }

        const pixelRatio = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: actualScale });

        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        const renderTask = page.render({
          canvasContext: context,
          viewport,
        });
        renderTaskRef.current = renderTask;

        await renderTask.promise;
        if (!isCancelled) {
          renderTaskRef.current = null;
          setRendering(false);
        }
      } catch (err: any) {
        if (err?.name === 'RenderingCancelledException' || isCancelled) {
          return;
        }
        console.error('Error rendering PDF page:', err);
        setError('Could not render this page.');
        setRendering(false);
      }
    };

    const frameId = requestAnimationFrame(() => {
      setRendering(true);
      setError(null);
      executeRender();
    });

    return () => {
      isCancelled = true;
      cancelAnimationFrame(frameId);
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, [pdfDocument, currentPage, scale, fitMode, containerWidth, retryCount, onPageTextExtracted]);

  // Window resize observer to adapt width
  useEffect(() => {
    if (!containerRef.current || fitMode !== 'width') return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [fitMode]);

  // Keyboard navigation (Arrow keys for prev/next page)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in textarea or input
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        if (currentPage > 1) onPageChange(currentPage - 1);
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        if (currentPage < totalPages) onPageChange(currentPage + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages, onPageChange]);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = editingPageInput !== null ? editingPageInput : String(currentPage);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= totalPages) {
      onPageChange(parsed);
    }
    setEditingPageInput(null);
  };

  const handleZoomIn = () => {
    setFitMode('custom');
    setScale((prev) => Math.min(prev + 0.2, 3.0));
  };

  const handleZoomOut = () => {
    setFitMode('custom');
    setScale((prev) => Math.max(prev - 0.2, 0.5));
  };

  const handleResetZoom = () => {
    setFitMode('custom');
    setScale(1.0);
  };

  const handleFitWidth = () => {
    setFitMode('width');
  };

  return (
    <div className="flex flex-col h-full bg-stone-100/60 border-l border-stone-200 select-none">
      {/* Top toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-stone-200/80 shrink-0 gap-2 flex-wrap">
        {/* Page navigation controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            id="pdf-prev-page-btn"
            onClick={handlePrevPage}
            disabled={currentPage <= 1 || rendering}
            aria-label="Previous Page"
            className="p-1.5 rounded-lg text-stone-700 hover:bg-stone-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Previous Page (Left Arrow)"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1 text-xs text-stone-600 font-medium">
            <span>Page</span>
            <input
              id="pdf-page-jump-input"
              type="text"
              value={displayPageValue}
              onChange={(e) => setEditingPageInput(e.target.value)}
              onBlur={handlePageInputSubmit}
              className="w-12 px-1.5 py-1 text-center font-mono font-medium text-stone-900 bg-stone-50 border border-stone-300 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-500 text-xs"
              aria-label="Current page number"
            />
            <span className="text-stone-400">/</span>
            <span className="text-stone-700 font-mono">{totalPages}</span>
          </form>

          <button
            type="button"
            id="pdf-next-page-btn"
            onClick={handleNextPage}
            disabled={currentPage >= totalPages || rendering}
            aria-label="Next Page"
            className="p-1.5 rounded-lg text-stone-700 hover:bg-stone-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Next Page (Right Arrow)"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Zoom & View Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors"
            title="Zoom out"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleResetZoom}
            className="px-2 py-1 text-xs font-mono text-stone-600 hover:bg-stone-100 rounded-md transition-colors"
            title="Reset Zoom to 100%"
          >
            {fitMode === 'width' ? 'Fit' : `${Math.round(scale * 100)}%`}
          </button>

          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 rounded-lg text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors"
            title="Zoom in"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="w-px h-4 bg-stone-200 mx-1" />

          <button
            type="button"
            onClick={handleFitWidth}
            className={`px-2 py-1 text-xs rounded-md font-medium transition-colors ${
              fitMode === 'width'
                ? 'bg-stone-900 text-white'
                : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
            }`}
            title="Fit to Width"
          >
            Fit Width
          </button>

          {onToggleThumbnails && (
            <button
              type="button"
              id="toggle-thumbnails-btn"
              onClick={onToggleThumbnails}
              className={`p-1.5 rounded-lg text-stone-600 hover:bg-stone-100 transition-colors ml-1 ${
                isThumbnailsOpen ? 'bg-stone-200/70 text-stone-900' : ''
              }`}
              title={isThumbnailsOpen ? 'Hide Page Strip' : 'Show All Pages'}
            >
              <FileText className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Single Page Canvas Canvas Viewer */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4 md:p-6 flex items-start justify-center relative min-h-[400px]"
      >
        {rendering && (
          <div className="absolute inset-0 bg-stone-50/70 backdrop-blur-[1px] flex flex-col items-center justify-center z-10">
            <Loader2 className="w-7 h-7 text-stone-600 animate-spin mb-2" />
            <span className="text-xs font-medium text-stone-600 tracking-wide">
              Rendering Page {currentPage}...
            </span>
          </div>
        )}

        {error ? (
          <div className="m-auto text-center p-8 bg-white rounded-xl border border-red-200 text-red-700 max-w-sm">
            <p className="font-medium mb-1">Failed to load page</p>
            <p className="text-xs text-red-600 mb-4">{error}</p>
            <button
              type="button"
              onClick={() => setRetryCount((c) => c + 1)}
              className="px-4 py-2 bg-stone-900 text-white text-xs font-medium rounded-lg hover:bg-stone-800"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="relative shadow-md rounded-sm bg-white overflow-hidden transition-shadow duration-200 border border-stone-200/90">
            <canvas ref={canvasRef} id={`pdf-page-canvas-${currentPage}`} className="block mx-auto" />
          </div>
        )}
      </div>

      {/* Subtle bottom page indicator */}
      <div className="px-4 py-2 bg-white border-t border-stone-200/70 text-[11px] text-stone-500 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
          <span>Active View: Page {currentPage} of {totalPages}</span>
        </div>
        <span className="hidden sm:inline text-stone-400">
          Use ← / → keys to flip pages
        </span>
      </div>
    </div>
  );
};
