import React, { useState } from 'react';
import { Layout, Menu } from 'antd';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { TenantSwitcher } from '@openstrata/ai-ui-kit';
import { useSession } from './infrastructure/session';
import { DashboardPage } from './features/DashboardPage';
import { TenantsPage } from './features/TenantsPage';
import { ResourcesPage } from './features/ResourcesPage';
import { AuditPage } from './features/AuditPage';
import { SettingsPage } from './features/SettingsPage';
import { NotFound } from './features/NotFound';
import { AuthGuard } from './auth/AuthGuard';

const { Header, Sider, Content } = Layout;

const MENU = [
  { key: '/dashboard', label: 'Dashboard' },
  { key: '/tenants', label: 'Tenants' },
  { key: '/resources', label: 'Resources' },
  { key: '/audit', label: 'Audit' },
  { key: '/settings', label: 'Settings' },
];

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const session = useSession();
  const [tenant, setTenant] = useState(session.tenantId);

  const selected = MENU.some((m) => m.key === location.pathname) ? location.pathname : '/dashboard';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="light" width={200}>
        <div style={{ padding: 16, fontWeight: 600 }}>OpenStrata Admin</div>
        <Menu mode="inline" selectedKeys={[selected]} items={MENU} onClick={({ key }) => navigate(key)} />
      </Sider>
      <Layout>
        <Header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}>
          <span>Governance Console</span>
          {session.user.roles.includes('platform-admin') && (
            <TenantSwitcher tenants={[{ id: 'local', name: 'Local Tenant' }]} value={tenant} onChange={setTenant} />
          )}
        </Header>
        <Content style={{ padding: 24 }}>
          <AuthGuard>
            <Routes>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/tenants" element={<TenantsPage />} />
              <Route path="/resources" element={<ResourcesPage />} />
              <Route path="/audit" element={<AuditPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthGuard>
        </Content>
      </Layout>
    </Layout>
  );
}
