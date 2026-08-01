/**
 * @purpose Renderiza un encabezado para una mockup en el editor de manifesto OMEGA, mostrando el nombre de la mockup, la pestaña activa y proporcionando una opción para cerrar la mockup.
 * @purpose_en Renders a header for a mockup in the OMEGA manifest editor, displaying the mockup name, active tab, and providing an option to close the mockup.
 * @refactorable false
 * @classification UI Component
 * @complexity Low
 * @fingerprint exports:1,imports:2,sig:qajofz
 * @lastUpdated 2026-06-15T12:48:51.378Z
 */

import ModalCloseButton from '../modals/ModalCloseButton';
import { Camera } from 'lucide-react';

interface MockupHeaderProps {
  name: string;
  activeTab: string;
  onClose: () => void;
}

export const MockupHeader = ({ name, activeTab, onClose }: MockupHeaderProps) => (
  <div className="h-12 border-b wb-outline flex items-center justify-between px-6 wb-surface-subtle z-10">
    <div className="flex items-center gap-3">
      <Camera className="w-4 h-4 text-primary" />
      <span className="text-[8px] md:text-[9px] font-bold uppercase wb-text-muted tracking-widest opacity-70">Industrial Render Engine v7.2.3</span>
      <div className="h-4 w-px wb-outline mx-2" />
      <span className="text-[9px] font-mono text-primary/80">{name.toUpperCase()} — {activeTab} PLANE</span>
    </div>
    <ModalCloseButton onClick={onClose} title="Close mockup" />
  </div>
);
