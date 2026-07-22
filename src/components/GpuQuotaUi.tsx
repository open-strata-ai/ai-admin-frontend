import React, { useEffect, useState } from 'react';
import { Alert, Card, Col, Row, Statistic, Spin, Tag } from 'antd';
import { adminClient, type GpuPoolView } from '../application/admin/adminClient';

/** GPU quota governance (ADR-0002). Fetched live from ai-admin-service
 *  GET /api/v1/admin/gpu-pool. Disabled until the `full` profile enables
 *  self-hosted inference (Phase 4); the backend is the source of truth. */
export function GpuQuotaUi() {
  const [gpu, setGpu] = useState<GpuPoolView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminClient
      .getGpuPool()
      .then((g) => !cancelled && setGpu(g))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <div style={{ color: '#c00' }}>Failed to load GPU pool: {error}</div>;
  if (!gpu) return <Spin />;

  return (
    <div>
      <Alert
        type="info"
        showIcon
        message="GPU quota governance is enabled in Phase 4 (self-hosted inference). Status below is served live by ai-admin-service."
        style={{ marginBottom: 16 }}
      />
      <Row gutter={16}>
        <Col span={8}>
          <Card title="GPU pool">
            <p>
              Status:{' '}
              {gpu.enabled ? (
                <Tag color="green">Enabled</Tag>
              ) : (
                <Tag color="orange">Disabled</Tag>
              )}
            </p>
            <Statistic title="Available GPUs" value={gpu.availableGpu} />
            {!gpu.enabled && <p style={{ color: '#888' }}>{gpu.reason}</p>}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
