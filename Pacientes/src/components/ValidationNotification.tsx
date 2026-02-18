import type { ReactNode } from 'react';

type ValidationNotificationsProviderProps = {
  children: ReactNode;
};

/**
 * Compatibility provider used by main.tsx.
 * The previous notifications layer is not present in this worktree,
 * so this provider safely passes through children.
 */
export function ValidationNotificationsProvider({ children }: ValidationNotificationsProviderProps) {
  return <>{children}</>;
}

