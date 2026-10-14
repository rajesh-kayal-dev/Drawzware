import type { StorageAdapter } from './storage-adapter.interface';
import { DesktopStorageAdapter } from './desktop-adapter';
import { WebStorageAdapter } from './web-adapter';

export { StorageAdapterError } from './storage-adapter.interface';
export type { StorageAdapter } from './storage-adapter.interface';
export { DesktopStorageAdapter } from './desktop-adapter';
export { WebStorageAdapter } from './web-adapter';

let activeAdapterInstance: StorageAdapter | null = null;

/**
 * Returns the appropriate StorageAdapter for the current runtime environment:
 * - Inside Electron shell (window.desktopApi.isDesktop === true): DesktopStorageAdapter
 * - In standard web browser: WebStorageAdapter
 *
 * NOTE FOR MILESTONE 2B1:
 * This factory is established and verified for future integration.
 * It is NOT yet wired to active React stores (useProjectStore, useAutoSave)
 * in accordance with Milestone 2B1 explicit scope boundaries.
 */
export function getStorageAdapter(): StorageAdapter {
  if (activeAdapterInstance) {
    return activeAdapterInstance;
  }

  if (typeof window !== 'undefined' && window.desktopApi?.isDesktop) {
    activeAdapterInstance = new DesktopStorageAdapter();
  } else {
    activeAdapterInstance = new WebStorageAdapter();
  }

  return activeAdapterInstance;
}

/**
 * For testing purposes: allows overriding or resetting the active adapter.
 */
export function setStorageAdapterForTesting(adapter: StorageAdapter | null): void {
  activeAdapterInstance = adapter;
}
