import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { WindowCloseManager } from '../apps/desktop/services/window-close-manager';
import { IPC_CHANNELS, type WindowCloseResponsePayload } from '../apps/desktop/types/ipc';

// Mock Electron modules
vi.mock('electron', () => {
  const listeners: Record<string, ((event: unknown, ...args: unknown[]) => void)[]> = {};
  return {
    app: {
      getVersion: () => '1.0.0',
    },
    ipcMain: {
      on: vi.fn((channel: string, listener: (event: unknown, ...args: unknown[]) => void) => {
        if (!listeners[channel]) listeners[channel] = [];
        listeners[channel].push(listener);
      }),
      removeListener: vi.fn((channel: string, listener: (event: unknown, ...args: unknown[]) => void) => {
        if (listeners[channel]) {
          listeners[channel] = listeners[channel].filter((l) => l !== listener);
        }
      }),
      emit: (channel: string, event: unknown, ...args: unknown[]) => {
        if (listeners[channel]) {
          for (const l of listeners[channel]) {
            l(event, ...args);
          }
        }
      },
    },
    dialog: {
      showMessageBox: vi.fn(),
    },
    BrowserWindow: vi.fn(),
  };
});

interface MockWebContents {
  send: ReturnType<typeof vi.fn>;
  isDestroyed: ReturnType<typeof vi.fn>;
}

interface MockWindow {
  webContents: MockWebContents;
  isDestroyed: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
}

