import React, { useCallback, useEffect, useState } from 'react';
import { Button, Card, Input, Select, Space, Spin } from 'antd';
import { DataTable, type DataTableColumn } from '@openstrata/ai-ui-kit';
import type { TenantSummary, TenantGovernanceView } from '../domain/types';
import { adminClient } from '../application/admin/adminClient';
import { useSession } from '../infrastructure/session';

const TIERS = ['TRIAL', 'STANDARD', 'ENTERPRISE'];

/** Tenant registry (ADR-0001/0003). Fetched live from ai-admin-service
 *  GET /api/v1/admin/tenants — no hardcoded mock rows, and the plan reflects the
 *  tenant's real package tier (RC-10). */
export function TenantsPage() {
  const session = useSession();
  const isAdmin = session.user.roles.includes('platform-admin');
  const [tenants, setTenants] = useState<TenantSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newId, setNewId] = useState('');
  const [newTier, setNewTier] = useState('STANDARD');

  const load = useCallback(() => {
    setError(null);
    adminClient
      .listTenants()
      .then((list: TenantGovernanceView[]) =>
        setTenants(
          list.map((t) => ({
            id: t.id,
            name: t.id,
            // RC-10: derive the plan from the real package tier, no fabrication.
            plan: (t.packageTier ?? 'STANDARD').toLowerCase() as TenantSummary['plan'],
            status: 'active' as const,
          })),
        ),
      )
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onCreate = async () => {
    if (!newId.trim()) return;
    setCreating(true);
    try {
      await adminClient.createTenant({ tenantId: newId.trim(), packageTier: newTier });
      setNewId('');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  };

  const onDelete = async (id: string) => {
    try {
      await adminClient.deleteTenant(id);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  if (error) return <div style={{ color: '#c00' }}>Failed to load tenants: {error}</div>;
  if (!tenants) return <Spin />;

  const columns: DataTableColumn<TenantSummary>[] = [
    { key: 'name', title: 'Name', sortable: true },
    { key: 'id', title: 'ID' },
    { key: 'plan', title: 'Plan' },
    { key: 'status', title: 'Status' },
    ...(isAdmin
      ? [
          {
            // key must be keyof TenantSummary; reuse 'id' and ignore its value
            // in the render (antd uses it only as the column key/dataIndex).
            key: 'id' as keyof TenantSummary,
            title: 'Actions',
            render: (_: unknown, row: TenantSummary) => (
              <Button danger size="small" onClick={() => onDelete(row.id)}>
                Delete
              </Button>
            ),
          } as DataTableColumn<TenantSummary>,
        ]
      : []),
  ];

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      {isAdmin && (
        <Card size="small" title="Create tenant">
          <Space>
            <Input
              placeholder="Tenant id"
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
            />
            <Select
              value={newTier}
              onChange={setNewTier}
              style={{ width: 160 }}
              options={TIERS.map((t) => ({ value: t, label: t }))}
            />
            <Button type="primary" loading={creating} onClick={onCreate}>
              Create
            </Button>
          </Space>
        </Card>
      )}
      <DataTable
        data={tenants}
        columns={columns}
        rowKey="id"
        pagination={{ pageSize: 10 }}
      />
    </Space>
  );
}
