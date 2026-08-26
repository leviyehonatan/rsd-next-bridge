/**
 * Example theme — the app-specific palette that composes the generic bridge.
 * This is the "what the app looks like" side (kept out of the bridge itself).
 *
 * Uses the `.css.ts` naming the StyleX `themeFileExtension: '.css'` mapping
 * expects (the collector rewrites `.css` → `.css.ts`), matching the real app's
 * `tokens.vars.css.ts`.
 */
import { css } from 'react-strict-dom';

export const colors = css.defineVars({
    primary: '#2563eb',
    background: '#f9fafb',
    foreground: '#111827',
    card: '#ffffff',
    muted: '#f1f5f9',
    border: '#e5e7eb',
});

export const darkTheme = css.createTheme(colors, {
    primary: '#60a5fa',
    background: '#0b0f17',
    foreground: '#f9fafb',
    card: '#111827',
    muted: '#1e293b',
    border: '#374151',
});

// A second theme family (like the real chart theme) to show multiple
// createTheme roots composing on documentElement.
export const chartColors = css.defineVars({
    paperBg: '#ffffff',
    paperInk: '#111827',
});

export const chartDarkTheme = css.createTheme(chartColors, {
    paperBg: '#0b0f17',
    paperInk: '#f9fafb',
});