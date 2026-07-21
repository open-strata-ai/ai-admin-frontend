import React, { useEffect, useState } from 'react';
import { Button, Space, Spin } from 'antd';
import { DataTable, type DataTableColumn } from '@openstrata/ai-ui-kit';
import type { AuditEntry } from '../domain/types';
import { adminClient } from '../application/admin/adminClient';

/** Audit log retrieval (RULE-09 / §14.6). Fetched live from
 *  ai-admin-service GET /api/v1/admin/audit — the backend is INSERT-ONLY,
 *  so the data shown is authoritative, not a local mock. */
export function AuditLogViewer() {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    let cancelled = false;
    adminClient
      .getAudit()
      .then((e) => !cancelled && setEntries(e))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <div style={{ color: '#c00' }}>Failed to load audit log: {error}</div>;
  if (!entries) return <Spin />;

  const totalPages = Math.max(1, Math.ceil(entries.length / pageSize));
  const slice = entries.slice((page - 1) * pageSize, page * pageSize);

  const columns: DataTableColumn<AuditEntry>[] = [
    { key: 'actor', title: 'Actor', sortable: true },
    { key: 'action', title: 'Action' },
    { key: 'tenantId', title: 'Tenant' },
    { key: 'at', title: 'Time' },
  ];

  return (
    <div>
      <DataTable
        data={slice}
        columns={columns}
        rowKey="id"
        pagination={false}
      />
      <Space style={{ marginTop: 12 }}>
        <Button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Prev
        </Button>
        <span>
          Page {page} / {totalPages}
        </span>
        <Button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
          Next
        </Button>
      </Space>
    </div>
  );
}
