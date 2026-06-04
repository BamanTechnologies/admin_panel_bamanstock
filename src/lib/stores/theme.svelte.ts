import { browser } from '$app/environment';

export type Theme = 'Light' | 'Dark' | 'System';

function createThemeStore() {
  let theme = $state<Theme>('Light');
  let mediaQuery: MediaQueryList | null = null;

  function effective(t: Theme): 'dark' | 'light' {
    if (t === 'System') {
      return mediaQuery?.matches ? 'dark' : 'light';
    }
    return t === 'Dark' ? 'dark' : 'light';
  }

  function apply(t: Theme) {
    if (!browser) return;
    document.documentElement.classList.toggle('dark', effective(t) === 'dark');
    localStorage.setItem('theme', t);
  }

  function init() {
    if (!browser) return;
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const saved = (localStorage.getItem('theme') as Theme | null) ?? 'Light';
    theme = saved;
    apply(saved);
    mediaQuery.addEventListener('change', () => {
      if (theme === 'System') apply('System');
    });
  }

  function set(t: Theme) {
    theme = t;
    apply(t);
  }

  return {
    get current() { return theme; },
    init,
    set,
  };
}

export const themeStore = createThemeStore();
