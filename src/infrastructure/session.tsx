import React, { createContext, useContext, useEffect, useState } from 'react';
import { setSessionRef } from './sessionStore';

export interface SessionUser {
  id: string;
  name: string;
  roles: string[];
}

export interface AdminSessionState {
  user: SessionUser;
  tenantId: string;
  /** platform-admin sees all tenants; tenant-admin is scoped to one. */
  scope: 'platform' | 'tenant';
  accessToken: string;
  authed: boolean;
}

const SessionContext = createContext<AdminSessionState | null>(null);

function devSession(): AdminSessionState {
  return {
    user: { id: 'local-admin', name: 'Local Admin', roles: ['platform-admin', 'tenant-admin'] },
    tenantId: 'local',
    scope: 'platform',
    accessToken: 'local-admin-token',
    authed: true,
  };
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const authMode = import.meta.env.VITE_AUTH_MODE ?? 'local';
  const [session, setSession] = useState<AdminSessionState | null>(null);

  useEffect(() => {
    // Keycloak OIDC (§4.7.3) is the production path; dev mode mints a local
    // platform-admin session so the governance console is runnable for verification.
    if (authMode !== 'local') {
      console.warn('[admin-session] Keycloak auth mode not implemented in this codegen deliverable.');
    }
    const s = devSession();
    setSessionRef({ accessToken: s.accessToken, tenantId: s.tenantId });
    setSession(s);
  }, [authMode]);

  if (!session) return null;
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export function useSession(): AdminSessionState {
  const s = useContext(SessionContext);
  if (!s) throw new Error('useSession must be used within a SessionProvider');
  return s;
}