describe('Milestone 2B2B3: Window Close Handshake & Pending Save Protection', () => {
  let mockWindow: MockWindow;
  let mockWebContents: MockWebContents;
  let mockDialogFn: ReturnType<typeof vi.fn>;
  let windowCloseManager: WindowCloseManager;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    mockWebContents = {
      send: vi.fn(),
      isDestroyed: vi.fn().mockReturnValue(false),
    };

    mockWindow = {
      webContents: mockWebContents,
      isDestroyed: vi.fn().mockReturnValue(false),
      close: vi.fn(),
      destroy: vi.fn(),
    };

    mockDialogFn = vi.fn().mockResolvedValue({ response: 1 }); // Default to Cancel (index 1)

    windowCloseManager = new WindowCloseManager(mockWindow as unknown as import('electron').BrowserWindow, {
      timeoutMs: 1000,
      dialogFn: mockDialogFn,
    });
  });

  afterEach(() => {
    windowCloseManager.destroy();
    vi.useRealTimers();
  });

  describe('1. Clean Window Close (No Unsaved Changes)', () => {
    it('intercepts initial close, queries renderer, and closes cleanly when canClose is true', async () => {
      const closeEvent = { preventDefault: vi.fn() };
      const allowed = windowCloseManager.handleWindowClose(closeEvent);

      expect(allowed).toBe(false);
      expect(closeEvent.preventDefault).toHaveBeenCalledTimes(1);
      expect(mockWebContents.send).toHaveBeenCalledWith(IPC_CHANNELS.WINDOW_REQUEST_CLOSE);
      expect(windowCloseManager.getInCloseProgress()).toBe(true);

      // Renderer responds with canClose: true
      const payload: WindowCloseResponsePayload = { canClose: true, hasUnsaved: false };
      await windowCloseManager.handleCloseResponse(payload);

      expect(windowCloseManager.getIsCloseConfirmed()).toBe(true);
      expect(windowCloseManager.getInCloseProgress()).toBe(false);
      expect(mockWindow.close).toHaveBeenCalledTimes(1);

      // Subsequent close event is allowed through without preventDefault
      const secondCloseEvent = { preventDefault: vi.fn() };
      const secondAllowed = windowCloseManager.handleWindowClose(secondCloseEvent);
      expect(secondAllowed).toBe(true);
      expect(secondCloseEvent.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('2. Pending Save Flush and Confirmation', () => {
    it('awaits renderer flush and allows close only after successful save', async () => {
      const closeEvent = { preventDefault: vi.fn() };
      windowCloseManager.handleWindowClose(closeEvent);

      expect(mockWebContents.send).toHaveBeenCalledWith(IPC_CHANNELS.WINDOW_REQUEST_CLOSE);

      // Renderer flushes pending save and responds that save succeeded
      const payload: WindowCloseResponsePayload = { canClose: true, hasUnsaved: true };
      await windowCloseManager.handleCloseResponse(payload);

      expect(windowCloseManager.getIsCloseConfirmed()).toBe(true);
      expect(mockWindow.close).toHaveBeenCalledTimes(1);
      expect(mockDialogFn).not.toHaveBeenCalled();
    });
  });

  describe('3. Failed Save Handling & User Dialog Choices', () => {
    it('prompts user and cancels closing when user chooses Cancel', async () => {
      const closeEvent = { preventDefault: vi.fn() };
      windowCloseManager.handleWindowClose(closeEvent);

      mockDialogFn.mockResolvedValueOnce({ response: 1 }); // User clicks Cancel

      const failurePayload: WindowCloseResponsePayload = {
        canClose: false,
        hasUnsaved: true,
        error: 'EACCES: permission denied',
      };

      await windowCloseManager.handleCloseResponse(failurePayload);

      expect(mockDialogFn).toHaveBeenCalledWith(
        mockWindow,
        expect.objectContaining({
          type: 'warning',
          buttons: ['Retry Save', 'Cancel', 'Close Without Saving'],
          defaultId: 1,
        })
      );

      // Window must NOT be closed; changes are preserved on screen
      expect(mockWindow.close).not.toHaveBeenCalled();
      expect(windowCloseManager.getInCloseProgress()).toBe(false);
      expect(windowCloseManager.getIsCloseConfirmed()).toBe(false);
    });

    it('retries close request when user chooses Retry Save', async () => {
      const closeEvent = { preventDefault: vi.fn() };
      windowCloseManager.handleWindowClose(closeEvent);

      mockDialogFn.mockResolvedValueOnce({ response: 0 }); // User clicks Retry Save (index 0)

      const failurePayload: WindowCloseResponsePayload = {
        canClose: false,
        hasUnsaved: true,
        error: 'Disk temporary lock',
      };

      await windowCloseManager.handleCloseResponse(failurePayload);

      // Verify a second request was sent to renderer
      expect(mockWebContents.send).toHaveBeenCalledTimes(2);
      expect(windowCloseManager.getInCloseProgress()).toBe(true);
    });

    it('forces close when user explicitly selects Close Without Saving', async () => {
      const closeEvent = { preventDefault: vi.fn() };
      windowCloseManager.handleWindowClose(closeEvent);

      mockDialogFn.mockResolvedValueOnce({ response: 2 }); // User clicks Close Without Saving (index 2)

      const failurePayload: WindowCloseResponsePayload = {
        canClose: false,
        hasUnsaved: true,
        error: 'Disk full',
      };

      await windowCloseManager.handleCloseResponse(failurePayload);

      expect(windowCloseManager.getIsCloseConfirmed()).toBe(true);
      expect(mockWindow.close).toHaveBeenCalledTimes(1);
    });
  });

  describe('4. Repeated Close Requests (Deduplication)', () => {
    it('drops duplicate close requests while a handshake is currently in flight', () => {
      const event1 = { preventDefault: vi.fn() };
      const event2 = { preventDefault: vi.fn() };
      const event3 = { preventDefault: vi.fn() };

      // First close request starts handshake
      windowCloseManager.handleWindowClose(event1);
      expect(mockWebContents.send).toHaveBeenCalledTimes(1);

      // Rapid subsequent clicks (e.g. mashing Alt+F4)
      windowCloseManager.handleWindowClose(event2);
      windowCloseManager.handleWindowClose(event3);

      expect(event2.preventDefault).toHaveBeenCalledTimes(1);
      expect(event3.preventDefault).toHaveBeenCalledTimes(1);
      // Ensure NO duplicate request messages were dispatched
      expect(mockWebContents.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('5. Renderer Timeout & Unresponsive Shutdown', () => {
    it('handles renderer timeout and prompts user to force close or keep waiting', async () => {
      const closeEvent = { preventDefault: vi.fn() };
      windowCloseManager.handleWindowClose(closeEvent);

      mockDialogFn.mockResolvedValueOnce({ response: 2 }); // User selects Force Close (index 2)

      // Fast-forward past timeout (1000ms)
      vi.advanceTimersByTime(1000);

      // Allow microtask queue to process async timeout dialog
      await Promise.resolve();

      expect(mockDialogFn).toHaveBeenCalledWith(
        mockWindow,
        expect.objectContaining({
          title: 'Application Unresponsive',
          buttons: ['Keep Waiting', 'Cancel', 'Force Close'],
        })
      );

      // Force close calls window.destroy()
      expect(mockWindow.destroy).toHaveBeenCalledTimes(1);
      expect(windowCloseManager.getIsCloseConfirmed()).toBe(true);
    });
  });
});
