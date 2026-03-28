import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PageTransition } from '../components/PageTransition';
import { COLORS, FONTS } from '../lib/constants';
import { MOTION } from '../lib/motion';

export function About() {
  return (
    <PageTransition>
      <div style={{ padding: '88px 24px 48px', minHeight: '100vh', overflowX: 'hidden' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        {/* Section 1 - Hero */}
        <section style={{ paddingBottom: '80px' }}>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
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
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
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
          </motion.p>
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
            {[
              { title: 'How It Works', text: 'Anyone with a .qf name can create a poll. It costs 100 QF — enough to prevent spam, cheap enough to never think twice. Voting is free. Results are final the moment they hit the chain.' },
              { title: 'Why On-Chain', text: 'Off-chain voting is a suggestion. On-chain voting is a fact. QUORUM uses QF Network&apos;s 100ms block times and negligible gas fees to make governance as fast as messaging. No relayers, no multisigs, no waiting.' },
              { title: 'The Fee Model', text: '100 QF per poll. Half goes to the treasury, half is burned forever. When polls are created through QFLink pods, an additional 50 QF goes to QFLink. Every parameter is configurable by governance.' },
            ].map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{
                  delay: i * 0.1,
                  duration: 0.5,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
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
                  {card.title}
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
                  {card.text}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Section 3 - Ecosystem */}
        <section style={{ paddingBottom: '80px' }}>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
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
          </motion.h2>
          <div
            className="about-ecosystem-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '24px',
            }}
          >
            {[
              { name: 'QNS', subtitle: 'Your .qf name is your voter ID' },
              { name: 'QFLink', subtitle: 'Polls inside pod conversations' },
              { name: 'QFPad', subtitle: 'Token holders govern their communities' },
            ].map((item, i) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
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
                  {item.name}
                </div>
                <div
                  style={{
                    fontFamily: FONTS.body,
                    fontSize: '14px',
                    fontWeight: 400,
                    color: COLORS.textSecondary,
                  }}
                >
                  {item.subtitle}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Section 4 - Closing */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          style={{ textAlign: 'center', paddingBottom: '80px' }}
        >
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
        </motion.section>
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
