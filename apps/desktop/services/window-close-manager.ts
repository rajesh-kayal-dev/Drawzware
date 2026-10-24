import {
  BrowserWindow,
  dialog,
  ipcMain,
  type IpcMainEvent,
  type MessageBoxOptions,
  type MessageBoxReturnValue,
} from 'electron';
import { IPC_CHANNELS, type WindowCloseResponsePayload } from '../types/ipc';

export interface WindowCloseManagerOptions {
  timeoutMs?: number;
  dialogFn?: (window: BrowserWindow, options: MessageBoxOptions) => Promise<MessageBoxReturnValue>;
}

/**
 * Coordinates a secure close handshake between the Electron main process and renderer.
 * Prevents closing the window until pending canvas saves have been flushed and confirmed,
 * allows user cancellation/retry if save fails, and guards against duplicate close requests or hanging timeouts.
 */
export class WindowCloseManager {
  private readonly window: BrowserWindow;
  private readonly timeoutMs: number;
  private readonly dialogFn: (window: BrowserWindow, options: MessageBoxOptions) => Promise<MessageBoxReturnValue>;

  private isCloseInProgress = false;
  private isCloseConfirmed = false;
  private timeoutTimer: NodeJS.Timeout | null = null;
  private isDestroyed = false;

  constructor(window: BrowserWindow, options?: WindowCloseManagerOptions) {
    this.window = window;
    this.timeoutMs = options?.timeoutMs ?? 5000;
    this.dialogFn = options?.dialogFn ?? ((win, opts) => dialog.showMessageBox(win, opts));

    this.setupIpcListener();
  }

  private setupIpcListener(): void {
    ipcMain.on(IPC_CHANNELS.WINDOW_CLOSE_RESPONSE, this.ipcHandler);
  }

  private ipcHandler = async (event: IpcMainEvent, payload: WindowCloseResponsePayload): Promise<void> => {
    if (this.isDestroyed || !this.window || this.window.isDestroyed()) return;
    if (event.sender !== this.window.webContents) return;

    await this.handleCloseResponse(payload);
  };

  /**
   * Main window 'close' event handler.
   * Intercepts closing to request a flush from the renderer if not already confirmed.
   * Returns true if closing is allowed, false if intercepted.
   */
  public handleWindowClose(event: { preventDefault: () => void }): boolean {
    if (this.isDestroyed || this.isCloseConfirmed) {
      return true;
    }

    if (this.isCloseInProgress) {
      // Prevent duplicate close requests while a handshake is already in flight
      event.preventDefault();
      return false;
    }

    if (!this.window || this.window.isDestroyed() || this.window.webContents.isDestroyed()) {
      return true;
    }

    event.preventDefault();
    this.isCloseInProgress = true;

    this.startTimeoutTimer();

    try {
      this.window.webContents.send(IPC_CHANNELS.WINDOW_REQUEST_CLOSE);
    } catch (err) {
      console.error('[WindowCloseManager] Failed to send close request to renderer:', err);
      this.clearTimeoutTimer();
      this.isCloseInProgress = false;
      this.isCloseConfirmed = true;
      this.window.close();
    }

    return false;
  }

  public async handleCloseResponse(payload: WindowCloseResponsePayload): Promise<void> {
    if (!this.isCloseInProgress || this.isDestroyed) {
      return;
    }

    this.clearTimeoutTimer();

    if (payload.canClose) {
      this.isCloseConfirmed = true;
      this.isCloseInProgress = false;
      if (this.window && !this.window.isDestroyed()) {
        this.window.close();
      }
      return;
    }

    // Saving failed or error reported from renderer
    const choice = await this.dialogFn(this.window, {
      type: 'warning',
      buttons: ['Retry Save', 'Cancel', 'Close Without Saving'],
      defaultId: 1, // Default to Cancel so user does not lose work by accident
      cancelId: 1,
      title: 'Unsaved Changes',
      message: 'Failed to save changes before closing.',
      detail: payload.error
        ? `Error: ${payload.error}\n\nWould you like to retry saving, keep editing, or discard changes?`
        : 'Would you like to retry saving, keep editing, or discard changes?',
    });

    if (choice.response === 0) {
      // Retry Save
      this.startTimeoutTimer();
      try {
        this.window.webContents.send(IPC_CHANNELS.WINDOW_REQUEST_CLOSE);
      } catch {
        this.isCloseInProgress = false;
      }
    } else if (choice.response === 2) {
      // Close Without Saving
      this.isCloseConfirmed = true;
      this.isCloseInProgress = false;
      if (this.window && !this.window.isDestroyed()) {
        this.window.close();
      }
    } else {
      // Cancel (stay open)
      this.isCloseInProgress = false;
    }
  }

  public async handleTimeout(): Promise<void> {
    if (!this.isCloseInProgress || this.isDestroyed) return;

    this.clearTimeoutTimer();
    console.warn('[WindowCloseManager] Renderer did not respond within timeout period.');

    const choice = await this.dialogFn(this.window, {
      type: 'warning',
      buttons: ['Keep Waiting', 'Cancel', 'Force Close'],
      defaultId: 0,
      cancelId: 1,
      title: 'Application Unresponsive',
      message: 'Drawzware is taking longer than expected to close.',
      detail: 'The canvas may be busy saving or unresponsive. Do you want to force close or keep waiting?',
    });

    if (choice.response === 2) {
      // Force Close
      this.isCloseConfirmed = true;
      this.isCloseInProgress = false;
      if (this.window && !this.window.isDestroyed()) {
        this.window.destroy();
      }
    } else if (choice.response === 0) {
      // Keep Waiting
      this.startTimeoutTimer();
    } else {
      // Cancel
      this.isCloseInProgress = false;
    }
  }

  private startTimeoutTimer(): void {
    this.clearTimeoutTimer();
    this.timeoutTimer = setTimeout(() => {
      this.handleTimeout();
    }, this.timeoutMs);
  }

  private clearTimeoutTimer(): void {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
  }

  public destroy(): void {
    this.isDestroyed = true;
    this.clearTimeoutTimer();
    ipcMain.removeListener(IPC_CHANNELS.WINDOW_CLOSE_RESPONSE, this.ipcHandler);
  }

  public getInCloseProgress(): boolean {
    return this.isCloseInProgress;
  }

  public getIsCloseConfirmed(): boolean {
    return this.isCloseConfirmed;
  }
}
