'use client';

/**
 * @purpose Renderiza una guía interactiva de onboarding para los usuarios del editor Manifest OMEGA, guiándolos a través de las características y funcionalidades clave.
 * @purpose_en Renders an interactive onboarding walkthrough for users of the OMEGA Manifest Editor, guiding them through key features and functionalities.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:5,imports:4,sig:13727o
 * @lastUpdated 2026-06-20T14:41:24.366Z
 */

import { useState, useEffect, useCallback, startTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass, Layout, Layers, Zap, Shield, Keyboard,
  ChevronRight, ChevronLeft, X, Check,
} from 'lucide-react';
import { useFocusTrap } from '@/features/manifest-editor/hooks/useFocusTrap';

// ── Steps Data ─────────────────────────────────────────────────────────

export interface TourStep {
  id: string;
  title: string;
  description: string;
  /** CSS selector for the element to highlight (optional — just descriptive if null) */
  targetSelector?: string;
  /** Position of the tooltip relative to the target */
  position?: 'bottom' | 'top' | 'left' | 'right' | 'center';
  icon?: React.ReactNode;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to OMEGA',
    description:
      'This guided tour will walk you through the key areas of the OMEGA Manifest Editor. You will learn how to navigate the interface, add controls, configure modules, and deploy your designs.',
    position: 'center',
    icon: <Compass className="w-5 h-5" />,
  },
  {
    id: 'header',
    title: 'Header & Menu Bar',
    description:
      'The header contains the main menu (File, Edit, View, Window, Help) for all operations: saving, exporting, undo/redo, toggling panels, and accessing documentation. Use Ctrl+K to quickly search any command.',
    targetSelector: 'header',
    position: 'bottom',
    icon: <Layout className="w-5 h-5" />,
  },
  {
    id: 'toolbar',
    title: 'Tool Palette',
    description:
      'The floating toolbar gives you quick access to tools: Select (V), Marquee (M), Add Primitives (A), and the Cell Studio for editing individual controls. You can also group selected elements and toggle Live Mode.',
    targetSelector: '[class*="cursor-grab"]',
    position: 'right',
    icon: <Zap className="w-5 h-5" />,
  },
  {
    id: 'canvas',
    title: 'Work Canvas',
    description:
      'The central area displays your module in three views: Orbital (Ctrl+1) for the full layout, Virtual Rack (Ctrl+2) for component placement, and Source Code (Ctrl+3) for direct JSON editing. Drag and drop components to arrange them.',
    targetSelector: 'main',
    position: 'top',
    icon: <Layers className="w-5 h-5" />,
  },
  {
    id: 'inspector',
    title: 'Inspector Panel',
    description:
      'The right panel is your control center for properties, layers, blueprints, compliance, and history. Select any component on the canvas to edit its properties here. Use Ctrl+Shift+L to toggle the Layers panel.',
    targetSelector: '[class*="RightDock"]',
    position: 'left',
    icon: <Shield className="w-5 h-5" />,
  },
  {
    id: 'statusbar',
    title: 'Status Bar',
    description:
      'The status bar at the bottom shows document state (Modified/Saved), validation errors, and the watchdog connection status. Save your work with Ctrl+S (OmegaPack) or Ctrl+Shift+S (Distilled Export).',
    targetSelector: 'footer',
    position: 'top',
    icon: <Zap className="w-5 h-5" />,
  },
  {
    id: 'shortcuts',
    title: 'Keyboard Shortcuts',
    description:
      'Master the editor with keyboard shortcuts: Ctrl+K to search everything, Ctrl+1-4 to switch views, V/M/A for tools, Ctrl+Z/Y for undo/redo, and Ctrl+Shift+L/P/B/C to toggle panels. Press F1 for the full Engineering Manual.',
    position: 'center',
    icon: <Keyboard className="w-5 h-5" />,
  },
];

// ── Storage ────────────────────────────────────────────────────────────

const STORAGE_KEY = 'omega_onboarding_completed';

export function isTourCompleted(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

export function markTourCompleted(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, 'true');
}

