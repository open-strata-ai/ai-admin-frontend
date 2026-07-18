import React from 'react';
import { Alert, Card, Col, Row } from 'antd';
import type { GpuQuota } from '../domain/types';

// GPU quota governance only goes live in Phase 4 (self-hosted inference).
// Until then the UI is a capacity-planning placeholder (DESIGN §7.3 / §11 #1).
const MOCK: GpuQuota[] = [
  { model: 'A100', total: 64, allocated: 40, idle: 24 },
  { model: 'H100', total: 32, allocated: 10, idle: 22 },
];

export function GpuQuotaUi() {
  return (
    <div>
      <Alert
        type="info"
        showIcon
        message="GPU quota governance is enabled in Phase 4 (self-hosted inference). This view is a capacity-planning placeholder."
        style={{ marginBottom: 16 }}
      />
      <Row gutter={16}>
        {MOCK.map((g) => (
          <Col span={8} key={g.model}>
            <Card title={`${g.model} pool`}>
              <p>Total: {g.total}</p>
              <p>Allocated: {g.allocated}</p>
              <p>Idle: {g.idle}</p>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
