import { ReactNode } from 'react';
import { COLORS, FONTS } from '../lib/constants';

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
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div
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
    >
      <div
        style={{
          backgroundColor: COLORS.surface,
          border: `1px solid ${isConfirming ? COLORS.primary : COLORS.border}`,
          padding: '32px',
          maxWidth: '440px',
          width: '100%',
          animation: isConfirming ? 'pulseBorder 1.5s infinite' : 'none',
        }}
        onClick={(e) => e.stopPropagation()}
      >
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

        <div style={{ display: 'flex', gap: '16px' }}>
          <button
            onClick={onCancel}
            disabled={isConfirming}
            style={{
              flex: 1,
              padding: '12px 24px',
              backgroundColor: 'transparent',
              border: `1px solid ${COLORS.border}`,
              color: COLORS.textSecondary,
              fontFamily: FONTS.body,
              fontSize: '14px',
              fontWeight: 500,
              cursor: isConfirming ? 'not-allowed' : 'pointer',
              opacity: isConfirming ? 0.7 : 1,
              transition: 'all 150ms ease',
            }}
          >
            {cancelText}
          </button>

          <button
            onClick={onConfirm}
            disabled={isConfirming || confirmDisabled}
            style={{
              flex: 1,
              padding: '12px 24px',
              backgroundColor: confirmDisabled ? COLORS.border : COLORS.primary,
              border: `1px solid ${confirmDisabled ? COLORS.border : COLORS.primary}`,
              color: COLORS.textPrimary,
              fontFamily: FONTS.body,
              fontSize: '14px',
              fontWeight: 600,
              cursor: isConfirming || confirmDisabled ? 'not-allowed' : 'pointer',
              opacity: isConfirming || confirmDisabled ? 0.7 : 1,
              transition: 'all 150ms ease',
              animation: isConfirming ? 'pulse 1s infinite' : 'none',
            }}
          >
            {isConfirming ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span style={{ animation: 'spin 1s linear infinite' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeLinecap="round" />
                  </svg>
                </span>
                Confirming...
              </span>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulseBorder {
          0%, 100% { 
            border-color: rgba(99, 102, 241, 0.5);
            box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4);
          }
          50% { 
            border-color: rgba(99, 102, 241, 1);
            box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
          }
        }
      `}</style>
    </div>
  );
}
