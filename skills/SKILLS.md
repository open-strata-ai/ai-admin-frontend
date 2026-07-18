# ai-admin-frontend · Encoding rules (SKILLS)

> **auto-generated from `design/DESIGN.md`** — concrete coding rules for AI agents working on this repository. Each rule is actionable and testable.

---

## Rule Group A · State Management (§3)

### A1 — AdminContext for Governance Scope

The admin portal has a governance scope layer on top of the standard portal state. It tracks whether the current user is acting in `platform` or `tenant` mode.

```typescript
// application/admin/AdminContext.tsx
interface AdminState {
  user: { id: string; roles: Role[] };
  scope: {
    mode: 'platform' | 'tenant';
    tenantId?: string;      // populated when mode='tenant'
  };
  tenants: TenantSummary[];  // platform-admin: all; tenant-admin: authorized
  accessToken: string;
}
```

**Rule**: `AdminContext` is the ONLY React Context for admin state. All feature-level state goes into Zustand stores. The context provides session/scope data; stores manage domain data.

**Rule**: When `scope.mode` changes (via `TenantSwitcher`), ALL Zustand stores must be reset. Use a `useEffect` in `AdminContext` to call `reset()` on every registered store.

```typescript
// Register stores for scope-change reset
const adminStores = [useTenantStore, useUserStore, useResourceStore, useAuditStore];

useEffect(() => {
  adminStores.forEach(store => store.getState().reset());
}, [scope.mode, scope.tenantId]);
```

### A2 — Zustand Store Pattern (Admin Variant)

Admin stores follow the same base pattern as portal stores, with additional governance operations:

```typescript
// application/<feature>/use<Feature>Store.ts
interface AdminFeatureState<T> {
  // Data
  items: T[];
  selectedId?: string;
  loading: Record<string, boolean>;

  // Admin-specific: scope-aware operations
  fetchForScope: () => Promise<void>;        // fetches based on scope.mode
  fetchForTenant: (tenantId: string) => Promise<void>;  // explicit tenant query

  // CRUD
  create: (data: CreateDTO) => Promise<T>;
  update: (id: string, data: UpdateDTO) => Promise<T>;
  remove: (id: string) => Promise<void>;

  // Admin-specific: bulk operations
  bulkUpdate: (ids: string[], data: UpdateDTO) => Promise<void>;

  reset: () => void;
}
```

**Rule**: `fetchForScope()` is the primary data-fetching method. It reads `AdminContext.scope` to determine the API endpoint:
- `platform` mode → `GET /api/tenants` (all tenants)
- `tenant` mode → `GET /api/tenants/:tenantId` (single tenant detail)

### A3 — Domain Layer + Port Interfaces

Same layering as portal, with admin-specific Ports:

```typescript
// domain/tenant/TenantPort.ts
export interface TenantPort {
  listAll(): Promise<TenantSummary[]>;           // platform scope
  getById(id: string): Promise<TenantDetail>;    // any scope
  create(spec: TenantSpec): Promise<TenantDetail>;
  update(id: string, spec: Partial<TenantSpec>): Promise<TenantDetail>;
  decommission(id: string): Promise<void>;
  setQuota(id: string, quota: TenantQuota): Promise<TenantDetail>;
  setComponents(id: string, components: string[]): Promise<TenantDetail>;
}

// domain/resource/ResourcePort.ts
export interface ResourcePort {
  getPlatformResources(): Promise<PlatformResourceSnapshot>;
  getTenantResources(tenantId: string): Promise<TenantResourceProfile>;
}

// domain/audit/AuditPort.ts
export interface AuditPort {
  search(query: AuditQuery): Promise<AuditEntry[]>;
  getRecentAnomalies(): Promise<AuditEntry[]>;
}
```

**Rule**: Each Port has exactly ONE adapter in `infrastructure/`. The adapter uses the same `AdminApiClient` instance (singleton per session), injected via constructor.

---

## Rule Group B · API Integration (§5)

### B1 — AdminApiClient

