/**
 * Root layout — demonstrates the bridge's SSR no-flash story:
 *   - imports `./stylex.css` (the `@stylex;` at-rule the collector expands in prod)
 *   - derives the compiled dark-theme root class (via bridge theme-root) so SSR
 *     can put it on <html> with zero flash
 *   - shells an inline head script that applies theme classes before hydration
 */
import './stylex.css';
import './global-base.css';
import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { darkTheme, chartDarkTheme } from '../tokens/theme.vars.css';
import { darkRootThemeClass } from '@repo/rsd-next-bridge/theme-root';
import { Providers } from './providers';

// The compiled dark-theme classes for the two theme families (extracted at
// runtime from the transpiled objects — never hardcoded hashes).
const DARK_ROOT_THEME_CLASS = darkRootThemeClass(darkTheme, chartDarkTheme);
const DARK_JSON = JSON.stringify(DARK_ROOT_THEME_CLASS || '');

// Inline pre-hydration script: read the preference cookie + OS scheme, toggle
// theme-dark + the compiled classes on documentElement before first paint.
const NO_FLASH_SCRIPT = `(function(){try{
var _m=document.cookie.match(/(?:^|; )tunity_theme=(light|dark|system)/);
var _pref=_m?_m[1]:'system';
var _os=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
var _dark=_pref==='dark'||(_pref==='system'&&_os==='dark');
var _e=document.documentElement;
var _cls=${DARK_JSON};
if(_dark){_e.classList.add('theme-dark');if(_cls)_e.classList.add.apply(_e.classList,_cls.split(' '));}
else{_e.classList.remove('theme-dark');if(_cls)_e.classList.remove.apply(_e.classList,_cls.split(' '));}
_e.style.colorScheme=_dark?'dark':'light';
}catch(_e){}})();`;

export default async function RootLayout({ children }: { children: ReactNode }) {
    // SSR: read the preference cookie so first paint matches (light default).
    const cookieStore = await cookies();
    const themeDark = cookieStore.get('tunity_theme')?.value === 'dark';

    return (
        <html lang="en" dir="ltr" className={themeDark ? 'theme-dark ' + DARK_ROOT_THEME_CLASS : undefined} suppressHydrationWarning>
            <head>
                <meta name="color-scheme" content="light dark" />
                <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
            </head>
            <body>
                <Providers initialThemeDark={themeDark}>{children}</Providers>
            </body>
        </html>
    );
}