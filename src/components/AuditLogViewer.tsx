import React, { useState } from 'react';
import { Button, Space } from 'antd';
import { DataTable, type DataTableColumn } from '@openstrata/ai-ui-kit';
import type { AuditEntry } from '../domain/types';

const MOCK: AuditEntry[] = Array.from({ length: 53 }, (_, i) => ({
  id: `a${i}`,
  actor: i % 3 === 0 ? 'local-admin' : 'system',
  action: (['tenant.create', 'tenant.quota', 'user.invite', 'component.toggle'] as const)[i % 4],
  target: `tenant-${i % 5}`,
  tenantId: 'local',
  at: Date.now() - i * 3_600_000,
  status: i % 9 === 0 ? 'failed' : 'success',
}));

/** Audit log retrieval with server-style paging (§14.6; open question #5). */
export function AuditLogViewer() {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.ceil(MOCK.length / pageSize);
  const slice = MOCK.slice((page - 1) * pageSize, page * pageSize);

  const columns: DataTableColumn<AuditEntry>[] = [
    { key: 'actor', title: 'Actor', sortable: true },
    { key: 'action', title: 'Action' },
    { key: 'target', title: 'Target' },
    { key: 'status', title: 'Status' },
  ];

  return (
    <div>
      <DataTable data={slice} columns={columns} rowKey="id" pagination={false} />
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
