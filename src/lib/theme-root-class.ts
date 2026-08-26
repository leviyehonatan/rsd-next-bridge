/**
 * Pure compiled-theme class extraction — NO react-strict-dom imports, so it's
 * unit-testable in node (and usable wherever the compiled shape appears).
 *
 * After the stylex Babel pass, each `css.createTheme()` is compiled to a
 * CompiledStyles map:
 *
 *     { '<themeName>': '<themeName>', <varGroupHash>: 'atomicClass hashClass', $$css: true }
 *
 * The CSS var-override trigger is the hash CLASS (its value is the
 * "atomicClass hashClass" pair). We read it off the compiled object rather than
 * hardcoding hashes — they change the moment any token moves.
 *
 * This is the heart of the RSD↔Next theming bridge: it lets you place the dark
 * theme override classes onto `documentElement` (see `web-theme-root.ts`), so
 * every descendant — including body-portaled overlays — inherits the CSS vars.
 */
export function compiledThemeClass(theme: unknown): string {
    if (!theme || typeof theme !== 'object') return '';
    const t = theme as Record<string, unknown>;
    if (t.$$css !== true) return '';
    for (const value of Object.values(t)) {
        // The var-group hash value is "atomicClass overrideClass" — a string with
        // a space. The self-referential name key ("tokens__darkTheme") has no space.
        if (typeof value === 'string' && value.includes(' ')) {
            return value;
        }
    }
    return '';
}

/** Combine several compiled themes into the dark-mode root class string. */
export function darkThemeClassString(...themes: unknown[]): string {
    return themes.map(compiledThemeClass).filter(Boolean).join(' ');
}

/** Split a space-separated class string into tokens for classList.add/remove. */
export function rootClassTokens(classString: string): string[] {
    return classString.split(' ').filter(Boolean);
}