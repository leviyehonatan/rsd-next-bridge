/**
 * Native no-op version of web-portal.web.ts. `portalToBody` returns the node
 * unchanged so shared code can import it without pulling `react-dom` into the
 * native bundle / tree.
 */
import type { ReactNode } from 'react';

export function portalToBody(node: ReactNode): ReactNode {
    return node;
}