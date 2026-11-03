import { browser } from '$app/environment';
import type { ApexOptions } from 'apexcharts';

// The theme store toggles `.dark` on <html>; watch the class so charts follow
// both the explicit toggle and the "System" preference.
let dark = $state(false);

if (browser) {
  const root = document.documentElement;
  dark = root.classList.contains('dark');
  new MutationObserver(() => {
    dark = root.classList.contains('dark');
  }).observe(root, { attributes: true, attributeFilter: ['class'] });
}

export const chartMode = {
  get dark() {
    return dark;
  },
};

/**
 * Categorical slots in fixed order (validated for CVD separation in both modes).
 * Assign by position, never cycle: anything past the last slot folds into "Other".
 */
const SERIES_LIGHT = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6'];
const SERIES_DARK = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9'];
const OTHER_LIGHT = '#94a3b8';
const OTHER_DARK = '#64748b';

export const MAX_CATEGORIES = SERIES_LIGHT.length;

export function seriesColors(isDark: boolean): string[] {
  return isDark ? SERIES_DARK : SERIES_LIGHT;
}

export function otherColor(isDark: boolean): string {
  return isDark ? OTHER_DARK : OTHER_LIGHT;
}

/** Card surface, matching `--card` in app.css (Apex needs hex, not oklch). */
export function surfaceColor(isDark: boolean): string {
  return isDark ? '#1d293d' : '#ffffff';
}

export function baseChartOptions(isDark: boolean): ApexOptions {
  return {
    chart: {
      background: 'transparent',
      fontFamily: 'inherit',
      foreColor: isDark ? '#90a1b9' : '#62748e',
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    theme: { mode: isDark ? 'dark' : 'light' },
    grid: {
      borderColor: isDark ? '#314158' : '#e2e8f0',
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
    },
    dataLabels: { enabled: false },
    legend: { show: false },
    tooltip: { theme: isDark ? 'dark' : 'light' },
  };
}
