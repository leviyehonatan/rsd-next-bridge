import { defineConfig } from '@playwright/test';

// Example app's Playwright config. The HMR spec spawns its OWN `next dev` (so it
// can mutate files mid-test) — hence no `webServer` here.
export default defineConfig({
    testDir: './e2e',
    testMatch: '**/*.spec.ts',
    workers: 1, // singleton dev server per run
    timeout: 150_000,
    reporter: 'list',
    use: {
        trace: 'retain-on-failure',
        actionTimeout: 15_000,
        navigationTimeout: 90_000,
    },
});