// src/stores/toastStore.ts
import { create } from 'zustand';

interface Toast {
  id: string;
  message: string | React.ReactNode;
  type: 'success' | 'error' | 'warning';
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
  addToast: (message: string | React.ReactNode, type: Toast['type'], duration?: number) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, type, duration = 5000) => {
    const id = Math.random().toString(36).slice(2, 9);
    set((state) => ({ toasts: [...state.toasts, { id, message, type, duration }] }));
  },
  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));

// Convenience hook
export function useToast() {
  const { addToast } = useToastStore();
  return { toast: addToast };
}
