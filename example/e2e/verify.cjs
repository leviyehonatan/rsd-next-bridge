#!/usr/bin/env node
/**
 * Verify the bridge end-to-end against this example app. This doubles as the
 * "living" test and a runnable reference: it builds the example (prod) and
 * asserts the collected CSS contains atomic rules + the dark theme vars, then
 * boots `next dev` and asserts the client bundle carries the stylex runtime
 * injection (so dev is styled too — the trap this bridge removes).
 *
 * Run: npm test  (inside packages/rsd-next-bridge/example)
 */
const { spawnSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CWD = path.resolve(__dirname, '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0, fail = 0;
function ok(name, cond) {
    if (cond) { pass++; console.log(`  ✓ ${name}`); }
    else { fail++; console.log(`  ✗ ${name}`); }
}

async function main() {
    console.log('\n[1/2] Prod build — collector emits atomic CSS\n');
    const build = spawnSync('npx', ['next', 'build', '--webpack'], { stdio: 'inherit', cwd: CWD });
    if (build.status !== 0) { ok('next build succeeds', false); process.exit(1); }

    const cssDir = path.join(CWD, '.next/static/css');
    const cssFiles = fs.existsSync(cssDir) ? fs.readdirSync(cssDir).filter((f) => f.endsWith('.css')) : [];
    const css = cssFiles.length ? fs.readFileSync(path.join(cssDir, cssFiles[0]), 'utf8') : '';
    const atomics = (css.match(/\.x[0-9a-z]{5,}\{/g) || []).length;
    ok(`prod CSS has atomic rules (got ${atomics})`, atomics > 10);
    ok('prod CSS has dark theme value', css.includes('#0b0f17'));

    console.log('\n[2/2] Dev — runtime injection restores styles\n');
    spawnSync('rm', ['-rf', path.join(CWD, '.next/dev')], { cwd: CWD });
    const devPort = 3014;
    const dev = spawn('npx', ['next', 'dev', '--webpack', '--port', String(devPort)], {
        cwd: CWD,
        stdio: 'ignore',
        env: { ...process.env },
    });
    await sleep(12_000);

    let devHasInject = false;
    // A page request triggers on-demand compilation of the layout/page chunks.
    try {
        require('child_process').execSync(`curl -s -o /dev/null http://127.0.0.1:${devPort}/`, { timeout: 20_000 });
    } catch {}
    await sleep(8000);
    const walk = (dir) => {
        if (!fs.existsSync(dir)) return;
        for (const f of fs.readdirSync(dir)) {
            const p = path.join(dir, f);
            if (fs.statSync(p).isDirectory()) walk(p);
            else if (f.endsWith('.js')) {
                const s = fs.readFileSync(p, 'utf8');
                if (s.includes('data-stylex') && s.includes('inject')) { devHasInject = true; break; }
            }
        }
    };
    walk(path.join(CWD, '.next/dev/static/chunks'));
    ok('dev bundle has stylex runtime injection', devHasInject);
    dev.kill('SIGKILL');

    console.log(`\n${pass} passed, ${fail} failed`);
    process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });