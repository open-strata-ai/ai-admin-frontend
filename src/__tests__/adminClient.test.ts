import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminClient } from '../application/admin/adminClient';

async function stubFetch(body: unknown, ok = true) {
  const fetchMock = vi.fn(async () => ({
    ok,
    status: ok ? 200 : 500,
    json: async () => body,
  })) as unknown as typeof fetch;
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('adminClient (locks admin-service endpoint contract)', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('listTenants GETs /v1/admin/tenants', async () => {
    const fm = await stubFetch(['t1', 't2']);
    const r = await adminClient.listTenants();
    expect(fm).toHaveBeenCalled();
    expect(String(fm.mock.calls[0][0])).toContain('/v1/admin/tenants');
    expect(r).toEqual(['t1', 't2']);
  });

  it('getGovernance GETs /v1/admin/global-resources', async () => {
    const fm = await stubFetch({ gpuPool: { enabled: false, reason: '', availableGpu: 0 } });
    await adminClient.getGovernance();
    expect(String(fm.mock.calls[0][0])).toContain('/v1/admin/global-resources');
  });

  it('getGpuPool GETs /v1/admin/gpu-pool', async () => {
    const fm = await stubFetch({ enabled: false, reason: '', availableGpu: 0 });
    await adminClient.getGpuPool();
    expect(String(fm.mock.calls[0][0])).toContain('/v1/admin/gpu-pool');
  });

  it('getAudit GETs /v1/admin/audit with scope+tenantId query', async () => {
    const fm = await stubFetch([]);
    await adminClient.getAudit('tenant', 't1');
    expect(String(fm.mock.calls[0][0])).toContain(
      '/v1/admin/audit?scope=tenant&tenantId=t1',
    );
  });
});
