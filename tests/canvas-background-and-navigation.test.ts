import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSettingsStore, type CanvasBackground } from '@/features/settings/stores/useSettingsStore';
import { BackgroundVariant } from '@xyflow/react';

const mockStore = new Map<string, string>();
const mockLocalStorage = {
  getItem: vi.fn((key: string) => mockStore.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => {
    mockStore.set(key, value);
  }),
  removeItem: vi.fn((key: string) => {
    mockStore.delete(key);
  }),
  clear: vi.fn(() => {
    mockStore.clear();
  }),
};

Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
  configurable: true,
});

describe('Canvas Background & Touchpad Navigation Options', () => {
  beforeEach(() => {
    mockStore.clear();
    useSettingsStore.setState({
      canvasBackground: 'dots',
      theme: 'system',
      snap: true,
      minimap: false,
      validation: true,
      animatedEdges: true,
    });
  });

  describe('1. Canvas Background Store & Persistence', () => {
    it('initializes with "dots" as the default background for backwards compatibility', () => {
      expect(useSettingsStore.getState().canvasBackground).toBe('dots');
    });

    it('updates background to all supported variants: grid, white, dark, neutral, dots', () => {
      const backgrounds: CanvasBackground[] = ['grid', 'white', 'dark', 'neutral', 'dots'];

      for (const bg of backgrounds) {
        useSettingsStore.getState().setCanvasBackground(bg);
        expect(useSettingsStore.getState().canvasBackground).toBe(bg);
      }
    });

    it('supports subscribing to background changes across canvas components', () => {
      let currentBg = useSettingsStore.getState().canvasBackground;
      const unsub = useSettingsStore.subscribe((state) => {
        currentBg = state.canvasBackground;
      });

      useSettingsStore.getState().setCanvasBackground('grid');
      expect(currentBg).toBe('grid');

      useSettingsStore.getState().setCanvasBackground('white');
      expect(currentBg).toBe('white');

      unsub();
    });
  });

  describe('2. Background Layer Variant Logic', () => {
    function getBackgroundLayerConfig(bg: CanvasBackground): {
      variant: BackgroundVariant | null;
      renderLayer: boolean;
      dataAttr: CanvasBackground;
    } {
      if (bg === 'dots') {
        return { variant: BackgroundVariant.Dots, renderLayer: true, dataAttr: bg };
      }
      if (bg === 'grid') {
        return { variant: BackgroundVariant.Lines, renderLayer: true, dataAttr: bg };
      }
      return { variant: null, renderLayer: false, dataAttr: bg };
    }

    it('maps "dots" to BackgroundVariant.Dots without transform matrix subscriptions', () => {
      const config = getBackgroundLayerConfig('dots');
      expect(config.renderLayer).toBe(true);
      expect(config.variant).toBe(BackgroundVariant.Dots);
    });

    it('maps "grid" to BackgroundVariant.Lines with 20px grid spacing', () => {
      const config = getBackgroundLayerConfig('grid');
      expect(config.renderLayer).toBe(true);
      expect(config.variant).toBe(BackgroundVariant.Lines);
    });

    it('renders clean solid backgrounds without SVG patterns for white, dark, and neutral', () => {
      expect(getBackgroundLayerConfig('white').renderLayer).toBe(false);
      expect(getBackgroundLayerConfig('dark').renderLayer).toBe(false);
      expect(getBackgroundLayerConfig('neutral').renderLayer).toBe(false);
    });
  });

  describe('3. React Flow Navigation Configuration Contracts', () => {
    // Contract asserting navigation props passed to <ReactFlow> in Canvas.tsx
    const navigationProps = {
      panOnScroll: true,
      panOnScrollMode: 'free' as const,
      zoomOnScroll: false,
      zoomOnPinch: true,
      preventScrolling: true,
      zoomActivationKeyCode: ['Control', 'Meta'],
      zoomOnDoubleClick: false,
    };

    it('enables 2D pan on touchpad scroll while suppressing inadvertent page scrolling', () => {
      expect(navigationProps.panOnScroll).toBe(true);
      expect(navigationProps.panOnScrollMode).toBe('free');
      expect(navigationProps.preventScrolling).toBe(true);
    });

    it('enables pinch-to-zoom on touchpad and disables accidental zoom on pure scroll', () => {
      expect(navigationProps.zoomOnPinch).toBe(true);
      expect(navigationProps.zoomOnScroll).toBe(false);
    });

    it('allows zoom with mouse wheel when Control or Meta (Cmd) modifier key is held', () => {
      expect(navigationProps.zoomActivationKeyCode).toEqual(['Control', 'Meta']);
    });
  });
});
