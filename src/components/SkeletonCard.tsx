// src/components/SkeletonCard.tsx
import { motion } from 'framer-motion';
import { COLORS } from '../lib/constants';

export function SkeletonCard() {
  return (
    <div
      style={{
        backgroundColor: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        padding: '24px',
      }}
    >
      {/* Status dot + label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <Pulse width={8} height={8} />
        <Pulse width={60} height={12} />
      </div>
      {/* Question lines */}
      <Pulse width="85%" height={20} style={{ marginBottom: '8px' }} />
      <Pulse width="60%" height={20} style={{ marginBottom: '16px' }} />
      {/* Creator */}
      <Pulse width={120} height={14} style={{ marginBottom: '16px' }} />
      {/* Stats */}
      <Pulse width={180} height={14} style={{ marginBottom: '16px' }} />
      {/* Progress bar */}
      <Pulse width="100%" height={4} />
    </div>
  );
}

function Pulse({
  width,
  height,
  style,
}: {
  width: number | string;
  height: number;
  style?: React.CSSProperties;
}) {
  return (
    <motion.div
      animate={{ opacity: [0.05, 0.12, 0.05] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        width,
        height,
        backgroundColor: COLORS.primary,
        ...style,
      }}
    />
  );
}
