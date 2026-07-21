import React from 'react';
import { useSession } from '../infrastructure/session';

/** Route guard: the admin console is a platform-admin surface (§14.3). RC-11:
 *  enforce the platform-admin role so non-admins are rejected, not just
 *  cosmetically hidden. */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const session = useSession();
  if (!session.authed) {
    return <div style={{ padding: 24 }}>Redirecting to login…</div>;
  }
  if (!session.user.roles.includes('platform-admin')) {
    return <div style={{ padding: 24, color: '#c00' }}>Access denied: platform-admin role required.</div>;
  }
  return <>{children}</>;
}
