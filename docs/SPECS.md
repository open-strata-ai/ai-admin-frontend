# ai-admin-frontend · Specifications Source of Truth (SPECS)

> **auto-generated from `docs/DESIGN.md`** — concrete specifications for route table, build pipeline, and API contracts. These are the single source of truth for implementation.

---

## §2 · Route Table Specification

### 2.1 Route Definitions

```typescript
// routes.tsx — typed route config for admin portal
export const ADMIN_ROUTES = {
  dashboard:       { path: '/dashboard',              scope: 'platform', roles: ['platform-admin'] },
  tenantList:      { path: '/tenants',                scope: 'platform', roles: ['platform-admin','tenant-admin'] },
  tenantNew:       { path: '/tenants/new',            scope: 'platform', roles: ['platform-admin'] },
  tenantDetail:    { path: '/tenants/:id',            scope: 'both',     roles: ['platform-admin','tenant-admin'] },
  tenantUsers:     { path: '/tenants/:id/users',      scope: 'both',     roles: ['platform-admin','tenant-admin'] },
  tenantResources: { path: '/tenants/:id/resources',  scope: 'both',     roles: ['platform-admin','tenant-admin'] },
  globalResources: { path: '/resources',              scope: 'platform', roles: ['platform-admin'] },
  audit:           { path: '/audit',                  scope: 'platform', roles: ['platform-admin','tenant-admin','viewer'] },
  platformSettings:{ path: '/settings',               scope: 'platform', roles: ['platform-admin'] },
} as const;
```

### 2.2 Route Properties

| Route | Lazy Component | Scope | Roles | Data on Mount |
|-------|---------------|-------|-------|---------------|
| `/dashboard` | `DashboardPage` | platform | platform-admin | `GET /api/admin/dashboard` |
| `/tenants` | `TenantListPage` | platform | platform-admin, tenant-admin | `GET /api/admin/tenants` (filtered by scope) |
| `/tenants/new` | `TenantCreatePage` | platform | platform-admin | `GET /api/admin/plans` (template list) |
| `/tenants/:id` | `TenantDetailPage` | both | platform-admin, tenant-admin | `GET /api/admin/tenants/:id` |
| `/tenants/:id/users` | `TenantUsersPage` | both | platform-admin, tenant-admin | `GET /api/admin/tenants/:id/users` |
| `/tenants/:id/resources` | `TenantResourcesPage` | both | platform-admin, tenant-admin | `GET /api/admin/tenants/:id/resources` |
| `/resources` | `GlobalResourcesPage` | platform | platform-admin | `GET /api/admin/resources` |
| `/audit` | `AuditPage` | platform | all roles | `GET /api/admin/audit?page=1&size=50` |
| `/settings` | `PlatformSettingsPage` | platform | platform-admin | `GET /api/admin/settings` |

### 2.3 Route Template (for new features)

```typescript
// To add a new admin route:
// 1. Add to ADMIN_ROUTES constant
// 2. Create React.lazy(() => import('./features/<name>/<Name>Page'))
// 3. Add to <AdminRoutes> with <Suspense fallback={<PageSkeleton />}>
// 4. Add guard: <AuthGuard route={ADMIN_ROUTES.<name>}>
//    - scope check: route.scope === 'platform' → require platform scope
//    - role check: session.user.roles ∩ route.roles ≠ ∅
// 5. Add menu entry in adminNavByRole map
```

---

## §8 · Build & Deploy Specification

### 8.1 Vite Build Configuration

```typescript
// vite.config.ts — admin-specific overrides
export default defineConfig({
  plugins: [react(), viteTsconfigPaths()],
  resolve: {
    alias: {
      '@': '/src',
      '@openstrata/ui-kit': resolve(__dirname, '../../ai-ui-kit/src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-antd': ['antd', '@ant-design/icons', '@ant-design/pro-components'],
          'vendor-state': ['zustand'],
          'vendor-charts': ['recharts', 'echarts'],
          'vendor-mermaid': ['mermaid'],
        },
      },
    },
  },
  define: {
    'import.meta.env.VITE_PROFILE_TIER': JSON.stringify(process.env.PROFILE_TIER || 'starter'),
  },
});
```

