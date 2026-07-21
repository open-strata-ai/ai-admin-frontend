import { describe, it, expect, beforeEach, vi } from 'vitest';
import { adminClient } from './adminClient';

function mockFetch(body: unknown, status = 200) {
  (global as any).fetch = vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  }));
}

describe('adminClient', () => {
  beforeEach(() => {
    (global as any).fetch = undefined as any;
  });

  it('listTenants() GETs /api/v1/admin/tenants', async () => {
    mockFetch(['local', 't2']);
    const ids = await adminClient.listTenants();
    expect(ids).toEqual(['local', 't2']);
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(url.endsWith('/api/v1/admin/tenants')).toBe(true);
    expect(init.method).toBe('GET');
  });

  it('getGovernance() GETs /api/v1/admin/global-resources', async () => {
    mockFetch({ gpuPool: { enabled: true, reason: 'ok', availableGpu: 8 } });
    const g = await adminClient.getGovernance();
    expect(g.gpuPool.availableGpu).toBe(8);
    const [url] = (global.fetch as any).mock.calls[0];
    expect(url.endsWith('/api/v1/admin/global-resources')).toBe(true);
  });

  it('getGpuPool() GETs /api/v1/admin/gpu-pool', async () => {
    mockFetch({ enabled: false, reason: 'phase-4', availableGpu: 0 });
    const p = await adminClient.getGpuPool();
    expect(p.enabled).toBe(false);
    const [url] = (global.fetch as any).mock.calls[0];
    expect(url.endsWith('/api/v1/admin/gpu-pool')).toBe(true);
  });

  it('getAudit() GETs /api/v1/admin/audit with query params', async () => {
    mockFetch([{ id: 1, actor: 'admin', action: 'tenant.create', tenantId: 'local', at: '2026-01-01T00:00:00Z' }]);
    const entries = await adminClient.getAudit('tenant', 'local');
    expect(entries[0].actor).toBe('admin');
    const [url] = (global.fetch as any).mock.calls[0];
    expect(url.endsWith('/api/v1/admin/audit?scope=tenant&tenantId=local')).toBe(true);
  });
});
