// src/components/PageTransition.tsx
import { motion } from 'framer-motion';
import { MOTION } from '../lib/motion';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      initial={MOTION.page.initial}
      animate={MOTION.page.animate}
      exit={MOTION.page.exit}
      transition={MOTION.page.transition}
      className={className}
    >
      {children}
    </motion.div>
  );
}
