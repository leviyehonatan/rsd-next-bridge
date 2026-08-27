'use client';
/**
 * Client providers — demonstrates `applyThemeToDocumentRoot` from the bridge.
 * A toggle flips effectiveScheme; the effect applies the two dark themes to
 * documentElement (instead of a wrapper), so even body-portaled content inherits.
 */
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { applyThemeToDocumentRoot } from '@leviyehonatan/rsd-next-bridge';
import { darkTheme, chartDarkTheme } from '../tokens/theme.vars.css';

const THEME_COOKIE = 'tunity_theme';

const ThemeContext = createContext<{ dark: boolean; toggle: () => void }>({
    dark: false,
    toggle: () => {},
});
export const useExampleTheme = () => useContext(ThemeContext);

export function Providers({ initialThemeDark, children }: { initialThemeDark: boolean; children: ReactNode }) {
    const [dark, setDark] = useState(initialThemeDark);

    // THE BRIDGE: apply the theme to document.documentElement (not a wrapper),
    // so every descendant — including body-portaled overlays — inherits the vars.
    useEffect(() => {
        applyThemeToDocumentRoot([darkTheme, chartDarkTheme], dark);
        document.cookie = `${THEME_COOKIE}=${dark ? 'dark' : 'light'}; path=/; samesite=lax`;
    }, [dark]);

    const toggle = () => setDark((d) => !d);
    return <ThemeContext.Provider value={{ dark, toggle }}>{children}</ThemeContext.Provider>;
}