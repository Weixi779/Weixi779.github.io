import {
  defaultThemeId,
  themeCatalog,
  type ColorMode,
  type ThemeId,
} from './generated/catalog';

export { defaultThemeId, themeCatalog };
export type { ColorMode, ThemeId };

export type ColorModePreference = ColorMode | 'system';

export interface ThemePreference {
  themeId: ThemeId;
  mode: ColorModePreference;
}

export const themeStorageKey = 'blog-theme-preference';
export const themeIds = themeCatalog.map(({ id }) => id) as ThemeId[];

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && themeIds.some((themeId) => themeId === value);
}

export function isColorMode(value: unknown): value is ColorMode {
  return value === 'light' || value === 'dark';
}

export function isColorModePreference(value: unknown): value is ColorModePreference {
  return value === 'system' || isColorMode(value);
}
