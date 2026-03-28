import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { COLORS, FONTS } from '../lib/constants';
import { MOTION } from '../lib/motion';

type ConfirmationStatus = 'idle' | 'submitting' | 'confirming' | 'success' | 'error';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  children: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  isConfirming?: boolean;
  confirmDisabled?: boolean;
  status?: ConfirmationStatus;
  successText?: string;
  errorMessage?: string;
  onRetry?: () => void;
}

export function ConfirmationModal({
  isOpen,
  title,
  children,
  onCancel,
  onConfirm,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isConfirming = false,
  confirmDisabled = false,
  status = 'idle',
  successText,
  errorMessage,
  onRetry,
}: ConfirmationModalProps) {
  const getStatusText = () => {
    switch (status) {
      case 'submitting':
        return 'Submitting...';
      case 'confirming':
        return 'Confirming on-chain...';
      default:
        return confirmText;
    }
  };

  const getProgressColor = () => {
    switch (status) {
      case 'error':
        return COLORS.error;
      default:
        return COLORS.primary;
    }
  };

  const getProgressDuration = () => {
    switch (status) {
      case 'submitting':
        return 1.5;
      case 'confirming':
        return 3;
      default:
        return 0;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '16px',
            }}
            onClick={onCancel}
          />

          {/* Content Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: COLORS.surface,
              border: `1px solid ${status === 'error' ? COLORS.error : COLORS.border}`,
              padding: '32px',
              maxWidth: '440px',
              width: '100%',
              zIndex: 1001,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Success State */}
            {status === 'success' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ textAlign: 'center', padding: '32px 0' }}
              >
                {/* Animated checkmark */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                  style={{
                    width: 64,
                    height: 64,
                    margin: '0 auto 24px auto',
                    border: `3px solid ${COLORS.primary}`,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={COLORS.primary} strokeWidth="2.5">
                    <motion.path
                      d="M5 12l5 5L19 7"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.4, delay: 0.3 }}
                    />
                  </svg>
                </motion.div>
                <p style={{ fontFamily: FONTS.headline, fontSize: '20px', fontWeight: 700, color: COLORS.textPrimary }}>
                  {successText || 'Success'}
                </p>
              </motion.div>
            )}

            {/* Normal/Error States */}
            {status !== 'success' && (
              <>
                <h2
                  style={{
                    fontFamily: FONTS.headline,
                    fontSize: '24px',
                    fontWeight: 700,
                    color: COLORS.textPrimary,
                    margin: '0 0 24px 0',
                  }}
                >
                  {title}
                </h2>

                <div style={{ marginBottom: '24px' }}>{children}</div>

                {errorMessage && status === 'error' && (
                  <div
                    style={{
                      marginBottom: '24px',
                      padding: '12px',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      border: `1px solid ${COLORS.error}`,
                      borderRadius: '4px',
                    }}
                  >
                    <p
                      style={{
                        fontFamily: FONTS.body,
                        fontSize: '14px',
                        color: COLORS.error,
                        margin: 0,
                      }}
                    >
                      {errorMessage}
                    </p>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '16px' }}>
                  {status !== 'error' ? (
                    <>
                      <button
                        onClick={onCancel}
                        disabled={isConfirming || status !== 'idle'}
                        style={{
                          flex: 1,
                          padding: '12px 24px',
                          minHeight: '44px',
                          backgroundColor: 'transparent',
                          border: `1px solid ${COLORS.border}`,
                          color: COLORS.textSecondary,
                          fontFamily: FONTS.body,
                          fontSize: '14px',
                          fontWeight: 500,
                          cursor: isConfirming || status !== 'idle' ? 'not-allowed' : 'pointer',
                          opacity: isConfirming || status !== 'idle' ? 0.7 : 1,
                          transition: 'all 150ms ease',
                        }}
                      >
                        {cancelText}
                      </button>

                      <button
                        onClick={onConfirm}
                        disabled={isConfirming || confirmDisabled || status !== 'idle'}
                        style={{
                          flex: 1,
                          padding: '12px 24px',
                          minHeight: '44px',
                          backgroundColor: confirmDisabled || status !== 'idle' ? COLORS.border : COLORS.primary,
                          border: `1px solid ${confirmDisabled || status !== 'idle' ? COLORS.border : COLORS.primary}`,
                          color: COLORS.textPrimary,
                          fontFamily: FONTS.body,
                          fontSize: '14px',
                          fontWeight: 600,
                          cursor: isConfirming || confirmDisabled || status !== 'idle' ? 'not-allowed' : 'pointer',
                          opacity: isConfirming || confirmDisabled || status !== 'idle' ? 0.7 : 1,
                          transition: 'all 150ms ease',
                        }}
                      >
                        {getStatusText()}
                      </button>
                    </>
                  ) : (
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <button
                        onClick={onCancel}
                        style={{
                          flex: 1,
                          padding: '12px 24px',
                          minHeight: '44px',
                          backgroundColor: 'transparent',
                          border: `1px solid ${COLORS.border}`,
                          color: COLORS.textSecondary,
                          fontFamily: FONTS.body,
                          fontSize: '14px',
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={onRetry}
                        style={{
                          flex: 1,
                          padding: '12px 24px',
                          minHeight: '44px',
                          backgroundColor: COLORS.primary,
                          border: `1px solid ${COLORS.primary}`,
                          color: COLORS.textPrimary,
                          fontFamily: FONTS.body,
                          fontSize: '14px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Try Again
                      </button>
                    </div>
                  )}
                </div>

                {/* Progress Line */}
                {(status === 'submitting' || status === 'confirming') && (
                  <div style={{ marginTop: '16px', height: '2px', backgroundColor: COLORS.border }}>
                    <motion.div
                      initial={{ width: '0%' }}
                      animate={{ x: ['0%', '100%'] }}
                      transition={{
                        duration: getProgressDuration(),
                        repeat: Infinity,
                        ease: 'linear',
                      }}
                      style={{
                        height: '100%',
                        width: '20%',
                        backgroundColor: getProgressColor(),
                      }}
                    />
                  </div>
                )}
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