### 8.2 CI/CD Pipeline

```
Trigger: push to main, PR to main

Jobs:
┌─────────────────────────────────────────────────────────────┐
│ 1. lint       → eslint + prettier --check                   │
│ 2. typecheck  → tsc --noEmit                                │
│ 3. test       → vitest run --coverage                       │
│ 4. build      → vite build                                  │
│ 5. scan       → trivy image scan <image>                    │
│ 6. push       → docker push <registry>/ai-admin-frontend    │
└─────────────────────────────────────────────────────────────┘

Version: read from bom.yaml → tag as ai-admin-frontend@v<version>
```

### 8.3 Dockerfile

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --production=false
COPY . .
RUN npm run build

# Stage 2: Runtime
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
```

### 8.4 Runtime Configuration

```bash
# Environment variables injected at container start:
VITE_ADMIN_API_BASE=https://admin-api.openstrata.example.com
VITE_KEYCLOAK_URL=https://auth.openstrata.example.com
VITE_KEYCLOAK_REALM=openstrata
VITE_KEYCLOAK_CLIENT_ID=ai-admin
VITE_PROFILE_TIER=advanced              # gates GPU views
```

### 8.5 Kubernetes Helm Values

```yaml
# values.yaml
replicaCount: 2
image:
  repository: registry.example.com/ai-admin-frontend
  tag: "v1.0.0"
ingress:
  enabled: true
  host: admin.openstrata.example.com
configmap:
  VITE_ADMIN_API_BASE: "https://admin-api.openstrata.example.com"
  VITE_KEYCLOAK_URL: "https://auth.openstrata.example.com"
  VITE_PROFILE_TIER: "advanced"
```

### 8.6 Profile Gating

| Profile | Contains This Repo? | GPU Views Enabled? |
|---------|---------------------|--------------------|
| starter | yes | no (hidden placeholder) |
| standard | yes | no (hidden placeholder) |
| advanced | yes | no (capacity planning placeholder) |
| full | yes | yes (full GPU governance) |

> `repos.yaml` pins `ai-admin-frontend@v1.0.0`. All profiles include this repo; GPU features are toggled by `VITE_PROFILE_TIER` at build time.

---

## §5 · API Contract Summary

### 5.1 Authentication

All requests carry three headers:

```
Authorization: Bearer <Keycloak access_token>
X-Tenant-Id: <tenant.uuid>           (when scope is tenant)
X-Admin-Scope: platform | tenant     (governance context)
```

### 5.2 Backend Endpoints

#### Tenant Management

| Endpoint | Method | Body | Response | Used In |
|----------|--------|------|----------|---------|
| `/api/admin/tenants` | GET | query: `scope` param | `TenantSummary[]` | `/tenants` |
| `/api/admin/tenants` | POST | `TenantSpec` | `TenantDetail` | `/tenants/new` |
| `/api/admin/tenants/:id` | GET | — | `TenantDetail` | `/tenants/:id` |
| `/api/admin/tenants/:id` | PUT | `Partial<TenantSpec>` | `TenantDetail` | `/tenants/:id` (edit) |
| `/api/admin/tenants/:id` | DELETE | `{ confirm: "tenant-name" }` | `204` | `/tenants/:id` (decommission) |
| `/api/admin/tenants/:id/quota` | PUT | `TenantQuota` | `TenantDetail` | `/tenants/:id` (quota tab) |
| `/api/admin/tenants/:id/components` | PUT | `{ enabled: string[] }` | `TenantDetail` | `/tenants/:id` (components tab) |

#### User Management

| Endpoint | Method | Body | Response | Used In |
|----------|--------|------|----------|---------|
| `/api/admin/tenants/:id/users` | GET | — | `User[]` | `/tenants/:id/users` |
| `/api/admin/tenants/:id/users` | POST | `{ email, role }` | `User` (invitation sent) | `/tenants/:id/users` (invite) |
| `/api/admin/tenants/:id/users/:uid` | PUT | `{ role, enabled }` | `User` | `/tenants/:id/users` (edit) |
| `/api/admin/tenants/:id/users/:uid` | DELETE | `{ confirm: "username" }` | `204` | `/tenants/:id/users` (remove) |
| `/api/admin/plans` | GET | — | `PlanTemplate[]` | `/tenants/new` (plan selector) |

#### Resource Management

| Endpoint | Method | Body | Response | Used In |
|----------|--------|------|----------|---------|
| `/api/admin/resources` | GET | — | `PlatformResourceSnapshot` | `/resources` |
| `/api/admin/tenants/:id/resources` | GET | — | `TenantResourceProfile` | `/tenants/:id/resources` |

#### Audit & Settings

| Endpoint | Method | Body | Response | Used In |
|----------|--------|------|----------|---------|
| `/api/admin/audit` | GET | query: `page, size, tenant_id, op, from, to` | `Paginated<AuditEntry>` | `/audit` |
| `/api/admin/audit/anomalies` | GET | — | `AuditEntry[]` | `/audit` (alert panel) |
| `/api/admin/audit/export` | GET | query: same filters | CSV download | `/audit` (export button) |
| `/api/admin/settings` | GET | — | `PlatformSettings` | `/settings` |
| `/api/admin/settings` | PUT | `PlatformSettings` | `PlatformSettings` | `/settings` |

#### Dashboard

| Endpoint | Method | Body | Response | Used In |
|----------|--------|------|----------|---------|
| `/api/admin/dashboard` | GET | — | `AdminDashboard` | `/dashboard` |

### 5.3 Key Data Types

```typescript
interface TenantSpec {
  name: string;
  domain?: string;
  plan: 'trial' | 'standard' | 'enterprise';
  quota: TenantQuota;
  enabledComponents: string[];
  modelWhitelist: string[];
}

