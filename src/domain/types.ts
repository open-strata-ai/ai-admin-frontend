// Domain types for ai-admin-frontend (governance console). Pure data contracts.

export type Role = 'platform-admin' | 'tenant-admin' | 'developer' | 'viewer';

export interface TenantSummary {
  id: string;
  name: string;
  plan: 'trial' | 'standard' | 'enterprise';
  status: 'active' | 'paused' | 'created';
}

/** Real tenant governance as returned by GET /api/v1/admin/tenants (RC-10). */
export interface TenantGovernanceView {
  id: string;
  packageTier?: 'TRIAL' | 'STANDARD' | 'ENTERPRISE';
}

export type AuditAction = 'tenant.create' | 'tenant.quota' | 'user.invite' | 'component.toggle' | string;

export interface AuditEntry {
  id: number;
  actor: string;
  action: AuditAction;
  scope?: string;
  tenantId: string;
  at: string;
  status?: 'success' | 'failed';
}

export interface GpuQuota {
  model: string;
  total: number;
  allocated: number;
  idle: number;
}

export interface GovernanceView {
  tenantCount: number;
  clusterHealthy: boolean;
  globalCost: number;
  openIncidents: number;
}
