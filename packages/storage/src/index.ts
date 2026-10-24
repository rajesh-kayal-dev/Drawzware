import type { StorageAdapter } from './storage-adapter.interface';
import { DesktopStorageAdapter } from './desktop-adapter';
import { WebStorageAdapter } from './web-adapter';

export { StorageAdapterError, type StorageAdapter } from './storage-adapter.interface';
export { DesktopStorageAdapter } from './desktop-adapter';
export { WebStorageAdapter } from './web-adapter';

let activeAdapterInstance: StorageAdapter | null = null;

export function getStorageAdapter(): StorageAdapter {
  if (activeAdapterInstance) {
    return activeAdapterInstance;
  }

  const win = typeof window !== 'undefined' ? (window as unknown as { desktopApi?: { isDesktop?: boolean } }) : undefined;
  if (win && win.desktopApi?.isDesktop) {
    activeAdapterInstance = new DesktopStorageAdapter();
  } else {
    activeAdapterInstance = new WebStorageAdapter();
  }

  return activeAdapterInstance;
}

export function setStorageAdapterForTesting(adapter: StorageAdapter | null): void {
  activeAdapterInstance = adapter;
}