```typescript
// infrastructure/adminApiClient.ts
export class AdminApiClient extends ApiClient {
  // Inherits: get<T>, post<T>, put<T>, delete, request<T>

  // Admin-specific: injects scope header
  constructor(private baseUrl: string, private adminSession: AdminContext) {
    super(baseUrl, adminSession);
  }

  protected override getHeaders(init: RequestInit): HeadersInit {
    const base = super.getHeaders(init);
    return {
      ...base,
      'X-Admin-Scope': this.adminSession.scope.mode, // 'platform' | 'tenant'
    };
  }
}
```

**Rule**: Every request from the admin portal goes through `AdminApiClient`. It injects THREE headers:
- `Authorization: Bearer <accessToken>` (from base `ApiClient`)
- `X-Tenant-Id: <tenant.id>` (from base `ApiClient`, when scope is tenant)
- `X-Admin-Scope: platform|tenant` (admin-specific, for backend RBAC enforcement)

### B2 — Error Handling (Admin-Specific)

| Code | Trigger | Frontend Treatment |
|------|---------|-------------------|
| `409` | Tenant name/ID conflict, quota exceeds global budget | Inline form error; quota budget remaining shown as `¥remaining / ¥total` |
| `422` | `TenantSpec` schema validation | Field-level errors aligned with manifest schema |
| `403` | Cross-tenant access, non-admin attempt | `Result` page + message: "You don't have permission to manage this tenant" |
| `401` | Token expiry | Silent refresh → retry (same as portal) |
| `429` | Admin API rate limit | Retry with `Retry-After` header |
| `5xx` | Backend/managed-plane failure | `ErrorBoundary` + retry button |

**Rule**: Admin 409 errors include remaining global budget in the response `details`. Display this as a helper text under the quota form field: "Platform budget remaining: 12 CPUs, 500k tokens/day".

### B3 — Optimistic Updates + Rollback

**Rule**: Admin write operations use optimistic UI updates with server-confirmed rollback:

```typescript
// In a Zustand store action
async updateTenant(id: string, data: Partial<TenantSpec>) {
  const prev = get().items;                              // snapshot before change
  set(s => ({ items: s.items.map(t => t.id===id ? {...t, ...data} : t) }));  // optimistic

  try {
    const updated = await tenantPort.update(id, data);   // server confirms
    set(s => ({ items: s.items.map(t => t.id===id ? updated : t) }));  // replace with confirmed
  } catch (err) {
    set({ items: prev, error: normalizeError(err) });    // rollback on failure
    throw err;                                           // re-throw for UI toast
  }
}
```

**Rule**: Optimistic updates are only used for single-item mutations. Multi-tenant bulk operations (`bulkUpdate`) use a pending/success/fail progress UI instead.

---

## Rule Group C · Multi-Tenant UI (§7)

### C1 — Platform vs Tenant Resource Views

The admin portal has TWO fundamentally different resource views:

**Platform view** (`/resources`, platform-admin only):
- Node inventory: list of all K8s nodes with health, labels, taints
- GPU pool: total/allocated/free by GPU model type
- Shared services: gateway, auth, monitoring, billing health dashboard
- Global quota: total platform budget vs allocated across tenants
- Platform cost: aggregated internal + external API spend

```typescript
// Platform resource card pattern
function PlatformResourceCard({ resource }: { resource: PlatformResource }) {
  return (
    <Card>
      <Statistic title={resource.name} value={resource.total} suffix={resource.unit} />
      <Progress
        percent={resource.used / resource.total * 100}
        status={resource.used/resource.total > 0.9 ? 'exception' : 'active'}
      />
      <Space>
        <Tag>Allocated: {resource.allocated}</Tag>
        <Tag>Free: {resource.total - resource.allocated}</Tag>
      </Space>
    </Card>
  );
}
```

**Tenant view** (`/tenants/:id/resources`) — 4-quadrant layout:
```
┌──────────────────────┐  ┌──────────────────────┐
│ Allocated            │  │ Used (Realtime)      │
│ Plan quotas +        │  │ Metrics-server /     │
│ overrides            │  │ Kueue / Gateway      │
├──────────────────────┤  ├──────────────────────┤
│ Isolation            │  │ Billing              │
│ Namespace / Quota /  │  │ Budget / Spent /     │
│ NetworkPolicy        │  │ Overage Alerts       │
└──────────────────────┘  └──────────────────────┘
```

