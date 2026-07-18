# ai-admin-frontend · Architecture fact source (ARCH)

> **auto-generated from `docs/DESIGN.md`** — AI coding ground truth for architecture decisions, persona mapping, route structure, and critical UX flows. Edit DESIGN.md to propagate changes.

---

## §1 · Persona & Role Matrix

`ai-admin-frontend` is the **governance console** for OpenStrata. It sets the boundaries (quotas, enabled components, model whitelists) that `ai-portal-frontend` and the onboarding portal operate within (§14 coordination). Three personas interact with the admin portal, each with strictly scoped governance access.

| # | Persona | Role Tag | Core Motivation | Primary Routes |
|---|---------|----------|-----------------|----------------|
| P1 | **Platform Admin** | `platform-admin` | Manage all tenants, global resources, platform costs. Create tenants, assign plans, set quotas, view platform-wide audit. | `/dashboard`, `/tenants`, `/resources` (global), `/audit`, `/settings` |
| P2 | **Tenant Admin** | `tenant-admin` | Manage own-tenant users, view usage/cost within platform boundaries, adjust component toggles. | `/tenants/:id/users`, `/tenants/:id/resources`, `/tenants/:id` |
| P3 | **Auditor / Compliance** | `viewer` | Read-only review of changes, anomaly operations, compliance trails. | `/audit` (viewer role) |

### RBAC Enforcement

```
AuthGuard(route) →
  if !session.accessToken → redirect /login
  if route.mode === 'platform' && !session.scope.mode.match('platform') → 403
  if route.mode === 'tenant' && !((session.scope.mode==='tenant' && session.scope.tenantId===route.tenantId) || session.scope.mode==='platform') → 403
```

| Guard Check | Applied To | Fallback |
|-------------|-----------|----------|
| `requireAuth` | All routes | Redirect `/login` |
| `requireRole(['platform-admin'])` | `/dashboard`, `/resources` (global), `/tenants/new`, `/audit` (write) | 403 `Result` page |
| `requireRole(['platform-admin','tenant-admin'])` | `/tenants/:id/*` (within scope) | 403 page |
| `requireRole(['platform-admin','tenant-admin','viewer'])` | `/audit` (read-only) | 403 page |
| `requireScope('platform')` | `/resources`, `/settings` (platform-level) | 403 page |
| `requireScope('tenant', tenantId)` | `/tenants/:id/users`, `/tenants/:id/resources` | 403 page |

### Menu Visibility by Role

```typescript
// Derived from session: role → visible menu items
const adminNavByRole: Record<Role, NavItem[]> = {
  'platform-admin': [
    { key: '/dashboard', label: 'Dashboard', icon: DashboardOutlined },
    { key: '/tenants', label: 'Tenants', icon: TeamOutlined },
    { key: '/resources', label: 'Global Resources', icon: CloudServerOutlined },
    { key: '/audit', label: 'Audit', icon: SafetyOutlined },
    { key: '/settings', label: 'Platform Settings', icon: SettingOutlined },
  ],
  'tenant-admin': [
    { key: '/tenants', label: 'My Tenants', icon: TeamOutlined },
    // Sub-menus per tenant: /tenants/:id, /tenants/:id/users, /tenants/:id/resources
  ],
  'viewer': [
    { key: '/audit', label: 'Audit Log', icon: SafetyOutlined },
  ],
  'developer': [],  // No admin access
};
```

---

## §2 · Feature Modules & Route Structure

Routes organized by governance domain (§14.1): Tenants, Users, Resources, Audit. Each route maps to `ai-admin-service` (Java/Spring Boot) REST endpoints.

### Route Table

