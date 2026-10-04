/**
 * @jest-environment jsdom
 *
 * Tests for useMenuNavigation hook — keyboard navigation,
 * click-outside closing, auto-focus, and active menu state.
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { renderHook, act, fireEvent } from '@testing-library/react';
import { useMenuNavigation } from '../useMenuNavigation';

const MENU_IDS = ['file', 'edit', 'view', 'window', 'help'];

// ── Helpers ────────────────────────────────────────────────────────────

/**
 * Mount a minimal DOM structure for keyboard navigation testing.
 * Returns cleanup function and a map of menuId → button elements.
 */
function mountMenuStructure(
  result: ReturnType<typeof useMenuNavigation>,
): { triggers: Map<string, HTMLElement>; menus: Map<string, HTMLElement>; cleanup: () => void } {
  const container = document.createElement('div');
  container.setAttribute('role', 'menubar');

  // Assign the container to menuRef's current
  Object.defineProperty(result.menuRef, 'current', {
    value: container,
    writable: true,
  });

  const triggers = new Map<string, HTMLElement>();
  const menus = new Map<string, HTMLElement>();

  MENU_IDS.forEach((id) => {
    const trigger = document.createElement('button');
    trigger.setAttribute('data-menu-trigger', id);
    trigger.textContent = id;
    container.appendChild(trigger);
    triggers.set(id, trigger);

    const menuDiv = document.createElement('div');
    menuDiv.setAttribute('data-menu-id', id);
    menuDiv.setAttribute('role', 'menu');
    menuDiv.style.display = 'none';
    container.appendChild(menuDiv);
    menus.set(id, menuDiv);
  });

  document.body.appendChild(container);

  return {
    triggers,
    menus,
    cleanup: () => {
      document.body.removeChild(container);
    },
  };
}

