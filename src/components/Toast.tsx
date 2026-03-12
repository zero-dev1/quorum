import React, { useEffect, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { COLORS, FONTS } from '../lib/constants';

interface ToastProps {
  message: string | React.ReactNode;
  type: 'success' | 'error';
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type, onClose, duration = 5000 }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      style={{
        backgroundColor: COLORS.surface,
        borderLeft: `4px solid ${type === 'success' ? COLORS.success : COLORS.error}`,
        padding: '16px 24px',
        minWidth: '280px',
        maxWidth: '400px',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(-10px)',
        transition: 'opacity 200ms ease, transform 200ms ease',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      }}
    >
      <p
        style={{
          fontFamily: FONTS.body,
          fontSize: '14px',
          fontWeight: 400,
          color: COLORS.textPrimary,
          margin: 0,
        }}
      >
        {message}
      </p>
    </div>
  );
}

interface ToastContainerProps {
  toasts?: Array<{ id: string; message: string | React.ReactNode; type: 'success' | 'error' }>;
  onClose?: (id: string) => void;
}

export interface ToastHandle {
  addToast: (message: string | React.ReactNode, type: 'success' | 'error') => void;
}

export const ToastContainer = forwardRef<ToastHandle, ToastContainerProps>(
  ({ toasts: externalToasts, onClose: externalOnClose }, ref) => {
    const [internalToasts, setInternalToasts] = useState<Array<{ id: string; message: string | React.ReactNode; type: 'success' | 'error' }>>([]);
    
    const isControlled = externalToasts !== undefined;
    const toasts = isControlled ? externalToasts! : internalToasts;
    
    const removeToast = useCallback((id: string) => {
      if (isControlled && externalOnClose) {
        externalOnClose(id);
      } else {
        setInternalToasts(prev => prev.filter(t => t.id !== id));
      }
    }, [isControlled, externalOnClose]);
    
    const addToast = useCallback((message: string | React.ReactNode, type: 'success' | 'error') => {
      const id = Math.random().toString(36).substring(7);
      setInternalToasts(prev => [...prev, { id, message, type }]);
    }, []);
    
    useImperativeHandle(ref, () => ({
      addToast,
    }), [addToast]);

    return (
      <div
        style={{
          position: 'fixed',
          top: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 1000,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((toast) => (
          <div key={toast.id} style={{ pointerEvents: 'auto' }}>
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => removeToast(toast.id)}
            />
          </div>
        ))}
      </div>
    );
  }
);

ToastContainer.displayName = 'ToastContainer';
