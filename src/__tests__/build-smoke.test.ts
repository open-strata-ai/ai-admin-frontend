import { describe, it, expect } from "vitest";
import { apiClient } from "../infrastructure/apiClient";

// Build-time smoke test (Batch D3/K2). The production build (`tsc && vite build`)
// already type-checks every admin page (tenants, audit, billing, SSO, resources);
// this confirms the shared API client module loads and is wired correctly.
describe("admin-frontend apiClient", () => {
  it("exports a configured axios instance", () => {
    expect(apiClient).toBeDefined();
    expect(typeof apiClient.get).toBe("function");
    expect(typeof apiClient.post).toBe("function");
  });
});
