import { Link } from 'react-router-dom';
import { PageTransition } from '../components/PageTransition';
import { COLORS, FONTS } from '../lib/constants';

export function About() {
  return (
    <PageTransition>
      <div style={{ padding: '88px 24px 48px', minHeight: '100vh', overflowX: 'hidden' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        {/* Section 1 - Hero */}
        <section style={{ paddingBottom: '80px' }}>
          <h1
            style={{
              fontFamily: FONTS.headline,
              fontSize: '48px',
              fontWeight: 800,
              color: COLORS.textPrimary,
              margin: '0 0 24px 0',
              textAlign: 'left',
            }}
          >
            About QUORUM
          </h1>
          <p
            style={{
              fontFamily: FONTS.body,
              fontSize: '20px',
              fontWeight: 400,
              color: COLORS.textSecondary,
              maxWidth: '720px',
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            QUORUM is on-chain governance for QF Network. Every poll is a transaction. Every vote is permanent. No off-chain snapshots, no trust assumptions, no centralized servers. Just code and consensus.
          </p>
        </section>

        {/* Section 2 - Three cards */}
        <section style={{ paddingBottom: '80px' }}>
          <div
            className="about-three-column"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '24px',
            }}
          >
            {/* Card 1 */}
            <div
              style={{
                backgroundColor: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                padding: '32px',
              }}
            >
              <h2
                style={{
                  fontFamily: FONTS.headline,
                  fontSize: '20px',
                  fontWeight: 700,
                  color: COLORS.textPrimary,
                  margin: '0 0 16px 0',
                }}
              >
                How It Works
              </h2>
              <p
                style={{
                  fontFamily: FONTS.body,
                  fontSize: '15px',
                  fontWeight: 400,
                  color: COLORS.textSecondary,
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                Anyone with a .qf name can create a poll. It costs 100 QF — enough to prevent spam, cheap enough to never think twice. Voting is free. Results are final the moment they hit the chain.
              </p>
            </div>

            {/* Card 2 */}
            <div
              style={{
                backgroundColor: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                padding: '32px',
              }}
            >
              <h2
                style={{
                  fontFamily: FONTS.headline,
                  fontSize: '20px',
                  fontWeight: 700,
                  color: COLORS.textPrimary,
                  margin: '0 0 16px 0',
                }}
              >
                Why On-Chain
              </h2>
              <p
                style={{
                  fontFamily: FONTS.body,
                  fontSize: '15px',
                  fontWeight: 400,
                  color: COLORS.textSecondary,
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                Off-chain voting is a suggestion. On-chain voting is a fact. QUORUM uses QF Network&apos;s 100ms block times and negligible gas fees to make governance as fast as messaging. No relayers, no multisigs, no waiting.
              </p>
            </div>

            {/* Card 3 */}
            <div
              style={{
                backgroundColor: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                padding: '32px',
              }}
            >
              <h2
                style={{
                  fontFamily: FONTS.headline,
                  fontSize: '20px',
                  fontWeight: 700,
                  color: COLORS.textPrimary,
                  margin: '0 0 16px 0',
                }}
              >
                The Fee Model
              </h2>
              <p
                style={{
                  fontFamily: FONTS.body,
                  fontSize: '15px',
                  fontWeight: 400,
                  color: COLORS.textSecondary,
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                100 QF per poll. Half goes to the treasury, half is burned forever. When polls are created through QFLink pods, an additional 50 QF goes to QFLink. Every parameter is configurable by governance.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3 - Ecosystem */}
        <section style={{ paddingBottom: '80px' }}>
          <h2
            style={{
              fontFamily: FONTS.headline,
              fontSize: '32px',
              fontWeight: 700,
              color: COLORS.textPrimary,
              margin: '0 0 48px 0',
              textAlign: 'center',
            }}
          >
            Built Into the Ecosystem
          </h2>
          <div
            className="about-ecosystem-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '24px',
            }}
          >
            {/* Card 1 */}
            <div
              style={{
                backgroundColor: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                padding: '32px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontFamily: FONTS.headline,
                  fontSize: '18px',
                  fontWeight: 600,
                  color: COLORS.textPrimary,
                  margin: '0 0 8px 0',
                }}
              >
                QNS
              </div>
              <div
                style={{
                  fontFamily: FONTS.body,
                  fontSize: '14px',
                  fontWeight: 400,
                  color: COLORS.textSecondary,
                }}
              >
                Your .qf name is your voter ID
              </div>
            </div>

            {/* Card 2 */}
            <div
              style={{
                backgroundColor: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                padding: '32px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontFamily: FONTS.headline,
                  fontSize: '18px',
                  fontWeight: 600,
                  color: COLORS.textPrimary,
                  margin: '0 0 8px 0',
                }}
              >
                QFLink
              </div>
              <div
                style={{
                  fontFamily: FONTS.body,
                  fontSize: '14px',
                  fontWeight: 400,
                  color: COLORS.textSecondary,
                }}
              >
                Polls inside pod conversations
              </div>
            </div>

            {/* Card 3 */}
            <div
              style={{
                backgroundColor: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                padding: '32px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontFamily: FONTS.headline,
                  fontSize: '18px',
                  fontWeight: 600,
                  color: COLORS.textPrimary,
                  margin: '0 0 8px 0',
                }}
              >
                QFPad
              </div>
              <div
                style={{
                  fontFamily: FONTS.body,
                  fontSize: '14px',
                  fontWeight: 400,
                  color: COLORS.textSecondary,
                }}
              >
                Token holders govern their communities
              </div>
            </div>
          </div>
        </section>

        {/* Section 4 - Closing */}
        <section style={{ textAlign: 'center', paddingBottom: '80px' }}>
          <h2
            style={{
              fontFamily: FONTS.headline,
              fontSize: '32px',
              fontWeight: 700,
              color: COLORS.textPrimary,
              margin: '0 0 16px 0',
            }}
          >
            Open Source. Community Governed.
          </h2>
          <p
            style={{
              fontFamily: FONTS.body,
              fontSize: '16px',
              fontWeight: 400,
              color: COLORS.textSecondary,
              maxWidth: '600px',
              margin: '0 auto 32px auto',
              lineHeight: 1.6,
            }}
          >
            QUORUM&apos;s contracts are verified and public. The fee model, the treasury split, the whitelist — all governable. This isn&apos;t our platform. It&apos;s yours.
          </p>
          <div
            style={{
              display: 'flex',
              gap: '16px',
              justifyContent: 'center',
            }}
          >
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                padding: '14px 48px',
                backgroundColor: 'transparent',
                border: `1px solid ${COLORS.border}`,
                fontFamily: FONTS.body,
                fontSize: '14px',
                fontWeight: 400,
                color: COLORS.textPrimary,
                textDecoration: 'none',
                transition: 'border-color 150ms ease',
                borderRadius: '0px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = COLORS.primary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = COLORS.border;
              }}
            >
              View on GitHub
            </a>
            <Link
              to="/explore"
              style={{
                display: 'inline-block',
                padding: '14px 48px',
                backgroundColor: COLORS.primary,
                fontFamily: FONTS.body,
                fontSize: '14px',
                fontWeight: 600,
                color: '#FFFFFF',
                textDecoration: 'none',
                transition: 'background-color 150ms ease',
                borderRadius: '0px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = COLORS.primaryHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = COLORS.primary;
              }}
            >
              Launch App
            </Link>
          </div>
        </section>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .about-three-column {
            grid-template-columns: 1fr !important;
          }
          .about-ecosystem-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
      </div>
    </PageTransition>
  );
}
