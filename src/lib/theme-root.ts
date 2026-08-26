/**
 * Native no-op version of theme-root.web.ts.
 *
 * On native there is no shared document to theme — RSD themes are threaded via
 * React context from the root provider (see apps/native/app/_layout.tsx) and RN
 * Modal surfaces get raw hex via useThemeColors. So the document-root class
 * extraction/application is web-only; these no-op on native.
 */
export function applyThemeToDocumentRoot(_themes: unknown[], _dark: boolean): string[] {
    return [];
}

export function darkRootThemeClass(..._themes: unknown[]): string {
    return '';
}