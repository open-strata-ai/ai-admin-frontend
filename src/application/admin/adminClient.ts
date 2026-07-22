import { apiClient } from '../../infrastructure/apiClient';
import type { TenantGovernanceView } from '../../domain/types';

/** Admin governance client (ADR-0001/0003/0005). Talks to ai-admin-service
 *  real REST surface — every call hits the backend, nothing is mocked. */
export const adminClient = {
  /** GET /v1/admin/tenants → full tenant governance view (RC-10: real plan).
   *  The leading /api is supplied by VITE_ADMIN_API_BASE (dev: Vite proxy /api,
   *  default: http://localhost:8088/api) so the request reaches the backend at
   *  /api/v1/admin/tenants without a doubled /api prefix. */
  listTenants(): Promise<TenantGovernanceView[]> {
    return apiClient.get<TenantGovernanceView[]>('/v1/admin/tenants');
  },

  /** POST /v1/admin/tenants → create a tenant (RC-9 minimal CRUD). */
  createTenant(req: { tenantId: string; packageTier: string }): Promise<TenantGovernanceView> {
    return apiClient.post<TenantGovernanceView>('/v1/admin/tenants', req);
  },

  /** DELETE /v1/admin/tenants/{id} → remove a tenant (RC-9 minimal CRUD). */
  deleteTenant(id: string): Promise<void> {
    return apiClient.request<void>(`/v1/admin/tenants/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  /** GET /v1/admin/global-resources → platform global resource view. */
  getGovernance(): Promise<{ gpuPool: GpuPoolView }> {
    return apiClient.get<{ gpuPool: GpuPoolView }>('/v1/admin/global-resources');
  },

  /** GET /v1/admin/gpu-pool → self-hosted GPU pool status (Phase 4). */
  getGpuPool(): Promise<GpuPoolView> {
    return apiClient.get<GpuPoolView>('/v1/admin/gpu-pool');
  },

  /** GET /v1/admin/audit → immutable audit entries (RULE-09). */
  getAudit(scope?: string, tenantId?: string): Promise<AuditEntry[]> {
    const qs = new URLSearchParams();
    if (scope) qs.set('scope', scope);
    if (tenantId) qs.set('tenantId', tenantId);
    const q = qs.toString();
    return apiClient.get<AuditEntry[]>(`/v1/admin/audit${q ? `?${q}` : ''}`);
  },
};

/** GPU pool view returned by ai-admin-service (ADR-0002). */
export interface GpuPoolView {
  enabled: boolean;
  reason: string;
  availableGpu: number;
}

/** Audit entry as returned by ai-admin-service (RULE-09). */
export interface AuditEntry {
  id: number;
  actor: string;
  scope: string;
  tenantId: string;
  action: string;
  payload?: Record<string, unknown>;
  at: string;
}
