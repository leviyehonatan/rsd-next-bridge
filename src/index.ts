/**
 * @leviyehonatan/rsd-next-bridge — the reusable bridge that makes React Strict DOM (RSD)
 * work inside a Next.js (App Router, webpack) app.
 *
 * Barrel for the TypeScript/runtime pieces. The Babel preset + PostCSS collector
 * are CommonJS and exported via package.json `exports` subpaths (see README).
 */
export { compiledThemeClass, darkThemeClassString, rootClassTokens } from './lib/theme-root-class';
export { applyThemeToDocumentRoot, darkRootThemeClass } from './lib/theme-root.web';
export { portalToBody } from './lib/web-portal.web';