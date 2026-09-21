'use client';

import React, { useState, useRef } from 'react';
import { Upload, BookOpen, FileText, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

interface PdfUploaderProps {
  onFileSelect: (file: File | ArrayBuffer, fileName: string, fileSize: number) => void;
  isLoading?: boolean;
}

export const PdfUploader: React.FC<PdfUploaderProps> = ({ onFileSelect, isLoading }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingSample, setLoadingSample] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setError(null);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        onFileSelect(file, file.name, file.size);
      } else {
        setError('Please upload a valid PDF document (.pdf).');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        onFileSelect(file, file.name, file.size);
      } else {
        setError('Please upload a valid PDF document (.pdf).');
      }
    }
  };

  const handleLoadSample = async () => {
    try {
      setLoadingSample(true);
      setError(null);
      const res = await fetch('/sample-book.pdf');
      if (!res.ok) throw new Error('Failed to load sample book');
      const arrayBuffer = await res.arrayBuffer();
      onFileSelect(arrayBuffer, 'Meditations (Marcus Aurelius) - Book IV.pdf', arrayBuffer.byteLength);
    } catch (err: any) {
      setError(err?.message || 'Failed to load sample book');
    } finally {
      setLoadingSample(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 md:p-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-100 text-stone-700 text-xs font-medium tracking-wide uppercase mb-3">
          <BookOpen className="w-3.5 h-3.5 text-stone-600" />
          Distraction-Free Deep Reading
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900 mb-2 font-serif">
          PDF Deep Reader with Page AI
        </h1>
        <p className="text-stone-600 text-sm md:text-base max-w-md mx-auto leading-relaxed">
          Upload any PDF book. Read one high-resolution page at a time with a dedicated Gemini AI chat strictly grounded in that page.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Notice</p>
            <p className="text-amber-700 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Drag and Drop Zone */}
      <div
        id="pdf-drop-zone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-8 md:p-12 text-center transition-all duration-200 ${
          isDragging
            ? 'border-stone-800 bg-stone-50 scale-[0.99]'
            : 'border-stone-300 hover:border-stone-400 bg-white hover:bg-stone-50/50'
        } shadow-sm`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="hidden"
          id="pdf-file-input"
        />

        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-700 shadow-inner">
          <Upload className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-medium text-stone-900 mb-1">
          {isDragging ? 'Drop your PDF here' : 'Drop your PDF book here, or browse'}
        </h3>
        <p className="text-stone-500 text-xs md:text-sm mb-6">
          Supports any PDF textbook, paper, book, or manuscript up to 100MB
        </p>

        <button
          type="button"
          disabled={isLoading}
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-stone-900 text-white font-medium text-sm hover:bg-stone-800 transition-colors shadow-sm"
        >
          <FileText className="w-4 h-4 mr-2" />
          Choose PDF File
        </button>
      </div>

      {/* Quick Sample Book Option */}
      <div className="mt-6 pt-6 border-t border-stone-200">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-stone-100/70 border border-stone-200/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-stone-200 flex items-center justify-center text-stone-700 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h4 className="text-sm font-medium text-stone-900">Try Sample Book</h4>
              <p className="text-xs text-stone-500">Marcus Aurelius — Meditations: Book IV (5 Pages)</p>
            </div>
          </div>

          <button
            type="button"
            id="load-sample-book-btn"
            onClick={handleLoadSample}
            disabled={loadingSample || isLoading}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 rounded-lg bg-white border border-stone-300 text-stone-700 text-xs font-medium hover:bg-stone-50 hover:text-stone-900 transition-colors shrink-0 shadow-2xs"
          >
            {loadingSample ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full border-2 border-stone-400 border-t-transparent animate-spin" />
                Loading...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                Open Sample Book
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Features preview pills */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
        <div className="p-3 rounded-lg bg-white border border-stone-200/70 shadow-2xs">
          <div className="flex items-center gap-2 text-stone-900 font-medium text-xs mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            One Page at a Time
          </div>
          <p className="text-stone-500 text-[11px] leading-relaxed">
            Distraction-free high-definition visual page rendering.
          </p>
        </div>

        <div className="p-3 rounded-lg bg-white border border-stone-200/70 shadow-2xs">
          <div className="flex items-center gap-2 text-stone-900 font-medium text-xs mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Page-Strict AI
          </div>
          <p className="text-stone-500 text-[11px] leading-relaxed">
            Gemini only answers using the content on your active page.
          </p>
        </div>

        <div className="p-3 rounded-lg bg-white border border-stone-200/70 shadow-2xs">
          <div className="flex items-center gap-2 text-stone-900 font-medium text-xs mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Zero Cross-Page Leaks
          </div>
          <p className="text-stone-500 text-[11px] leading-relaxed">
            Each page preserves its own permanent chat history in local storage.
          </p>
        </div>
      </div>
    </div>
  );
};
