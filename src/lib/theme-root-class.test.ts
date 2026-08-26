import { describe, it, expect } from 'vitest';
import { compiledThemeClass, darkThemeClassString } from './theme-root-class';

/**
 * Guards the compiled-theme class extraction (theme-root-class.ts).
 *
 * After the stylex Babel pass, each css.createTheme object is a CompiledStyles
 * map: { '<themeName>': '<themeName>', <varGroupHash>: 'atomicClass hashClass',
 * $$css: true }. The html<->CSS theme trigger is the var-group-hash CLASS (its
 * value is the "atomicClass hashClass" pair). `compiledThemeClass` finds it —
 * this test pins the behavior so a stylex/stylex-wiring change that alters the
 * compiled shape fails loudly instead of silently dropping the dark theme.
 */
describe('compiledThemeClass', () => {
    it('returns the atomicClass+hash string from a compiled createTheme object', () => {
        expect(compiledThemeClass({ 'tokens__darkTheme': 'tokens__darkTheme', x1ot19pq: 'xbasely x1ot19pq', $$css: true }))
            .toBe('xbasely x1ot19pq');
    });

    it('ignores the self-referential name key (no space)', () => {
        expect(compiledThemeClass({ 'tokens__darkTheme': 'tokens__darkTheme', x1ot19pq: 'xbasely x1ot19pq', $$css: true }))
            .not.toContain('tokens__darkTheme');
    });

    it('returns empty string for non-CompiledStyles (raw object, undefined, null)', () => {
        expect(compiledThemeClass(null)).toBe('');
        expect(compiledThemeClass(undefined)).toBe('');
        expect(compiledThemeClass('nope')).toBe('');
        expect(compiledThemeClass({ a: 'b' })).toBe('');
        expect(compiledThemeClass({ primary: 'var(--x1)' })).toBe('');
    });

    it('picks the FIRST class-with-space regardless of key order', () => {
        expect(compiledThemeClass({ x1ot19pq: 'xbasely x1ot19pq', 'tokens__darkTheme': 'tokens__darkTheme', $$css: true }))
            .toBe('xbasely x1ot19pq');
    });
});

describe('darkThemeClassString', () => {
    it('joins multiple compiled themes in order', () => {
        expect(
            darkThemeClassString(
                { 'a__t': 'a__t', x1ot19pq: 'xbasely x1ot19pq', $$css: true },
                { 'b__t': 'b__t', xp4zhux: 'xchart xp4zhux', $$css: true },
            ),
        ).toBe('xbasely x1ot19pq xchart xp4zhux');
    });

    it('returns empty when all themes are non-compiled', () => {
        expect(darkThemeClassString({ a: 'b' }, undefined, null)).toBe('');
    });
});