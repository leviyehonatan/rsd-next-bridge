/**
 * Render `node` into `document.body` (web). A fixed-position overlay must escape
 * any ancestor with a `transform`/`filter`/`contain` — those become the
 * containing block for fixed descendants, so `position: fixed; inset: 0` would
 * anchor to that ancestor instead of the viewport (the chart's scale transform
 * does exactly this). Portaling to body sidesteps it, the same way RN Modal does.
 *
 * Returns null during SSR (no `document`); the overlay is a client-only
 * interaction, so this never drops server-rendered content.
 *
 * THEME: portals mount onto <body>, which is INSIDE <html> — and the dark app +
 * chart theme classes are applied on <html> (documentElement) by theme-root.web,
 * so portaled content automatically inherits the CSS vars. No per-portal theme
 * re-application is needed (unlike a wrapper-based theme, which portals escape).
 */
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function portalToBody(node: ReactNode): ReactNode {
    if (typeof document === 'undefined') return null;
    return createPortal(node, document.body);
}