**Rule**: The 4-quadrant layout is implemented as a CSS Grid: `grid-template-columns: 1fr 1fr; grid-template-rows: auto auto; gap: 16px;`. Each quadrant is a self-contained `ResourceQuadrant` component receiving `{ label, items: ResourceMetric[] }`.

### C2 — Stage-Gated GPU Views

**Rule**: GPU columns, charts, and quota forms are gated by profile tier:

```typescript
function isGpuEnabled(): boolean {
  return import.meta.env.VITE_PROFILE_TIER === 'full';
}

// In template:
{isGpuEnabled() && (
  <GPUQuotaSection />    // Renders GPU allocation form + charts
)}
{!isGpuEnabled() && (
  <Alert
    type="info"
    message="GPU quota management is available in the Enterprise (Full) plan"
  />
)}
```

**Rule**: Never render "0 GPU" data when GPU is not enabled. Always show the info placeholder instead — avoids confusion with zero-usage states.

### C3 — Tenant Switcher (Platform Admin)

**Rule**: `TenantSwitcher` in the admin portal supports TWO modes:
1. `platform` mode → switch between tenants for detail drill-down (scope remains platform, tenant is context)
2. `tenant` mode → locked to authorized tenants only

```typescript
function AdminTenantSwitcher() {
  const { scope, tenants, setScope } = useContext(AdminContext);

  // Platform admin: can switch to any tenant or back to platform
  // Tenant admin: sees only own tenants, no platform toggle
  const options = useMemo(() => {
    if (scope.mode === 'tenant') {
      return tenants.map(t => ({ label: t.name, value: t.id }));
    }
    return [
      { label: 'All Tenants (Platform View)', value: '__platform__' },
      ...tenants.map(t => ({ label: t.name, value: t.id })),
    ];
  }, [tenants, scope.mode]);

  return (
    <Select
      value={scope.mode === 'platform' ? '__platform__' : scope.tenantId}
      options={options}
      onChange={(val) => {
        if (val === '__platform__') setScope({ mode: 'platform' });
        else setScope({ mode: 'tenant', tenantId: val });
      }}
    />
  );
}
```

### C4 — ConfirmModal as Audit Gateway

**Rule**: Every destructive or boundary-changing operation in the admin portal goes through `ConfirmModal` BEFORE the API call. The modal must display:
1. Operation description (what will happen)
2. Impact summary (affected tenants/users/resources)
3. A note: "This action will be recorded in the audit log"
4. For decommission/deletion: a text input requiring the user to type the target name

**Rule**: Audit log entries are READ-ONLY in the frontend. The audit page provides search, filter by date/tenant/operation type, and export (CSV). No edit or delete buttons on audit entries.

### C5 — Tenant Detail Page Structure

```
/tenants/:id
  ├── Tab: Overview       — name, plan, status, dates, SSO config
  ├── Tab: Users          — member list, invite form, role management
  ├── Tab: Resources      — 4-quadrant resource profile
  ├── Tab: Components     — enabled/disabled toggle grid + model whitelist
  └── Tab: Settings       — tenant theme, domain, API keys, SSO config
```

**Rule**: Each tab is a separate lazy-loaded component. Tab data is fetched only when the tab is activated (not all on page load).

---

## Cross-Cutting Rules

| Rule ID | Description |
|---------|-------------|
| CC1 | Every admin mutation shows a loading indicator on the action button, not a global spinner |
| CC2 | `ErrorBoundary` per tab; tab-level errors do not crash the entire tenant page |
| CC3 | All date/time values displayed in user's locale (i18n) |
| CC4 | `Table` columns have `ellipsis: true` for long content; tooltip shows full text |
| CC5 | All search/filter inputs debounced at 300ms before triggering API calls |
| CC6 | `DataTable` virtual scrolling enabled for all lists exceeding 100 rows |
| CC7 | Export operations (CSV) are capped at 10,000 rows with a confirmation prompt |
| CC8 | All audit-related operations verify `tenantSafe: true` before displaying any data |
