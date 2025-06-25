/**
 * Professional UI State Management Hook
 * Manages sidebar, mobile menu, and other UI state
 */

import { create } from "zustand";

interface UIState {
  sidebarExpanded: boolean;
  mobileMenuOpen: boolean;
  setSidebarExpanded: (expanded: boolean) => void;
  setMobileMenuOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  toggleMobileMenu: () => void;
}

export const useUIState = create<UIState>(set => ({
  sidebarExpanded: true,
  mobileMenuOpen: false,
  setSidebarExpanded: expanded => set({ sidebarExpanded: expanded }),
  setMobileMenuOpen: open => set({ mobileMenuOpen: open }),
  toggleSidebar: () =>
    set(state => ({ sidebarExpanded: !state.sidebarExpanded })),
  toggleMobileMenu: () =>
    set(state => ({ mobileMenuOpen: !state.mobileMenuOpen })),
}));
