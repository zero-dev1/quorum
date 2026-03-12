import { Link } from 'react-router-dom';
import { COLORS, FONTS } from '../lib/constants';

export function Footer() {
  return (
    <footer
      style={{
        backgroundColor: COLORS.background,
        borderTop: `1px solid ${COLORS.border}`,
        padding: '32px 24px',
        marginTop: 'auto',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '24px',
        }}
      >
        <div>
          <span
            style={{
              fontFamily: FONTS.headline,
              fontSize: '16px',
              fontWeight: 600,
              color: COLORS.textPrimary,
            }}
          >
            QUORUM
          </span>
          <p
            style={{
              fontFamily: FONTS.mono,
              fontSize: '13px',
              color: COLORS.textMuted,
              margin: '4px 0 0 0',
            }}
          >
            Built on QF Network
          </p>
        </div>

        <div style={{ display: 'flex', gap: '24px' }}>
          {[
            { label: 'Docs', href: '#' },
            { label: 'GitHub', href: '#' },
            { label: 'QNS', href: '#' },
            { label: 'QFLink', href: '#' },
          ].map((link) => (
            <a
              key={link.label}
              href={link.href}
              style={{
                fontFamily: FONTS.body,
                fontSize: '14px',
                fontWeight: 400,
                color: COLORS.textSecondary,
                textDecoration: 'none',
                transition: 'color 150ms ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = COLORS.textPrimary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = COLORS.textSecondary;
              }}
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>

      <div
        style={{
          maxWidth: '1200px',
          margin: '24px auto 0 auto',
          paddingTop: '24px',
          borderTop: `1px solid ${COLORS.border}`,
        }}
      >
        <p
          style={{
            fontFamily: FONTS.mono,
            fontSize: '12px',
            color: COLORS.textMuted,
            margin: 0,
          }}
        >
          &copy; 2026 QUORUM. Every vote on-chain.
        </p>
      </div>
    </footer>
  );
}
