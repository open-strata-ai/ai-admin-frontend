import React from 'react';
import { Card, Col, Row, Statistic, Tag } from 'antd';
import { MermaidRenderer } from '@openstrata/ai-ui-kit';
import type { GovernanceView } from '../domain/types';

const VIEW: GovernanceView = {
  tenantCount: 12,
  clusterHealthy: true,
  globalCost: 4200,
  openIncidents: 2,
};

const PORTRAIT = `graph TD
  Platform -->|allocates| TenantA
  Platform -->|allocates| TenantB
  TenantA --> NSA[Namespace A]
  TenantB --> NSB[Namespace B]`;

/** Governance authority views (governance-console module, ADR-0001). */
export function GovernanceConsole() {
  return (
    <Row gutter={16}>
      <Col span={6}>
        <Card>
          <Statistic title="Tenants" value={VIEW.tenantCount} />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic title="Cluster" value={VIEW.clusterHealthy ? 'Healthy' : 'Degraded'} />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic title="Global cost" value={VIEW.globalCost} prefix="$" />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic title="Open incidents" value={VIEW.openIncidents} />
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