interface TenantQuota {
  cpu: number;
  memory: string;          // e.g., "16Gi"
  gpu?: number;            // optional, full profile only
  tokens_per_day: number;
  vectors: number;
  qps: number;
}

interface TenantResourceProfile {
  tenantId: string;
  allocated: TenantQuota;
  used: TenantQuota;
  isolation: {
    namespace: string;
    quotas: ResourceQuotaStatus[];
    policies: NetworkPolicyStatus[];
  };
  billing: {
    budget: number;
    spent: number;
    currency: string;
    period: { start: string; end: string };
  };
}

interface PlatformResourceSnapshot {
  nodes: NodeInfo[];
  gpuPool?: GPUPoolStatus;  // full profile only
  sharedServices: ServiceHealth[];
  globalQuota: {
    total: TenantQuota;
    allocated: TenantQuota;
    remaining: TenantQuota;
  };
  cost: CostSummary;
}

interface AdminDashboard {
  tenantCount: number;
  totalUsers: number;
  clusterHealth: 'healthy' | 'degraded' | 'critical';
  monthlyCost: number;
  recentAlerts: Alert[];
}

interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  operation: string;       // e.g., 'TENANT_CREATE', 'QUOTA_CHANGE'
  targetType: string;      // e.g., 'tenant', 'user', 'component'
  targetId: string;
  details: Record<string, unknown>;
  result: 'success' | 'failure';
}
```

### 5.4 Error Response Shape (same as portal)

```typescript
interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
    trace_id: string;
  };
}
```

### 5.5 Pagination Convention

```typescript
// All list endpoints support pagination
interface PaginatedQuery {
  page?: number;    // 1-based, default 1
  size?: number;    // default 20, max 100
}

interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}
```

### 5.6 Contract Evolution

- `ai-admin-service` is the sole source of truth for admin API contracts
- Breaking changes → MAJOR version bump in `bom.yaml`
- Contract types in admin frontend `domain/` must be kept in sync with the service OpenAPI spec
- Destination: auto-generate from OpenAPI (pending resolution of open question §11)
