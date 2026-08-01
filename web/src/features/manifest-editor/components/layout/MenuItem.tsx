'use client';

/**
 * @purpose Renderiza un elemento del menú con soporte para submenús, casillas, iconos, atajos y navegación por teclado.
 * @purpose_en Renders a menu item with support for submenus, checkboxes, icons, shortcuts, and keyboard navigation.
 * @refactorable true (contains too many state variables and UI parts)
 * @classification UI Component
 * @complexity Medium
 * @fingerprint exports:1,imports:4,sig:ivfhug
 * @lastUpdated 2026-06-20T09:40:16.725Z
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Check } from 'lucide-react';
import type { MenuItemData } from './menuTypes';

interface MenuItemProps {
  item: MenuItemData;
  closeMenu: () => void;
  menuId: string;
  onItemKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>, menuId: string) => void;
}

export default function MenuItem({ item, closeMenu, menuId, onItemKeyDown }: MenuItemProps) {
  const [showSubmenu, setShowSubmenu] = useState(false);

  if (item.type === 'divider') {
    return <div className="h-px bg-outline/20 my-1 mx-2" role="separator" />;
  }

  const Icon = item.icon;
  const isCheckable = item.checked !== undefined;

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowSubmenu(true)}
      onMouseLeave={() => setShowSubmenu(false)}
    >
      <button
        disabled={item.disabled}
        role={isCheckable ? 'menuitemcheckbox' : 'menuitem'}
        aria-label={item.label}
        aria-checked={isCheckable ? item.checked : undefined}
        aria-haspopup={item.submenu ? 'true' : undefined}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' && item.submenu) {
            e.preventDefault();
            setShowSubmenu(true);
            setTimeout(() => {
              const parentWrapper = e.currentTarget.parentElement;
              const submenu = parentWrapper?.querySelector('[role="menu"]');
              const firstSub = submenu?.querySelector<HTMLButtonElement>('button[role="menuitem"], button[role="menuitemcheckbox"]');
              firstSub?.focus();
            }, 50);
          } else if (e.key === 'ArrowLeft' && showSubmenu) {
            e.preventDefault();
            setShowSubmenu(false);
          } else {
            onItemKeyDown(e, menuId);
          }
        }}
        onClick={() => {
          if (!item.submenu) {
            item.onClick?.();
            closeMenu();
          }
        }}
        className={`w-full flex items-center justify-between px-3 py-1.5 text-[8px] font-black uppercase tracking-widest transition-all ${
          item.disabled ? 'opacity-20 cursor-not-allowed' : 'hover:bg-primary hover:text-black group'
        } ${item.highlight === 'accent' ? 'text-accent hover:bg-accent hover:text-black' : item.highlight === 'deprecated' ? 'text-red-500/70 hover:bg-red-500 hover:text-black bg-red-500/5 line-through decoration-red-500/40' : 'wb-text'}`}
      >
        <div className="flex items-center gap-2">
          {isCheckable && (
            <div className="w-3 h-3 flex items-center justify-center shrink-0 border border-outline/30 rounded-xs bg-black/40 group-hover:border-black/50">
              {item.checked && <Check className="w-2 h-2 text-primary group-hover:text-black" />}
            </div>
          )}
          {Icon && <Icon className="w-3 h-3" />}
          <span>{item.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {item.shortcut && (
            <span className="text-[7px] text-white/25 font-mono tracking-normal normal-case ml-4">{item.shortcut}</span>
          )}
          {item.submenu && <ChevronRight className="w-2.5 h-2.5" />}
        </div>
      </button>

      <AnimatePresence>
        {showSubmenu && item.submenu && (
          <motion.div
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -5 }}
            transition={{ duration: 0.1 }}
            className="absolute left-full top-0 mt-[-1px] w-56 bg-[#0a0a0b] border border-outline shadow-2xl z-[120] py-1"
            role="menu"
          >
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {item.submenu.map((sub: any, idx: number) => (
              <SubMenuItem key={idx} item={sub} closeMenu={closeMenu} setShowSubmenu={setShowSubmenu} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── SubMenuItem ───────────────────────────────────────────────────────

interface SubMenuItemProps {
  item: MenuItemData;
  closeMenu: () => void;
  setShowSubmenu: (show: boolean) => void;
}

function SubMenuItem({ item, closeMenu, setShowSubmenu }: SubMenuItemProps) {
  const handleEscapeOrLeft = useCallback((e: React.KeyboardEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setShowSubmenu(false);
    // Restore focus to the parent menu item that opened this submenu
    const parentWrapper = e.currentTarget.closest('.relative');
    parentWrapper?.querySelector<HTMLButtonElement>('button[role="menuitem"], button[role="menuitemcheckbox"]')?.focus();
  }, [setShowSubmenu]);
  const isCheckable = item.checked !== undefined;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const subContainer = e.currentTarget.closest('[role="menu"]');
    if (!subContainer) return;
    const subItems = Array.from(subContainer.querySelectorAll<HTMLButtonElement>('button[role="menuitem"], button[role="menuitemcheckbox"]'));
    const idx = subItems.indexOf(e.currentTarget);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        subItems[(idx + 1) % subItems.length]?.focus();
        break;
      case 'ArrowUp':
        e.preventDefault();
        subItems[(idx - 1 + subItems.length) % subItems.length]?.focus();
        break;
      case 'Escape':
      case 'ArrowLeft':
        handleEscapeOrLeft(e);
        break;
      case 'Home':
        e.preventDefault();
        subItems[0]?.focus();
        break;
      case 'End':
        e.preventDefault();
        subItems[subItems.length - 1]?.focus();
        break;
      default:
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          item.onClick?.();
          closeMenu();
        }
    }
  };

  return (
    <button
      role={isCheckable ? 'menuitemcheckbox' : 'menuitem'}
      aria-label={item.label}
      aria-checked={isCheckable ? item.checked : undefined}
      onKeyDown={handleKeyDown}
      onClick={() => {
        item.onClick?.();
        closeMenu();
      }}
      className="w-full flex items-center justify-between px-3 py-1.5 text-[8px] font-black uppercase tracking-widest transition-all hover:bg-primary hover:text-black group"
    >
      <div className="flex items-center gap-2">
        {isCheckable && (
          <div className="w-3 h-3 flex items-center justify-center shrink-0 border border-outline/30 rounded-xs bg-black/40 group-hover:border-black/50">
            {item.checked && <Check className="w-2 h-2 text-primary group-hover:text-black" />}
          </div>
        )}
        {item.icon && <item.icon className="w-3 h-3" />}
        <span>{item.label}</span>
      </div>
      <div className="flex items-center gap-2">
        {item.shortcut && (
          <span className="text-[7px] text-white/25 font-mono tracking-normal normal-case ml-4">{item.shortcut}</span>
        )}
      </div>
    </button>
  );
}
