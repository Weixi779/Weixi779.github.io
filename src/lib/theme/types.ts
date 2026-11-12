// Created by weixi on 2026/10/25.

export type ColorMode = 'light' | 'dark';
export type ColorModePreference = ColorMode | 'system';

export interface ThemeState {
  colorMode: ColorMode;
  modePreference: ColorModePreference;
}

export interface ThemeController {
  getState(): Readonly<ThemeState>;
  setPreference(mode: ColorModePreference): void;
  refreshPreference(): void;
  subscribe(listener: () => void): () => void;
  dispose(): void;
}

declare global {
  interface Window {
    blogTheme: ThemeController;
  }

  interface WindowEventMap {
    'blog-theme-change': CustomEvent<ThemeState>;
  }
}
