import React from 'react';
import { DataTable, type DataTableColumn } from '@openstrata/ai-ui-kit';
import type { TenantSummary } from '../domain/types';

const MOCK: TenantSummary[] = [
  { id: 'local', name: 'Local Tenant', plan: 'trial', status: 'active' },
  { id: 't2', name: 'Acme', plan: 'enterprise', status: 'active' },
  { id: 't3', name: 'Globex', plan: 'standard', status: 'paused' },
];

export function TenantsPage() {
  const columns: DataTableColumn<TenantSummary>[] = [
    { key: 'name', title: 'Name', sortable: true },
    { key: 'plan', title: 'Plan' },
    { key: 'status', title: 'Status' },
  ];
  return <DataTable data={MOCK} columns={columns} rowKey="id" pagination={{ pageSize: 10 }} />;
}