function addMenuItems(menuEl: HTMLElement, count: number): HTMLButtonElement[] {
  const items: HTMLButtonElement[] = [];
  for (let i = 0; i < count; i++) {
    const btn = document.createElement('button');
    btn.setAttribute('role', 'menuitem');
    btn.textContent = `Item ${i}`;
    menuEl.appendChild(btn);
    items.push(btn);
  }
  return items;
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// ── Initial state ──────────────────────────────────────────────────────

describe('useMenuNavigation — initial state', () => {
  it('should start with activeMenu = null', () => {
    const { result } = renderHook(() => useMenuNavigation({ menuIds: MENU_IDS }));
    expect(result.current.activeMenu).toBeNull();
  });

  it('should return all expected properties', () => {
    const { result } = renderHook(() => useMenuNavigation({ menuIds: MENU_IDS }));
    expect(result.current).toHaveProperty('activeMenu');
    expect(result.current).toHaveProperty('setActiveMenu');
    expect(result.current).toHaveProperty('menuRef');
    expect(result.current).toHaveProperty('handleMenuBarKeyDown');
    expect(result.current).toHaveProperty('handleItemKeyDown');
    expect(result.current).toHaveProperty('closeMenu');
    expect(typeof result.current.setActiveMenu).toBe('function');
    expect(typeof result.current.handleMenuBarKeyDown).toBe('function');
    expect(typeof result.current.handleItemKeyDown).toBe('function');
    expect(typeof result.current.closeMenu).toBe('function');
  });
});

// ── setActiveMenu / closeMenu ──────────────────────────────────────────

describe('useMenuNavigation — setActiveMenu / closeMenu', () => {
  it('should set activeMenu when setActiveMenu is called', () => {
    const { result } = renderHook(() => useMenuNavigation({ menuIds: MENU_IDS }));

    act(() => {
      result.current.setActiveMenu('file');
    });

    expect(result.current.activeMenu).toBe('file');
  });

  it('should clear activeMenu when setActiveMenu(null) is called', () => {
    const { result } = renderHook(() => useMenuNavigation({ menuIds: MENU_IDS }));

    act(() => {
      result.current.setActiveMenu('file');
    });
    act(() => {
      result.current.setActiveMenu(null);
    });

    expect(result.current.activeMenu).toBeNull();
  });

  it('should clear activeMenu when closeMenu is called', () => {
    const { result } = renderHook(() => useMenuNavigation({ menuIds: MENU_IDS }));

    act(() => {
      result.current.setActiveMenu('view');
    });
    expect(result.current.activeMenu).toBe('view');

    act(() => {
      result.current.closeMenu();
    });

    expect(result.current.activeMenu).toBeNull();
  });
});

// ── handleMenuBarKeyDown — navigation ──────────────────────────────────

describe('useMenuNavigation — handleMenuBarKeyDown navigation', () => {
  it('should navigate to next menu on ArrowRight', () => {
    const { result } = renderHook(() => useMenuNavigation({ menuIds: MENU_IDS }));

    act(() => result.current.setActiveMenu('file'));
    act(() => {
      result.current.handleMenuBarKeyDown({ key: 'ArrowRight', preventDefault: jest.fn() } as unknown as React.KeyboardEvent<HTMLElement>);
    });

    expect(result.current.activeMenu).toBe('edit');
  });

  it('should wrap around from last to first on ArrowRight', () => {
    const { result } = renderHook(() => useMenuNavigation({ menuIds: MENU_IDS }));

    act(() => result.current.setActiveMenu('help'));
    act(() => {
      result.current.handleMenuBarKeyDown({ key: 'ArrowRight', preventDefault: jest.fn() } as unknown as React.KeyboardEvent<HTMLElement>);
    });

    expect(result.current.activeMenu).toBe('file');
  });

  it('should navigate to previous menu on ArrowLeft', () => {
    const { result } = renderHook(() => useMenuNavigation({ menuIds: MENU_IDS }));

    act(() => result.current.setActiveMenu('view'));
    act(() => {
      result.current.handleMenuBarKeyDown({ key: 'ArrowLeft', preventDefault: jest.fn() } as unknown as React.KeyboardEvent<HTMLElement>);
    });

    expect(result.current.activeMenu).toBe('edit');
  });

  it('should wrap around from first to last on ArrowLeft', () => {
    const { result } = renderHook(() => useMenuNavigation({ menuIds: MENU_IDS }));

    act(() => result.current.setActiveMenu('file'));
    act(() => {
      result.current.handleMenuBarKeyDown({ key: 'ArrowLeft', preventDefault: jest.fn() } as unknown as React.KeyboardEvent<HTMLElement>);
    });

    expect(result.current.activeMenu).toBe('help');
  });

  it('should open first menu on ArrowDown when nothing is active', () => {
    const { result } = renderHook(() => useMenuNavigation({ menuIds: MENU_IDS }));

    act(() => {
      result.current.handleMenuBarKeyDown({ key: 'ArrowDown', preventDefault: jest.fn() } as unknown as React.KeyboardEvent<HTMLElement>);
    });

    expect(result.current.activeMenu).toBe('file');
  });

  it('should close menu on Escape', () => {
    const { result } = renderHook(() => useMenuNavigation({ menuIds: MENU_IDS }));

    act(() => result.current.setActiveMenu('window'));
    act(() => {
      result.current.handleMenuBarKeyDown({ key: 'Escape', preventDefault: jest.fn() } as unknown as React.KeyboardEvent<HTMLElement>);
    });

    expect(result.current.activeMenu).toBeNull();
  });

  it('should jump to first menu on Home', () => {
    const { result } = renderHook(() => useMenuNavigation({ menuIds: MENU_IDS }));

    act(() => result.current.setActiveMenu('window'));
    act(() => {
      result.current.handleMenuBarKeyDown({ key: 'Home', preventDefault: jest.fn() } as unknown as React.KeyboardEvent<HTMLElement>);
    });

    expect(result.current.activeMenu).toBe('file');
  });

  it('should jump to last menu on End', () => {
    const { result } = renderHook(() => useMenuNavigation({ menuIds: MENU_IDS }));

    act(() => result.current.setActiveMenu('file'));
    act(() => {
      result.current.handleMenuBarKeyDown({ key: 'End', preventDefault: jest.fn() } as unknown as React.KeyboardEvent<HTMLElement>);
    });

    expect(result.current.activeMenu).toBe('help');
  });

  it('should select first menu on Home when none active', () => {
    const { result } = renderHook(() => useMenuNavigation({ menuIds: MENU_IDS }));

    act(() => {
      result.current.handleMenuBarKeyDown({ key: 'Home', preventDefault: jest.fn() } as unknown as React.KeyboardEvent<HTMLElement>);
    });

    expect(result.current.activeMenu).toBe('file');
  });

  it('should select last menu on End when none active', () => {
    const { result } = renderHook(() => useMenuNavigation({ menuIds: MENU_IDS }));

    act(() => {
      result.current.handleMenuBarKeyDown({ key: 'End', preventDefault: jest.fn() } as unknown as React.KeyboardEvent<HTMLElement>);
    });

    expect(result.current.activeMenu).toBe('help');
  });

  it('should ignore unknown keys (ArrowDown when active)', () => {
    const { result } = renderHook(() => useMenuNavigation({ menuIds: MENU_IDS }));

    act(() => result.current.setActiveMenu('file'));
    act(() => {
      result.current.handleMenuBarKeyDown({ key: 'ArrowDown', preventDefault: jest.fn() } as unknown as React.KeyboardEvent<HTMLElement>);
    });

    // ArrowDown when already active is a no-op (no special behavior)
    expect(result.current.activeMenu).toBe('file');
  });
});

// ── handleItemKeyDown — item navigation ────────────────────────────────

describe('useMenuNavigation — handleItemKeyDown item navigation', () => {
  it('should move focus to next item on ArrowDown', () => {
    const { result } = renderHook(() => useMenuNavigation({ menuIds: MENU_IDS }));
    const { menus, cleanup } = mountMenuStructure(result.current);
    const items = addMenuItems(menus.get('file')!, 3);

    // Focus first item
    items[0].focus();

    act(() => {
      result.current.handleItemKeyDown(
        { key: 'ArrowDown', preventDefault: jest.fn(), currentTarget: items[0] } as unknown as React.KeyboardEvent<HTMLButtonElement>,
        'file',
      );
    });

    expect(document.activeElement).toBe(items[1]);
    cleanup();
  });

  it('should wrap to first item on ArrowDown at last', () => {
    const { result } = renderHook(() => useMenuNavigation({ menuIds: MENU_IDS }));
    const { menus, cleanup } = mountMenuStructure(result.current);
    const items = addMenuItems(menus.get('file')!, 3);

    items[2].focus();

    act(() => {
      result.current.handleItemKeyDown(
        { key: 'ArrowDown', preventDefault: jest.fn(), currentTarget: items[2] } as unknown as React.KeyboardEvent<HTMLButtonElement>,
        'file',
      );
    });

    expect(document.activeElement).toBe(items[0]);
    cleanup();
  });

  it('should move focus to previous item on ArrowUp', () => {
    const { result } = renderHook(() => useMenuNavigation({ menuIds: MENU_IDS }));
    const { menus, cleanup } = mountMenuStructure(result.current);
    const items = addMenuItems(menus.get('edit')!, 3);

    items[2].focus();

    act(() => {
      result.current.handleItemKeyDown(
        { key: 'ArrowUp', preventDefault: jest.fn(), currentTarget: items[2] } as unknown as React.KeyboardEvent<HTMLButtonElement>,
        'edit',
      );
    });

    expect(document.activeElement).toBe(items[1]);
    cleanup();
  });

  it('should wrap to last item on ArrowUp at first', () => {
    const { result } = renderHook(() => useMenuNavigation({ menuIds: MENU_IDS }));
    const { menus, cleanup } = mountMenuStructure(result.current);
    const items = addMenuItems(menus.get('edit')!, 3);

    items[0].focus();

    act(() => {
      result.current.handleItemKeyDown(
        { key: 'ArrowUp', preventDefault: jest.fn(), currentTarget: items[0] } as unknown as React.KeyboardEvent<HTMLButtonElement>,
        'edit',
      );
    });

    expect(document.activeElement).toBe(items[2]);
    cleanup();
  });

  it('should close menu and refocus trigger on Escape', () => {
    const { result } = renderHook(() => useMenuNavigation({ menuIds: MENU_IDS }));
    const { triggers, menus, cleanup } = mountMenuStructure(result.current);
    const items = addMenuItems(menus.get('window')!, 2);

    act(() => result.current.setActiveMenu('window'));
    items[0].focus();

    act(() => {
      result.current.handleItemKeyDown(
        { key: 'Escape', preventDefault: jest.fn(), currentTarget: items[0] } as unknown as React.KeyboardEvent<HTMLButtonElement>,
        'window',
      );
    });

    expect(result.current.activeMenu).toBeNull();
    expect(document.activeElement).toBe(triggers.get('window'));
    cleanup();
  });

  it('should jump to first item on Home', () => {
    const { result } = renderHook(() => useMenuNavigation({ menuIds: MENU_IDS }));
    const { menus, cleanup } = mountMenuStructure(result.current);
    const items = addMenuItems(menus.get('view')!, 4);

    items[3].focus();

    act(() => {
      result.current.handleItemKeyDown(
        { key: 'Home', preventDefault: jest.fn(), currentTarget: items[3] } as unknown as React.KeyboardEvent<HTMLButtonElement>,
        'view',
      );
    });

    expect(document.activeElement).toBe(items[0]);
    cleanup();
  });

  it('should jump to last item on End', () => {
    const { result } = renderHook(() => useMenuNavigation({ menuIds: MENU_IDS }));
    const { menus, cleanup } = mountMenuStructure(result.current);
    const items = addMenuItems(menus.get('view')!, 4);

    items[0].focus();

    act(() => {
      result.current.handleItemKeyDown(
        { key: 'End', preventDefault: jest.fn(), currentTarget: items[0] } as unknown as React.KeyboardEvent<HTMLButtonElement>,
        'view',
      );
    });

    expect(document.activeElement).toBe(items[3]);
    cleanup();
  });

  it('should no-op gracefully when menu container does not exist', () => {
    const { result } = renderHook(() => useMenuNavigation({ menuIds: MENU_IDS }));

    expect(() => {
      act(() => {
        result.current.handleItemKeyDown(
          { key: 'ArrowDown', preventDefault: jest.fn() } as unknown as React.KeyboardEvent<HTMLButtonElement>,
          'nonexistent',
        );
      });
    }).not.toThrow();
  });
});

// ── Click outside ──────────────────────────────────────────────────────

describe('useMenuNavigation — click outside', () => {
  it('should close menu when clicking outside the menuRef', () => {
    const { result } = renderHook(() => useMenuNavigation({ menuIds: MENU_IDS }));

    // Mount a nav element as the menuRef target
    const nav = document.createElement('nav');
    Object.defineProperty(result.current.menuRef, 'current', {
      value: nav,
      writable: true,
    });
    document.body.appendChild(nav);

    act(() => result.current.setActiveMenu('file'));
    expect(result.current.activeMenu).toBe('file');

    // Click outside
    const outsideEl = document.createElement('div');
    document.body.appendChild(outsideEl);

    act(() => {
      fireEvent.mouseDown(outsideEl);
    });

    expect(result.current.activeMenu).toBeNull();

    document.body.removeChild(nav);
    document.body.removeChild(outsideEl);
  });

  it('should NOT close menu when clicking inside the menuRef', () => {
    const { result } = renderHook(() => useMenuNavigation({ menuIds: MENU_IDS }));

    const nav = document.createElement('nav');
    Object.defineProperty(result.current.menuRef, 'current', {
      value: nav,
      writable: true,
    });
    document.body.appendChild(nav);

    act(() => result.current.setActiveMenu('edit'));
    expect(result.current.activeMenu).toBe('edit');

    // Click inside the nav
    const child = document.createElement('button');
    nav.appendChild(child);

    act(() => {
      fireEvent.mouseDown(child);
    });

    // Still active — click was inside the nav
    expect(result.current.activeMenu).toBe('edit');

    document.body.removeChild(nav);
  });
});

// ── Auto-focus ─────────────────────────────────────────────────────────

describe('useMenuNavigation — auto-focus', () => {
  it('should focus first menu item when a menu opens', () => {
    const { result } = renderHook(() => useMenuNavigation({ menuIds: MENU_IDS }));
    const { menus, cleanup } = mountMenuStructure(result.current);
    const items = addMenuItems(menus.get('file')!, 3);

    act(() => {
      result.current.setActiveMenu('file');
    });

    // Tick the auto-focus setTimeout (50ms)
    act(() => {
      jest.advanceTimersByTime(60);
    });

    expect(document.activeElement).toBe(items[0]);
    cleanup();
  });

  it('should not auto-focus when activeMenu is null', () => {
    const focusSpy = jest.spyOn(HTMLElement.prototype, 'focus');

    const { result } = renderHook(() => useMenuNavigation({ menuIds: MENU_IDS }));
    const { menus, cleanup } = mountMenuStructure(result.current);
    addMenuItems(menus.get('file')!, 2);

    // Don't set any active menu — auto-focus effect should return early
    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(focusSpy).not.toHaveBeenCalled();
    cleanup();
    focusSpy.mockRestore();
  });

  it('should auto-focus first item of newly opened menu when switching menus', () => {
    const { result } = renderHook(() => useMenuNavigation({ menuIds: MENU_IDS }));
    const { menus, cleanup } = mountMenuStructure(result.current);
    const fileItems = addMenuItems(menus.get('file')!, 2);
    const editItems = addMenuItems(menus.get('edit')!, 2);

    // Open file menu
    act(() => result.current.setActiveMenu('file'));
    act(() => jest.advanceTimersByTime(60));
    expect(document.activeElement).toBe(fileItems[0]);

    // Switch to edit menu
    act(() => result.current.setActiveMenu('edit'));
    act(() => jest.advanceTimersByTime(60));
    expect(document.activeElement).toBe(editItems[0]);

    cleanup();
  });

  it('should clear auto-focus timer when menu closes quickly', () => {
    const focusSpy = jest.spyOn(HTMLElement.prototype, 'focus');
    const { result } = renderHook(() => useMenuNavigation({ menuIds: MENU_IDS }));
    const { menus, cleanup } = mountMenuStructure(result.current);
    addMenuItems(menus.get('file')!, 2);

    // Open and quickly close the menu before the 50ms timer fires
    act(() => result.current.setActiveMenu('file'));
    act(() => result.current.setActiveMenu(null));

    // Advance timers — the timer should have been cleared
    act(() => jest.advanceTimersByTime(100));

    // focus() should not have been called (timer was cleared)
    expect(focusSpy).not.toHaveBeenCalled();
    cleanup();
    focusSpy.mockRestore();
  });
});

// ── HandleMenuBarKeyDown — edge cases ──────────────────────────────────

describe('useMenuNavigation — keydown edge cases', () => {
  it('should not crash with empty menuIds', () => {
    const { result } = renderHook(() => useMenuNavigation({ menuIds: [] }));

    expect(() => {
      act(() => {
        result.current.handleMenuBarKeyDown({ key: 'ArrowRight', preventDefault: jest.fn() } as unknown as React.KeyboardEvent<HTMLElement>);
      });
      act(() => {
        result.current.handleMenuBarKeyDown({ key: 'ArrowLeft', preventDefault: jest.fn() } as unknown as React.KeyboardEvent<HTMLElement>);
      });
      act(() => {
        result.current.handleMenuBarKeyDown({ key: 'Home', preventDefault: jest.fn() } as unknown as React.KeyboardEvent<HTMLElement>);
      });
      act(() => {
        result.current.handleMenuBarKeyDown({ key: 'End', preventDefault: jest.fn() } as unknown as React.KeyboardEvent<HTMLElement>);
      });
    }).not.toThrow();
  });

  it('should handle single menu ID without wrapping issues', () => {
    const { result } = renderHook(() => useMenuNavigation({ menuIds: ['only'] }));

    act(() => result.current.setActiveMenu('only'));
    act(() => {
      result.current.handleMenuBarKeyDown({ key: 'ArrowRight', preventDefault: jest.fn() } as unknown as React.KeyboardEvent<HTMLElement>);
    });
    expect(result.current.activeMenu).toBe('only'); // wraps to itself

    act(() => {
      result.current.handleMenuBarKeyDown({ key: 'ArrowLeft', preventDefault: jest.fn() } as unknown as React.KeyboardEvent<HTMLElement>);
    });
    expect(result.current.activeMenu).toBe('only'); // wraps to itself
  });

  it('should call preventDefault for handled keys', () => {
    const { result } = renderHook(() => useMenuNavigation({ menuIds: MENU_IDS }));
    const preventDefault = jest.fn();

    act(() => {
      result.current.handleMenuBarKeyDown({ key: 'ArrowRight', preventDefault } as unknown as React.KeyboardEvent<HTMLElement>);
    });

    expect(preventDefault).toHaveBeenCalled();
  });
});
