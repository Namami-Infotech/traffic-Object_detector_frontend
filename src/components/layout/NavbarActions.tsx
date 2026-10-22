import React, { useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

export interface NavbarActionsProps {
  children: React.ReactNode;
}

/**
 * NavbarActions teleports action buttons (Refresh, Add, Tabs, etc.)
 * directly into the top Navbar's #navbar-module-actions slot.
 */
export const NavbarActions: React.FC<NavbarActionsProps> = ({ children }) => {
  const [target, setTarget] = useState<HTMLElement | null>(() => {
    if (typeof document !== 'undefined') {
      return document.getElementById('navbar-module-actions');
    }
    return null;
  });

  useLayoutEffect(() => {
    if (!target && typeof document !== 'undefined') {
      setTarget(document.getElementById('navbar-module-actions'));
    }
  }, [target]);

  if (!target) return null;

  return createPortal(children, target);
};
