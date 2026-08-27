'use client';
/**
 * Demonstrates the bridge's web-portal: a modal portaled to document.body.
 * Because the theme classes live on documentElement, this overlay inherits the
 * dark CSS vars automatically — no per-portal theming needed.
 */
import { useState } from 'react';
import { html, css } from 'react-strict-dom';
import { portalToBody } from '@leviyehonatan/rsd-next-bridge';
import { colors } from '../tokens/theme.vars.css';

export function PortalModal() {
    const [open, setOpen] = useState(false);

    return (
        <>
            <html.button style={styles.openBtn} onClick={() => setOpen((v) => !v)}>
                {open ? 'Close portal' : 'Open portal'}
            </html.button>
            {open &&
                portalToBody(
                    <html.div style={styles.backdrop} onClick={() => setOpen(false)}>
                        <html.div style={styles.panel} onClick={(e) => e.stopPropagation()}>
                            <html.span style={styles.text}>Portaled to body — inherits theme for free.</html.span>
                        </html.div>
                    </html.div>,
                )}
        </>
    );
}

const styles = css.create({
    openBtn: {
        paddingInline: 16,
        paddingBlock: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: colors.primary,
        color: colors.primary,
        backgroundColor: 'transparent',
        cursor: 'pointer',
    },
    backdrop: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
    },
    panel: {
        backgroundColor: colors.card,
        color: colors.foreground,
        padding: 24,
        borderRadius: 12,
    },
    text: {
        fontSize: 16,
    },
});