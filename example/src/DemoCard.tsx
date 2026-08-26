'use client';
/**
 * A reusable RSD component in the example's `src` — demonstrates `css.create`
 * styles driven by the theme's css vars. Imported via the @/ alias. Because the
 * styles reference `colors.*` (defineVars), they resolve to the currently-applied
 * theme on documentElement (dark or light).
 */
import { html, css } from 'react-strict-dom';
import { colors } from '../tokens/theme.vars.css';

export function DemoCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <html.div style={styles.card}>
            <html.span style={styles.title}>{title}</html.span>
            {children}
        </html.div>
    );
}

const styles = css.create({
    card: {
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: 20,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: colors.border,
        borderRadius: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.foreground,
    },
});