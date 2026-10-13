'use client';

import { useEffect } from 'react';

/**
 * Dynamically updates the document title in the browser tab.
 * Keeps titles clean, single-sided, and reactive in real time.
 */
export function useDocumentTitle(title?: string | null) {
  useEffect(() => {
    if (!title || typeof document === 'undefined') return;
    const cleanTitle = title.trim();
    if (cleanTitle) {
      document.title = cleanTitle;
      try {
        let meta = document.querySelector('meta[name="document-subtitle"]');
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute('name', 'document-subtitle');
          document.head.appendChild(meta);
        }
        meta.setAttribute('content', cleanTitle);
      } catch {
        // Ignore in environments without DOM meta support
      }
    }
  }, [title]);
}