| Route | Component (lazy) | Governance Domain | SPI Backend | § Ref |
|-------|-----------------|-------------------|-------------|-------|
| `/dashboard` | `DashboardPage` | Platform overview: tenant count, cluster health, global cost | `ai-admin-service` (aggregation) | §14.1 |
| `/tenants` | `TenantListPage` | Tenant list — virtual-scroll `DataTable` | `ai-admin-service` → Capsule/NS | §14.2 |
| `/tenants/new` | `TenantCreatePage` | **Tenant lifecycle**: create with plan/quota/component whitelist/model whitelist | `ai-admin-service` + `PlatformManifest` write | §14.2 |
| `/tenants/:id` | `TenantDetailPage` | Tenant detail: config, enable/disable, plan change, decommission | `ai-admin-service` | §14.2 |
| `/tenants/:id/users` | `TenantUsersPage` | **User management**: invite, role change, disable, service accounts | `ai-admin-service` → Keycloak (SSO/RBAC) | §14.3 |
| `/resources` | `GlobalResourcesPage` | **Platform resources**: nodes, GPU pool, shared service health, global quota, platform cost | `ai-admin-service` → K8s/Kueue/OpenCost | §14.4 |
| `/tenants/:id/resources` | `TenantResourcesPage` | **Tenant resources**: allocated vs used vs isolated vs billed (4-quadrant) | `ai-admin-service` → NS/Kueue/Manifest/ModelRegistry | §14.5 |
| `/audit` | `AuditPage` | Recent changes, anomaly alerts, audit log search | `ai-admin-service` (immutable audit) | §14.6 |
| `/settings` | `PlatformSettingsPage` | SSO/domain, MFA policy, role matrix | `ai-admin-service` → Keycloak | §14.3, §14.6 |

### Code Splitting Convention (same as portal)

```typescript
const DashboardPage = React.lazy(() => import('./features/dashboard/DashboardPage'));
const TenantListPage = React.lazy(() => import('./features/tenants/TenantListPage'));
const TenantCreatePage = React.lazy(() => import('./features/tenants/TenantCreatePage'));
const TenantDetailPage = React.lazy(() => import('./features/tenants/TenantDetailPage'));
const TenantUsersPage = React.lazy(() => import('./features/users/TenantUsersPage'));
const GlobalResourcesPage = React.lazy(() => import('./features/resources/GlobalResourcesPage'));
const TenantResourcesPage = React.lazy(() => import('./features/resources/TenantResourcesPage'));
const AuditPage = React.lazy(() => import('./features/audit/AuditPage'));
const PlatformSettingsPage = React.lazy(() => import('./features/settings/PlatformSettingsPage'));
```

### Guarded Sub-routes (typed params)

| Route Pattern | Params | Scope Mode | Role Required |
|---------------|--------|-----------|---------------|
| `tenants/new` | — | platform | `platform-admin` |
| `tenants/:id` | `id: UUID` | platform or tenant(id) | `platform-admin` or `tenant-admin` (own) |
| `tenants/:id/users` | `id: UUID` | platform or tenant(id) | `platform-admin` or `tenant-admin` (own) |
| `tenants/:id/resources` | `id: UUID` | platform or tenant(id) | `platform-admin` or `tenant-admin` (own) |

---

## §4 · Critical UX Flows

### 4.1 Tenant Onboarding & Governance Loop (§14.5)

This is the **defining workflow** of the admin portal. It creates the boundaries that the onboarding portal (§13) later lets tenants configure within.

```
Step  Actor                Action                                          Backend
────  ───────────────────  ──────────────────────────────────────────────  ──────────────────────────
  1   Platform Admin       Open /tenants/new → select plan template         GET /api/templates
                           (Trial / Standard / Enterprise)
  2   Platform Admin       Name tenant, set domain/SSO config               —
  3   Platform Admin       Configure quota from plan defaults              Plan preset population
                           (GPU/CPU/Token/vectors — stage-gated)
  4   Platform Admin       Select enabled component set                    POST /api/tenants (TenantSpec)
                           (rag, agent-builder, tool-registry, etc.)
  5   Platform Admin       Set model whitelist (e.g., enterprise → GPT-4o) Part of TenantSpec
  6   ai-admin-service     Create K8s Namespace + NetworkPolicy + Quota    K8s/Capsule provisioning
  7   ai-admin-service     Write PlatformManifest for this tenant          Manifest storage
  8   Platform Admin       Invite tenant-admin via /tenants/:id/users      POST /api/tenants/:id/users
                           → Keycloak creates user + assigns role
  9   Tenant Admin         Log into ai-portal-frontend                     Reads manifest → gated menu
                           → sees enabled capabilities only
 10   Platform Admin       Monitor via /tenants/:id/resources               GET tenant resource profile
                           (allocated/used/isolated/billed 4-quadrant)
 11   Platform Admin       Adjust quota / enable-disable components         PUT /api/tenants/:id
                           as needed
```

