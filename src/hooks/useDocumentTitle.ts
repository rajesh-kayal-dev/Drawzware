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
    }
  }, [title]);
}
