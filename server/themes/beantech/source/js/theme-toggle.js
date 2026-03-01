(function () {
  var STORAGE_KEY = 'blog-theme';
  var root = document.documentElement;

  function getStoredTheme() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function getSystemTheme() {
    var media = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    return media && media.matches ? 'dark' : 'light';
  }

  function resolveTheme() {
    var stored = getStoredTheme();
    if (stored === 'dark' || stored === 'light') {
      return stored;
    }
    return getSystemTheme();
  }

  function persistTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {}
  }

  function updateToggleButton(theme) {
    var button = document.getElementById('theme-toggle');
    if (!button) return;

    var icon = button.querySelector('i');
    var text = button.querySelector('.theme-toggle-text');
    var isDark = theme === 'dark';
    var targetThemeLabel = isDark ? 'light' : 'dark';

    if (icon) {
      icon.className = 'fa ' + (isDark ? 'fa-sun-o' : 'fa-moon-o');
      icon.setAttribute('aria-hidden', 'true');
    }
    if (text) {
      text.textContent = isDark ? 'Light' : 'Dark';
    }

    button.setAttribute('aria-label', 'Switch to ' + targetThemeLabel + ' mode');
    button.setAttribute('title', 'Switch to ' + targetThemeLabel + ' mode');
    button.setAttribute('data-theme', theme);
  }

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    updateToggleButton(theme);
  }

  function toggleTheme() {
    var current = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    var next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    persistTheme(next);
  }

  function bindToggle() {
    var button = document.getElementById('theme-toggle');
    if (!button) return;
    button.addEventListener('click', function (event) {
      event.preventDefault();
      toggleTheme();
    });
    updateToggleButton(root.getAttribute('data-theme') || resolveTheme());
  }

  window.__toggleTheme = toggleTheme;

  if (root.getAttribute('data-theme') !== 'dark' && root.getAttribute('data-theme') !== 'light') {
    applyTheme(resolveTheme());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindToggle);
  } else {
    bindToggle();
  }

  if (window.matchMedia) {
    var media = window.matchMedia('(prefers-color-scheme: dark)');
    var handleSystemThemeChange = function (event) {
      var stored = getStoredTheme();
      if (stored === 'dark' || stored === 'light') return;
      applyTheme(event.matches ? 'dark' : 'light');
    };
    if (media.addEventListener) {
      media.addEventListener('change', handleSystemThemeChange);
    } else if (media.addListener) {
      media.addListener(handleSystemThemeChange);
    }
  }
})();
