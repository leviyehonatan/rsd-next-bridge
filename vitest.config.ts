import { defineConfig } from 'vitest/config';

/**
 * Unit tests only.
 *
 * `example/e2e/**` holds Playwright specs (`@playwright/test`), which vitest's
 * default include would otherwise pick up and fail on — Playwright isn't a
 * devDependency here, so `vitest run` was red out of the box and nobody could
 * tell a real failure from that one.
 */
export default defineConfig({
    test: {
        include: ['src/**/*.test.ts', 'src/**/*.test.cjs'],
        exclude: ['**/node_modules/**', 'example/**'],
        environment: 'node',
    },
});
