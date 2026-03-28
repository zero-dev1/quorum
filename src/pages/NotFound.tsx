import { Link } from 'react-router-dom';
import { PageTransition } from '../components/PageTransition';
import { COLORS, FONTS } from '../lib/constants';

export function NotFound() {
  return (
    <PageTransition>
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
        }}
      >
      <h1
        style={{
          fontFamily: FONTS.headline,
          fontSize: '36px',
          fontWeight: 700,
          color: COLORS.textPrimary,
          margin: '0 0 16px 0',
        }}
      >
        Poll Not Found
      </h1>
      <p
        style={{
          fontFamily: FONTS.body,
          fontSize: '16px',
          color: COLORS.textSecondary,
          margin: '0 0 32px 0',
        }}
      >
        This poll doesn&apos;t exist or hasn&apos;t been indexed yet.
      </p>
      <Link
        to="/explore"
        style={{
          padding: '12px 24px',
          minHeight: '44px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'transparent',
          border: `1px solid ${COLORS.primary}`,
          color: COLORS.primary,
          fontFamily: FONTS.body,
          fontSize: '14px',
          fontWeight: 500,
          textDecoration: 'none',
          transition: 'all 150ms ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = COLORS.primary;
          e.currentTarget.style.color = COLORS.textPrimary;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = COLORS.primary;
        }}
      >
        Back to Explore
      </Link>
      </div>
    </PageTransition>
  );
}