### 4.2 Quota Template & Plan Flow (§14.2)

```
Select Plan
  │
  ├─ Trial       → default quotas (minimal: CPU=2, Token=10k/day)
  │                default components: [chat, modelCatalog]
  │                model whitelist: [built-in models only]
  │
  ├─ Standard    → default quotas (CPU=8, Token=100k/day, vectors=1M)
  │                default components: [chat, agentBuilder, rag, toolRegistry, modelCatalog, billing]
  │                model whitelist: [built-in + Qwen, Claude (bring own key)]
  │
  └─ Enterprise  → default quotas (CPU=32, GPU=4, Token=1M/day, vectors=10M)
                   default components: all
                   model whitelist: all (built-in + Qwen + OpenAI + Claude + self-hosted)
                     │
                     ▼
              Generate PlatformManifest → stored per tenant
```

**Implementation detail**: Quota overrides are typed as `Partial<TenantQuota>` on top of plan defaults. The UI shows plan defaults as read-only base + editable overrides. Save validates `total allocated <= global budget` server-side (409 on conflict).

### 4.3 ConfirmModal Requirement (§14.6 Audit)

All high-risk operations MUST go through `ConfirmModal`:

| Operation | ConfirmModal Content | Audit Tag |
|-----------|---------------------|-----------|
| Create tenant | "This will provision a new namespace and allocate resources. Continue?" | `TENANT_CREATE` |
| Decommission tenant | "This will DELETE all tenant data irreversibly. Type tenant name to confirm." | `TENANT_DELETE` |
| Enable/disable component | "Changing component availability may affect running Agents. Continue?" | `COMPONENT_TOGGLE` |
| Change plan | "Plan changes affect quotas immediately. Existing workloads may be impacted." | `PLAN_CHANGE` |
| Delete user | "User will lose all access. Type username to confirm." | `USER_DELETE` |

```typescript
// Reusable confirm hook
function useConfirmOperation(operation: string, tenantId?: string) {
  const [modal, contextHolder] = Modal.useModal();

  const confirm = (action: () => Promise<void>) => {
    modal.confirm({
      title: `Confirm ${operation}`,
      content: CONFIRM_MESSAGES[operation],
      okText: 'Confirm',
      okType: 'danger',
      onOk: async () => {
        await action();
        message.success(`${operation} completed. Audit entry recorded.`);
      },
    });
  };

  return { confirm, contextHolder };
}
```

---

## Implementation-Level Decisions

| Decision | Rationale | Source |
|----------|-----------|--------|
| Admin portal does NOT call `ai-provisioning-engine` directly | Separation of concerns — provisioning is triggered by onboarding portal; admin portal writes boundaries only | §5.3, §14.1 |
| `scope.mode` tracks whether user is acting as platform or tenant admin | Enables platform admins to "impersonate" tenant scope for support | §3.2, §14.3 |
| Quota defaults are plan templates, not hardcoded | Plans evolve; admin should be able to clone and modify quota templates | §4.2, §14.2 |
| Component whitelist is part of `PlatformManifest`, not separate config | Single source of truth for tenant capabilities | §14.5 |
| Audit is immutable and read-only from frontend | Compliance requirement; no edit/delete audit entries | §14.6 |

---

## Cross-Cutting Concerns

| Concern | Implementation Point |
|---------|---------------------|
| Auth | `AuthGuard` with role + scope mode check; `AdminApiClient` injects `X-Admin-Scope` header |
| Tenant Isolation | `scope.mode` + `X-Tenant-Id`; platform admins can elevate to platform scope |
| High-Risk Confirmation | `ConfirmModal` for all destructive/mutating operations; audit trail logged |
| Error Boundaries | `ErrorBoundary` per route; `Result` fallback with retry |
| Observability | OTel spans on all admin operations; audit log entries include `user_id` + `operation` + `timestamp` |
| Responsive Layout | `ProLayout` (antd) with collapsible sidebar; table views adapt to available width |
