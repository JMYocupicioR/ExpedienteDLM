import type { ReactNode } from 'react';

type ThemeProviderProps = {
  children: ReactNode;
};

/**
 * Minimal compatibility ThemeProvider for this workspace.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  return <>{children}</>;
}

