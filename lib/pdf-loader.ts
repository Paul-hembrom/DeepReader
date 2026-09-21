'use client';

let pdfjsInstance: any = null;
let loadPromise: Promise<any> | null = null;

export async function getPdfjs(): Promise<any> {
  if (typeof window === 'undefined') {
    throw new Error('PDF.js can only be used on the client.');
  }

  if (pdfjsInstance) {
    return pdfjsInstance;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    // 1. Check if window.pdfjsLib already exists
    if ((window as any).pdfjsLib) {
      pdfjsInstance = (window as any).pdfjsLib;
      if (pdfjsInstance.GlobalWorkerOptions) {
        pdfjsInstance.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
      }
      return pdfjsInstance;
    }

    // 2. Load /pdf.min.js directly into the browser
    await new Promise<void>((resolve, reject) => {
      const existingScript = document.querySelector('script[src="/pdf.min.js"]') as HTMLScriptElement;
      if (existingScript) {
        if ((window as any).pdfjsLib) {
          resolve();
          return;
        }
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', (e) => reject(e));
        return;
      }

      const script = document.createElement('script');
      script.src = '/pdf.min.js';
      script.async = true;
      script.onload = () => {
        if ((window as any).pdfjsLib) {
          resolve();
        } else {
          reject(new Error('window.pdfjsLib was not defined after loading /pdf.min.js'));
        }
      };
      script.onerror = (err) => {
        reject(new Error('Failed to load script /pdf.min.js: ' + err));
      };
      document.head.appendChild(script);
    });

    if ((window as any).pdfjsLib) {
      pdfjsInstance = (window as any).pdfjsLib;
      if (pdfjsInstance.GlobalWorkerOptions) {
        pdfjsInstance.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
      }
      return pdfjsInstance;
    }

    throw new Error('PDF.js failed to initialize.');
  })();

  try {
    return await loadPromise;
  } catch (err) {
    loadPromise = null; // allow retry
    throw err;
  }
}
