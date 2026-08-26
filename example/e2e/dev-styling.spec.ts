import { test, expect } from '@playwright/test';
import { spawn, spawnSync, type ChildProcess } from 'child_process';
import path from 'path';

// Dev styling contract test — proves runtime injection styles a fresh dev page.
//
// The trap this guards: `next dev` does NOT run the postcss collector, so styles
// come ONLY from the runtime injected `<style data-stylex>`. If the injection is
// broken, the page is unstyled even though it loads fine. This test makes that
// failure loud.
//
// NOTE on HMR: works when `allowedDevOrigins` includes loopback (localhost/127.0.0.1).
// Without it, Next 16 rejects the HMR websocket upgrade (bare "Unauthorized" →
// ERR_INVALID_HTTP_RESPONSE → silent no-hydrate). This spec asserts the styled-on-load
// contract (which is the hard floor); HMR hot-update is covered by a separate probe
// in verify.cjs.

const EXAMPLES = path.resolve(__dirname, '..');
const DEV_PORT = 3021;

let dev: ChildProcess | undefined;
let page: any;

test.beforeAll(async () => {
    spawnSync('rm', ['-rf', path.join(EXAMPLES, '.next/dev')], { stdio: 'ignore' });
});

test.afterAll(async () => {
    try { await page?.close(); } catch {}
    dev?.kill('SIGKILL');
});

test('dev runtime-injection renders a styled page on load', async ({ page: p }) => {
    page = p;

    dev = spawn('npx', ['next', 'dev', '--webpack', '--port', String(DEV_PORT)], {
        cwd: EXAMPLES,
        env: process.env,
        stdio: 'ignore',
    });

    // Poll until the dev server is listening (first compile is slow).
    const http = await import('http');
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
        const ready = await new Promise<boolean>((resolve) => {
            const req = http.get(`http://127.0.0.1:${DEV_PORT}/`, (r) => { r.resume(); resolve(true); });
            req.on('error', () => resolve(false));
        });
        if (ready) break;
        await new Promise((r) => setTimeout(r, 1000));
    }

    await page.goto(`http://127.0.0.1:${DEV_PORT}/`, { waitUntil: 'domcontentloaded', timeout: 90_000 });

    // Stylex atomic rules must be present in the CSSOM (runtime-injected).
    await page.waitForFunction(() => {
        let n = 0;
        for (const s of Array.from(document.styleSheets)) {
            try { n += Array.from(s.cssRules).filter((r) => r.selectorText?.startsWith('.x')).length; } catch {}
        }
        return n > 0;
    }, undefined, { timeout: 30_000 });

    const count = await page.evaluate(() =>
        Array.from(document.styleSheets).reduce((n, s) => {
            try { return n + Array.from(s.cssRules).filter((r) => r.selectorText?.startsWith('.x')).length; }
            catch { return n; }
        }, 0),
    );
    expect(count).toBeGreaterThan(0);

    // A themed element resolves a real color (not transparent/black).
    const bodyBg = await page.evaluate(() => {
        const card = Array.from(document.querySelectorAll('div')).find((el) => {
            const bg = getComputedStyle(el).backgroundColor;
            return bg && bg !== 'rgba(0, 0, 0, 0)';
        });
        return card ? getComputedStyle(card).backgroundColor : null;
    });
    expect(bodyBg).toBeTruthy();
});