// Created by weixi on 2026/10/25.

import { createThemeController } from './controller';

// The document entry point owns one instance. Neither factory owns a global instance.
if (!window.blogTheme) {
  const storageKey = 'blog-theme-preference';
  const systemScheme = window.matchMedia('(prefers-color-scheme: dark)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;
  const theme = createThemeController({
    storage: {
      read: () => window.localStorage.getItem(storageKey),
      write: (value) => window.localStorage.setItem(storageKey, value),
    },
    system: {
      isDark: () => systemScheme.matches,
      subscribe(listener) {
        const onChange = () => listener(systemScheme.matches);
        systemScheme.addEventListener('change', onChange);
        return () => systemScheme.removeEventListener('change', onChange);
      },
    },
  });

  // Shared handle for the current Astro consumers. A React root can receive the
  // same instance through props / Context; it must not construct another store.
  window.blogTheme = theme;
  let transition: ViewTransition | undefined;

  function apply() {
    // Queued transitions always render the latest state, never a captured old choice.
    const state = theme.getState();
    if (root.dataset.colorMode === state.colorMode && root.dataset.colorModePreference === state.modePreference) return;
    root.dataset.colorMode = state.colorMode;
    root.dataset.colorModePreference = state.modePreference;
    window.dispatchEvent(new CustomEvent('blog-theme-change', { detail: state }));
  }

  const stopRendering = theme.subscribe(() => {
    transition?.skipTransition();
    if (root.dataset.colorMode === theme.getState().colorMode || reducedMotion.matches || !document.startViewTransition) {
      apply();
      return;
    }
    transition = document.startViewTransition(apply);
    transition.finished.catch(() => {});
  });
  apply();

  function onPageShow(event: PageTransitionEvent) {
    if (!event.persisted) return;
    theme.refreshPreference();
    // Restore immediately, even if a view transition has a queued update.
    transition?.skipTransition();
    apply();
  }
  window.addEventListener('pageshow', onPageShow);

  window.addEventListener('pagehide', (event) => {
    // A page in the back/forward cache still owns its live controller.
    if (event.persisted) return;
    window.removeEventListener('pageshow', onPageShow);
    stopRendering();
    theme.dispose();
  });
}
