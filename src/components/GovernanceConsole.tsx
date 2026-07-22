import React, { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Tag, Spin } from 'antd';
import { MermaidRenderer } from '@openstrata/ai-ui-kit';
import { adminClient, type GpuPoolView } from '../application/admin/adminClient';

const PORTRAIT = `graph TD
  Platform -->|allocates| TenantA
  Platform -->|allocates| TenantB
  TenantA --> NSA[Namespace A]
  TenantB --> NSB[Namespace B]`;

/** Governance authority views (ADR-0001). Fetched live from ai-admin-service
 *  (global resources + tenant list) — no hardcoded VIEW. */
export function GovernanceConsole() {
  const [tenantCount, setTenantCount] = useState<number | null>(null);
  const [gpu, setGpu] = useState<GpuPoolView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([adminClient.listTenants(), adminClient.getGovernance()])
      .then(([ids, gov]) => {
        if (cancelled) return;
        setTenantCount(ids.length);
        setGpu(gov.gpuPool);
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <div style={{ color: '#c00' }}>Failed to load governance: {error}</div>;
  if (tenantCount === null || gpu === null) return <Spin />;

  return (
    <Row gutter={16}>
      <Col span={6}>
        <Card>
          <Statistic title="Tenants" value={tenantCount} />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="Cluster"
            value={gpu.enabled ? 'Healthy' : 'Degraded'}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic title="GPU available" value={gpu.availableGpu} />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic title="GPU pool" value={gpu.enabled ? 'Enabled' : 'Disabled'} />
          {!gpu.enabled && <Tag color="orange">{gpu.reason}</Tag>}
        </Card>
      </Col>
      <Col span={24}>
        <Card title="Tenant resource portrait (§14.5)">
          <MermaidRenderer code={PORTRAIT} />
        </Card>
      </Col>
      <Col span={24}>
        <Tag color="blue">Governance authority: centralized write path (ADR-0001)</Tag>
      </Col>
    </Row>
  );
}
