// src/components/Toast.tsx
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToastStore } from '../stores/toastStore';
import { COLORS, FONTS } from '../lib/constants';
import { MOTION } from '../lib/motion';

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div
      style={{
        position: 'fixed',
        top: '80px',
        right: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 10000,
        pointerEvents: 'none',
      }}
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: any; onDismiss: () => void }) {
  const duration = toast.duration || 5000;

  useEffect(() => {
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  const accentColor =
    toast.type === 'success' ? COLORS.success :
    toast.type === 'error' ? COLORS.error :
    COLORS.warning;

  return (
    <motion.div
      layout
      initial={MOTION.toast.initial}
      animate={MOTION.toast.animate}
      exit={MOTION.toast.exit}
      transition={MOTION.toast.transition}
      style={{
        backgroundColor: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderLeft: `3px solid ${accentColor}`,
        padding: '14px 20px 10px',
        minWidth: '300px',
        maxWidth: '420px',
        pointerEvents: 'auto',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
      }}
      onClick={onDismiss}
    >
      <p style={{ fontFamily: FONTS.body, fontSize: '14px', color: COLORS.textPrimary, margin: 0 }}>
        {toast.message}
      </p>
      {/* Progress bar */}
      <motion.div
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: duration / 1000, ease: 'linear' }}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: '2px',
          backgroundColor: accentColor,
        }}
      />
    </motion.div>
  );
}