export function resetTour(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

// ── Props ──────────────────────────────────────────────────────────────

interface OnboardingWalkthroughProps {
  isOpen: boolean;
  onClose: () => void;
}

// ── Component ──────────────────────────────────────────────────────────

export default function OnboardingWalkthrough({
  isOpen,
  onClose,
}: OnboardingWalkthroughProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const overlayRef = useFocusTrap(isOpen);

  const step = TOUR_STEPS[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === TOUR_STEPS.length - 1;
  const isCentered = step.position === 'center' || !step.targetSelector;

  // Reset step when opening
  useEffect(() => {
    if (isOpen) startTransition(() => setCurrentStep(0));
  }, [isOpen]);

  // Compute tooltip position for target selectors
  const recalcPosition = useCallback(() => {
    if (!step?.targetSelector) {
      setTooltipPos({ top: 0, left: 0 });
      return;
    }

    const el = document.querySelector(step.targetSelector);
    if (!el) {
      setTooltipPos({ top: 0, left: 0 });
      return;
    }

    const rect = el.getBoundingClientRect();
    const pos = step.position || 'bottom';
    const gap = 12;

    switch (pos) {
      case 'bottom':
        setTooltipPos({ top: rect.bottom + gap, left: rect.left + rect.width / 2 });
        break;
      case 'top':
        setTooltipPos({ top: rect.top - gap, left: rect.left + rect.width / 2 });
        break;
      case 'left':
        setTooltipPos({ top: rect.top + rect.height / 2, left: rect.left - gap });
        break;
      case 'right':
        setTooltipPos({ top: rect.top + rect.height / 2, left: rect.right + gap });
        break;
      default:
        setTooltipPos({ top: 0, left: 0 });
    }
  }, [step]);

  // Recalc on step change and resize
  useEffect(() => {
    startTransition(() => recalcPosition());
    window.addEventListener('resize', recalcPosition);
    return () => window.removeEventListener('resize', recalcPosition);
  }, [recalcPosition]);

  const handleNext = useCallback(() => {
    if (isLast) {
      markTourCompleted();
      onClose();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  }, [isLast, onClose]);

  const handlePrev = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, []);

  const handleSkip = useCallback(() => {
    markTourCompleted();
    onClose();
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={overlayRef}
          role="dialog"
          aria-modal="true"
          aria-label="Onboarding walkthrough"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9998]"
        >
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
            onClick={handleSkip}
          />

          {/* Highlight ring for target element */}
          {!isCentered && step.targetSelector && (
            <HighlightRing key="highlight" selector={step.targetSelector} />
          )}

          {/* Tooltip Card */}
          <TourTooltipCard
            step={step}
            currentStep={currentStep}
            isCentered={isCentered}
            tooltipPos={tooltipPos}
            isFirst={isFirst}
            isLast={isLast}
            totalSteps={TOUR_STEPS.length}
            onPrev={handlePrev}
            onNext={handleNext}
            onSkip={handleSkip}
            onDotClick={setCurrentStep}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Tour Tooltip Card ───────────────────────────────────────────────────

/** Tooltip card with progress, content, navigation, and dot indicators */
function TourTooltipCard({ step, currentStep, isCentered, tooltipPos, isFirst, isLast, totalSteps, onPrev, onNext, onSkip, onDotClick }: {
  step: TourStep;
  currentStep: number;
  isCentered: boolean;
  tooltipPos: { top: number; left: number };
  isFirst: boolean;
  isLast: boolean;
  totalSteps: number;
  onPrev: () => void;
  onNext: () => void;
  onSkip: () => void;
  onDotClick: (idx: number) => void;
}) {
  return (
    <div
      key="tooltip-wrapper"
      className={`fixed z-[1] ${
        isCentered
          ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
          : '-translate-x-1/2'
      }`}
      style={
        isCentered ? {} : { top: tooltipPos.top, left: tooltipPos.left }
      }
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="w-[380px] wb-surface border wb-outline shadow-2xl rounded-sm overflow-hidden pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bar */}
        <div className="h-0.5 w-full bg-white/5">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{
              width: `${((currentStep + 1) / totalSteps) * 100}%`,
            }}
          />
        </div>

        <div className="p-5">
          <TourProgressHeader step={step} currentStep={currentStep} totalSteps={totalSteps} onSkip={onSkip} />
          <TourDescription description={step.description} />
          <TourNavButtons isFirst={isFirst} isLast={isLast} onPrev={onPrev} onNext={onNext} />
        </div>

        <TourDotIndicators currentStep={currentStep} totalSteps={totalSteps} onDotClick={onDotClick} />
      </motion.div>
    </div>
  );
}

/** Step indicator with icon, title, step count, and close button */
function TourProgressHeader({ step, currentStep, totalSteps, onSkip }: {
  step: TourStep; currentStep: number; totalSteps: number; onSkip: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xs bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
          {step.icon}
        </div>
        <div>
          <h3 className="text-[9px] font-black uppercase tracking-widest text-white/90">
            {step.title}
          </h3>
          <span className="text-[6px] font-mono text-white/20 uppercase tracking-wider">
            Step {currentStep + 1} of {totalSteps}
          </span>
        </div>
      </div>
      <button
        onClick={onSkip}
        aria-label="Skip tour"
        className="p-1 rounded-xs text-white/20 hover:text-white/60 hover:bg-white/5 transition-colors"
        title="Skip tour"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/** Step description text */
function TourDescription({ description }: { description: string }) {
  return (
    <p className="text-[8px] font-mono leading-relaxed text-white/60 mb-5">
      {description}
    </p>
  );
}

/** Back / Next / Complete navigation buttons */
function TourNavButtons({ isFirst, isLast, onPrev, onNext }: {
  isFirst: boolean; isLast: boolean; onPrev: () => void; onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <button
        onClick={onPrev}
        disabled={isFirst}
        aria-label="Go to previous step"
        className={`flex items-center gap-1 px-3 py-1.5 rounded-xs text-[8px] font-bold uppercase tracking-wider transition-all ${
          isFirst
            ? 'text-white/10 cursor-not-allowed'
            : 'text-white/40 hover:text-white/80 hover:bg-white/5'
        }`}
      >
        <ChevronLeft className="w-3 h-3" />
        Back
      </button>
      <button
        onClick={onNext}
        aria-label={isLast ? 'Complete tour' : 'Go to next step'}
        className="flex items-center gap-1.5 px-4 py-1.5 rounded-xs bg-primary/20 border border-primary/30 text-primary text-[8px] font-black uppercase tracking-wider hover:bg-primary/30 transition-all"
      >
        {isLast ? (
          <>
            <Check className="w-3 h-3" />
            Complete
          </>
        ) : (
          <>
            Next
            <ChevronRight className="w-3 h-3" />
          </>
        )}
      </button>
    </div>
  );
}

/** Dot indicators for quick step navigation */
function TourDotIndicators({ currentStep, totalSteps, onDotClick }: {
  currentStep: number; totalSteps: number; onDotClick: (idx: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-1 pb-3">
      {Array.from({ length: totalSteps }, (_, idx) => (
        <button
          key={idx}
          onClick={() => onDotClick(idx)}
          className={`w-1.5 h-1.5 rounded-full transition-all ${
            idx === currentStep
              ? 'bg-primary w-3'
              : 'bg-white/15 hover:bg-white/30'
          }`}
          title={`Go to step ${idx + 1}`}
        />
      ))}
    </div>
  );
}

// ── Highlight Ring ─────────────────────────────────────────────────────

function HighlightRing({ selector }: { selector: string }) {
  const [rect, setRect] = useState({ top: 0, left: 0, width: 0, height: 0 });

  useEffect(() => {
    const update = () => {
      const el = document.querySelector(selector);
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [selector]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed z-[9997] pointer-events-none"
      style={{
        top: rect.top - 4,
        left: rect.left - 4,
        width: rect.width + 8,
        height: rect.height + 8,
        boxShadow:
          '0 0 0 2px rgba(var(--primary-rgb, 0, 242, 255), 0.5), 0 0 24px rgba(var(--primary-rgb, 0, 242, 255), 0.15)',
        borderRadius: 2,
      }}
    />
  );
}
