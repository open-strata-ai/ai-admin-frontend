// Domain types for ai-admin-frontend (governance console). Pure data contracts.

export type Role = 'platform-admin' | 'tenant-admin' | 'developer' | 'viewer';

export interface TenantSummary {
  id: string;
  name: string;
  plan: 'trial' | 'standard' | 'enterprise';
  status: 'active' | 'paused' | 'created';
}

export type AuditAction = 'tenant.create' | 'tenant.quota' | 'user.invite' | 'component.toggle';

export interface AuditEntry {
  id: string;
  actor: string;
  action: AuditAction;
  target: string;
  tenantId: string;
  at: number;
  status: 'success' | 'failed';
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
