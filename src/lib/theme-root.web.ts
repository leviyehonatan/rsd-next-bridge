/**
 * Document-level dark-theme application for Web — the load-bearing piece of the
 * RSD↔Next theming bridge.
 *
 * WHY the root has to be the DOCUMENT (`document.documentElement`), not a
 * wrapper div:
 *
 *  - RSD `css.createTheme` compiles to CSS custom-property *overrides* scoped to
 *    a class. Applying that class to a wrapper `html.div` themes only that
 *    wrapper's subtree.
 *  - Fixed-position overlays are PORTALED to `document.body` so they escape any
 *    ancestor with `transform`/`filter`/`contain` (the chart's scale transform
 *    is such an ancestor). A wrapper theme never reaches them.
 *  - `<body>` is inside `<html>`, so putting the theme classes on
 *    `documentElement` makes EVERY descendant — app content AND portaled
 *    overlays — inherit the dark CSS vars. This is the single most important
 *    decision in the bridge (see web-portal.ts + README).
 *
 * The class hashes come from the compiled theme objects at runtime
 * (theme-root-class.ts), never hardcoded.
 */
import { darkThemeClassString, rootClassTokens } from './theme-root-class';

/**
 * Apply/remove the given compiled dark-theme objects to/from `documentElement`.
 * Safe to call in any browser effect. No-op when `document` is absent (SSR/native).
 * Returns the set of classes that were applied (useful for tests).
 */
export function applyThemeToDocumentRoot(themes: unknown[], dark: boolean): string[] {
    if (typeof document === 'undefined') return [];
    const root = document.documentElement;
    const classString = darkThemeClassString(...themes);
    const tokens = rootClassTokens(classString);
    if (dark) {
        root.classList.add('theme-dark', ...tokens);
    } else {
        root.classList.remove('theme-dark', ...tokens);
    }
    root.style.colorScheme = dark ? 'dark' : 'light';
    return tokens;
}

/** The combined class string for the given themes ('' when empty). */
export function darkRootThemeClass(...themes: unknown[]): string {
    return darkThemeClassString(...themes);
}