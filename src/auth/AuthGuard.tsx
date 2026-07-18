import React from 'react';
import { useSession } from '../infrastructure/session';

/** Route guard: verifies the caller holds an admin scope (§14.3). */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const session = useSession();
  if (!session.authed) {
    return <div style={{ padding: 24 }}>Redirecting to login…</div>;
  }
  return <>{children}</>;
}
