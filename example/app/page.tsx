'use client';
/**
 * Home page — demonstrates every bridge feature:
 *   1. RSD `css.create` styles (via DemoCard) using theme css vars.
 *   2. Theme toggle → applyThemeToDocumentRoot on documentElement.
 *   3. A portal to body (PortalModal) that inherits the theme automatically.
 */
import { html, css } from 'react-strict-dom';
import { colors } from '../tokens/theme.vars.css';
import { DemoCard } from '@/DemoCard';
import { PortalModal } from '@/PortalModal';
import { useExampleTheme } from './providers';

export default function Page() {
    const { dark, toggle } = useExampleTheme();

    return (
        <html.div style={styles.page}>
            <html.span style={styles.heading}>@leviyehonatan/rsd-next-bridge example</html.span>
            <html.div style={styles.row}>
                <html.button style={styles.toggle} onClick={toggle}>
                    Toggle theme ({dark ? 'dark' : 'light'})
                </html.button>
                <PortalModal />
            </html.div>
            <DemoCard title="RSD css.create">
                <html.span style={styles.bodyText}>
                    This text + card colors come from <code>colors.*</code> (defineVars) — it flips with the
                    document-root theme.
                </html.span>
            </DemoCard>
        </html.div>
    );
}

const styles = css.create({
    page: {
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        padding: 32,
        maxWidth: 640,
        margin: '0 auto',
        backgroundColor: colors.background,
        minHeight: '100vh',
    },
    heading: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.foreground,
    },
    row: {
        display: 'flex',
        gap: 12,
        alignItems: 'center',
    },
    toggle: {
        paddingInline: 16,
        paddingBlock: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: colors.border,
        backgroundColor: colors.muted,
        color: colors.foreground,
        cursor: 'pointer',
    },
    bodyText: {
        color: colors.foreground,
    },
});