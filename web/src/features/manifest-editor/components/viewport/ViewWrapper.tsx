'use client';

/**
 * @purpose Wrapper animado con framer-motion para las vistas del viewport (orbital, rack, history).
 * @purpose_en Animated framer-motion wrapper for viewport views (orbital, rack, history).
 * @refactorable false
 * @classification Helper Utility
 * @complexity Low
 * @fingerprint exports:1,imports:1,sig:qp8md1
 * @lastUpdated 2026-06-20T22:29:06.526Z
 */

import { motion } from 'framer-motion';

interface ViewWrapperProps {
  children: React.ReactNode;
  id: string;
  applyTransform?: boolean;
  zoom: number;
  pan: { x: number; y: number };
}

export default function ViewWrapper({
  children,
  id,
  applyTransform = true,
  zoom,
  pan,
}: ViewWrapperProps) {
  return (
    <motion.div
      key={id}
      initial={{ opacity: 0 }}
      animate={{
        opacity: 1,
        scale: applyTransform ? zoom : 1,
        x: applyTransform ? pan.x : 0,
        y: applyTransform ? pan.y : 0,
      }}
      exit={{ opacity: 0 }}
      className={`h-full ${applyTransform ? 'origin-center' : ''}`}
    >
      {children}
    </motion.div>
  );
}
