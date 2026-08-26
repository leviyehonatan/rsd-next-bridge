# @leviyehonatan/rsd-next-bridge

The reusable bridge that makes **React Strict DOM (RSD)** work inside a **Next.js**
(App Router, webpack) app — including the theming that crosses the React/DOM
boundary. RSD is a cross-platform React toolkit: `html.*` + `css.create()` compile
to DOM with StyleX underneath on web, and to native views on iOS/Android via the
same API. That is enormously powerful for a one-codebase app, but it does **not**
work in Next.js out of the box. This package is the glue.

It is the extracted, versioned home for the machinery that an RSD-powered Next
app needs, so the "how does RSD + Next actually interoperate?" knowledge lives in
one place with a README instead of being scattered across a `babel.config.js`, a
`postcss.config.js`, a few `.web.ts` modules and an inline head script.

> **Keep in sync:** the app's palette values (`tokens.vars.css.ts`, `color-values.ts`,
> `chart-theme.css.ts`, `theme-context.tsx`, the `NO_FLASH` script, and the
> `ThemeProvider`/cookies) are **app-specific** and intentionally live in
> `packages/app`. This package holds only the **generic mechanism**. See
> [What lives here vs. the app](#what-lives-here-vs-the-app).

---

## The one-sentence version

> RSD compiles `css.create()` into StyleX class names + `var(--x…)` references at
> Babel time; something must turn those into real CSS, and because two platforms
> (web-build, web-dev, native) each do that differently, a "bridge" picks the
> right strategy per environment and keeps every Babel pass using the exact same
> StyleX version so hashes never diverge. Separately, dark-theme application must
> target `documentElement` (not a wrapper) so body-portaled overlays still inherit
> the CSS variables.

---

## The mental model: two independent problems

The bridge solves **two** orthogonal things. Don't conflate them.

### Problem 1 — Turning compiled StyleX metadata into real CSS ("style emission")

`css.create()` produces class names at build time, but the CSS rules behind those
class names have to be **emitted somewhere**:

| Environment | How CSS is produced |
|---|---|
| **Native (Expo/Metro)** | Runtime injection. The stylex Babel plugin adds `inject(cssText, priority)` calls; `stylex/inject.js` appends a `<style data-stylex>` on web / patches the native runtime sheet. Works always. |
| **Web — production build** | Build-time extraction. `next build --webpack` runs the `@stylexjs/postcss-plugin` ("the collector"), which does a **separate** Babel pass and replaces the `@stylex;` at-rule in `app/stylex.css` with the collected rules. |
| **Web — dev (`next dev`)** | **Broken by default.** `next dev` does **not** expand the `@stylex;` at-rule, so pages come out unstyled. The bridge's Babel preset enables **runtime injection** in dev (the same `inject.js` native uses), giving dev parity. |

The nastiest constraint: every Babel pass that computes a hash **must use the
same StyleX version**, or the class names in the JS won't match the selectors in
the CSS. RSD 0.0.55 bundles `@stylexjs/*@0.15.4` as nested deps; a separate
`@stylexjs/*@0.17.5` is also present in the tree. **Only the nested 0.15.4 is used**
by every pass that touches hashes — resolved by **absolute path** from the
`react-strict-dom/package.json` location, because those subpaths aren't in RSD's
`exports` map. See `src/babel/preset.js` and `src/postcss/collector.cjs`.

### Problem 2 — Applying the dark theme where portal overlays can see it ("theming roots")

`css.createTheme()` compiles to CSS **custom-property overrides scoped to a class**.
The natural instinct is to put that class on a root `<div>` (a `ThemeProvider`
wrapper) so every descendant resolves the dark vars. **But fixed-position overlays
are portaled to `document.body`** to escape ancestors with `transform`/`filter`/
`contain` — the chart's scale transform is such an ancestor. A wrapper theme never
reaches a portal.

The fix: apply the theme classes to **`document.documentElement`** — `<body>` is
inside `<html>`, so **every** descendant, portaled or not, inherits the CSS vars.
This is the single most important design decision. See `src/lib/theme-root.web.ts`.

---

## Verified behavior + known limitations (read before adopting)

This table is the **honest contract** — what has been verified end-to-end vs what
is NOT guaranteed. Package users should plan around these.

| Capability | Verified? | Notes |
|---|---|---|
| Prod build emits full atomic CSS (`next build --webpack`) | ✅ | Both the real app (788 atomic rules) and the example (39). Collector + main Babel pass hash-match via RSD's nested 0.15.4. |
| SSR `<html>` carries dark theme classes | ✅ | Verified via curl on both apps (`class="theme-dark xdl0yt4 …"` for a `tunity_theme=dark` cookie). |
| No-flash inline head script | ✅ | Applies theme classes pre-hydration; standalone server confirmed. |
| Dev styling via runtime injection (`next dev --webpack`) | ✅ | Real browser: 61–345 stylex rules in the live CSSOM, elements resolve themed backgrounds. |
| Prod SSR render is styled | ✅ | Built server serves CSS with atomics; browsers render themed UI. |
| **HMR (edit a file → live update)** | ✅ **when loopback is allow-listed** | Verified on the real app AND the example: editing a `css.create` color hot-updates the runtime-injected stylex sheet with no reload; HMR websocket connects cleanly (0 errors). See below for the one gotcha. |
| Turbopack dev (`next dev` with no `--webpack`) | ❌ | RSD needs Babel/StyleX; Turbopack can't resolve the absolute/dynamic requires the bridge uses (verified: module-not-found on inject + collector). This is why the whole pipeline pins webpack. |

### The ONE thing that breaks HMR (and the fix)

`next dev` does **not** run the `@stylex;` collector, but that is NOT why HMR can appear dead.
The real, silent killer is **Next 16's cross-origin dev guard**: the HMR websocket is the only
`/_next/*` request that carries an `Origin` header, and if that origin is not in
`allowedDevOrigins`, Next rejects the *upgrade* by writing a bare `Unauthorized` — which the
browser reports as `ERR_INVALID_HTTP_RESPONSE` and **silently never hydrates**. The page
looks fine, but client controls are inert and file edits never push (because the socket is dead).

Fix — allow loopback (localhost is NOT allow-listed by default, and `127.0.0.1` definitely isn't):

```js
// next.config.js
allowedDevOrigins: ['localhost', '127.0.0.1', '::1', /* LAN IPs / wildcards as needed */],
```

Once added: the HMR websocket connects, and runtime-injected stylex styles **hot-update on
save** (no reload). Verified on both the real tunity app and the example (`e2e/` runs). The
tunity app's `lanDevOrigins()` originally filtered out loopback — that's how this bites.
This issue is tracked upstream: https://github.com/vercel/next.js/issues/96320

This issue is tracked upstream: https://github.com/vercel/next.js/issues/96320

---

## What lives here vs. the app

| Reusable mechanism (this package) | App-specific (stays in `packages/app`) |
|---|---|
| Babel preset / style-emission strategy (`src/babel/preset.js`) | The actual palette — `colors`, `spacing`, `colorValues`, `darkTheme` (`tokens.vars.css.ts`, `color-values.ts`, `dark-color-values.ts`) |
| PostCSS collector config (`src/postcss/collector.cjs`) | The chart theme values re-expressed as `defineVars` (`chart-theme.css.ts`) |
| `tokens.stylex` → theme rewrite plugin (`src/babel/rsd-theme-plugin.cjs`) | `ThemeProvider`/`useTheme` + preference persistence + cookies (`theme-context.tsx`) |
| Document-root theming (`src/lib/theme-root*.ts`, `theme-root-class.ts`) | The `NO_FLASH` inline head script (`apps/web/app/layout.tsx`) |
| Body-portal helper (`src/lib/web-portal*.ts`) | SSR scheme resolution (`apps/web/lib/theme.ts`) |
| | `next.config.js` webpack wiring (the app's own config) |

The line: **this package is "how RSD + Next interoperates"; the app is "what the
app looks like (colors/theme)".** Keep token VALUES out of here.

---

## Package structure

```
src/
├── babel/
│   ├── preset.js            # Babel preset: dev runtime injection vs prod collector;
│   │                        #   resolves RSD's nested stylex 0.15.4 by absolute path.
│   └── rsd-theme-plugin.cjs # Rewrites `tokens.stylex` → a css.defineVars theme module
│                            #   (so plain-object themes compile + can be overridden).
├── postcss/
│   └── collector.cjs        # `@stylexjs/postcss-plugin` config: build-time CSS extraction,
│                            #   matching the main build's hashes (nested 0.15.4).
├── lib/
│   ├── theme-root-class.ts      # Pure: pull the override class off a compiled
│   │                             #   css.createTheme object (never hardcode hashes).
│   ├── theme-root.web.ts        # Apply dark theme classes to document.documentElement.
│   ├── theme-root.ts            # Native no-op (context-based theming instead).
│   ├── web-portal.web.ts        # createPortal(node, document.body) — SSR-safe.
│   └── web-portal.ts            # Native no-op.
└── index.ts                # TS barrel (runtime pieces).
```

---

## How to use it

### 1. Babel preset (`apps/web/babel.config.js`)

```js
const path = require('path');

module.exports = {
    presets: [
        [
            require('@leviyehonatan/rsd-next-bridge/babel-preset'),
            {
                dev: process.env.NODE_ENV !== 'production',
                rootDir: __dirname,
                // Only needed if you consume a plain-object theme dep (chord-chart-rsd).
                themeCssPath: path.resolve(__dirname, '../../packages/app/src/lib/chart-theme.css'),
            },
        ],
        'next/babel',
    ],
    // Keep module-resolver for @/ aliases; do NOT add babel-plugin-react-compiler here
    // (wire the React Compiler via next.config.js `reactCompiler: true` instead).
    plugins: [
        ['babel-plugin-module-resolver', { root: [require('./alias.config').SRC], alias: require('./alias.config').moduleResolverAlias }],
    ],
};
```

The preset:
- **dev** → composes the RSD plugins manually with `runtimeInjection` pointing at
  `stylex/inject.js`.
- **prod** → uses `react-strict-dom/babel-preset` with injection off (the collector
  handles CSS).

### 2. PostCSS collector (`apps/web/postcss.config.js`)

```js
const path = require('path');
const { stylexCollectorConfig } = require('@leviyehonatan/rsd-next-bridge/postcss');

module.exports = {
    plugins: {
        ...stylexCollectorConfig({
            webDir: __dirname,
            themeCssPath: path.resolve(__dirname, '../../packages/app/src/lib/chart-theme.css'),
            rootDir: __dirname,
            include: [
                'app/**/*.{js,jsx,ts,tsx}',
                '../../packages/app/src/**/*.{js,jsx,ts,tsx}',
                '../../node_modules/chord-chart-rsd/src/**/*.{js,jsx,ts,tsx}',
            ],
            moduleResolver: {
                root: [require('./alias.config').SRC],
                alias: require('./alias.config').moduleResolverAlias,
            },
        }),
        autoprefixer: {},
    },
};
```

### 3. The `@stylex;` entry (`apps/web/app/stylex.css`)

A single line — the injection point the collector expands in prod:

```css
@stylex;
```

Import it from the root layout: `import './stylex.css';`

### 4. Document-root theming + portals

Compose the generic helpers with YOUR theme objects:

```ts
import { applyThemeToDocumentRoot, portalToBody } from '@leviyehonatan/rsd-next-bridge';
import { darkTheme } from '@/lib/tokens.vars.css';       // app palette
import { chartDarkTheme } from '@/lib/chart-theme.css';   // chart palette

// In a useEffect reacting to scheme changes (web):
applyThemeToDocumentRoot([darkTheme, chartDarkTheme], effectiveScheme === 'dark');

// For fixed overlays, portal to body — it inherits the vars because the theme
// classes are on <html>, not a wrapper:
portalToBody(<FixedOverlay />);
```

---

## Deep dives

### Why the document root (not a wrapper) for theming

CSS custom properties inherit down the **DOM** tree. Put the theme class on a
wrapper `<div>` and only that subtree is dark. Portals render into `document.body`,
which is *outside* any wrapper — so they stay light (or transparent). Moving the
classes to `documentElement` makes `<html> -> <body> -> every portal` all inherit.
This is also why `ChartView`'s fullscreen and `ResponsiveModal`'s web portal "just
work" in dark mode with no per-component theme re-application.

### Why hashes must match, and how we keep them in sync

`css.create()` (in the main Babel pass) and the collector (PostCSS) both emit
class names derived from **the same inputs**: file path, property, value, and the
StyleX plugin version. If either the version or the `rootDir`/`themeFileExtension`
differs, the JS references `x…` classes that don't exist in the emitted CSS → every
themed property falls back to transparent/black (the classic "101/111 vars
undefined" symptom). The bridge forces every pass onto RSD's nested 0.15.4 via
`require.resolve` absolute paths.

### Why `tokens.stylex` gets rewritten

`chord-chart-rsd` ships its theme as **plain objects** (`tokens.stylex.ts`) so
Obsidian's non-stylex esbuild pipeline can use it. In a stylex-compiling monorepo,
`theme.paperBg` has to be a `css.defineVars` value (→ `var(--x…)`) so `createTheme`
can override it. `rsd-theme-plugin.cjs` rewrites that import to your theme module.

### Dev vs prod emission (the trap this package removes)

The default RSD preset + build-only collector looks like it "should" work in dev
too, but `next dev --webpack` does not run the PostCSS collector. Without the
dev runtime-injection path, `localhost` is unstyled even though `next build`
works — a silent, confusing failure. The preset makes dev use `inject.js`, giving
parity.

---

## Diagnostics

Two scripts in this repo (`scripts/diagnose-stylex.cjs`, `scripts/diagnose-stylex-vars.cjs`)
re-run the collector pass without the silent error-swallowing to surface files that
throw or that use `css.create` but yield zero rules. Run them after any theme/token
change:

```bash
node scripts/diagnose-stylex.cjs
node scripts/diagnose-stylex-vars.cjs apps/web/.next/static/css/app/layout.css
```

---

## Example app (living reference + tests)

`example/` is a minimal Next.js app that consumes the bridge exactly like a real
consumer would, and doubles as the executable test of every feature:

- **`app/layout.tsx`** — SSR no-flash: derives `darkRootThemeClass(darkTheme, chartDarkTheme)`
  via the bridge and puts the classes on `<html>` (server + inline head script).
- **`app/providers.tsx`** — `applyThemeToDocumentRoot([darkTheme, chartDarkTheme], dark)`
  on scheme change, so body-portaled overlays inherit the CSS vars.
- **`src/DemoCard.tsx`** — RSD `css.create` styles driven by `colors.*` (defineVars),
  demonstrating that styles flip with the document-root theme.
- **`src/PortalModal.tsx`** — a modal portaled to `document.body` via
  `portalToBody`; it's themed automatically because the theme is on `<html>`.
- **`tokens/theme.vars.css.ts`** — two `defineVars` families (`colors`/`chartColors`)
  + their `createTheme` dark variants (the app-specific "values" side).
- **`e2e/verify.cjs`** — `npm test`: builds the example and asserts (1) the prod
  CSS has atomic rules + the dark theme var, (2) `next dev` bundles carry the
  stylex runtime-injection module (so dev isn't blank). Green = the bridge works
  end to end.
- **`e2e/dev-styling.spec.ts`** — `npm run test:dev-styling`: a Playwright test
  that boots `next dev` and asserts a real browser gets a **styled page on load**
  (stylex rules in the CSSOM + a themed element resolves a real color) — the
  hard-reload contract. It does NOT assert HMR, because HMR is not guaranteed
  (see "Verified behavior + known limitations").

Run it:

```bash
cd packages/rsd-next-bridge/example
npm install        # links @leviyehonatan/rsd-next-bridge via the workspace
npm run dev        # http://localhost:3007 — toggle theme, open the portal
npm test           # build + dev-injection assertions (verify.cjs)
npm run test:dev-styling   # Playwright: dev page is styled on load
```

The example's `babel.config.js` / `postcss.config.js` / `next.config.js` are the
canonical "how to wire the bridge" reference — copy them into any Next app.

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `next build` styled, `next dev` blank | Dev runtime injection not enabled (`dev: true` in the preset, or injection path wrong). |
| Themed vars render transparent/black | Hash mismatch — a pass used a different stylex version or `rootDir`. Ensure `react-strict-dom` is resolved from **the** tree and `rootDir` = `apps/web`. |
| Chart theme wrong in dark mode | `tokens.stylex` not rewritten to your `chart-theme.css` (check `themeCssPath`). |
| Portals stuck on light | Theme classes on a wrapper, not `documentElement` (use `applyThemeToDocumentRoot`). |
| `_rsdMerge is not defined` | RSD preset/plugins ordering — RSD must run after `next/babel`. |