import { expect, test, describe, vi } from "vitest";
import { appRouter } from "./routers";

// Simple baseline test to ensure routers.ts can be evaluated and TRPC is setup correctly.
describe("routers.ts baseline", () => {
  test("appRouter is defined and has expected sub-routers", () => {
    expect(appRouter).toBeDefined();
    
    // Check that some expected procedures/routers exist
    const caller = appRouter.createCaller({ user: { id: 1, openId: "test", name: "test", email: "test", role: "user" }, req: {} as any, res: {} as any });
    
    // the structure of appRouter exposes the sub routers
    expect(caller.agents).toBeDefined();
    expect(caller.testSuites).toBeDefined();
    expect(caller.testRuns).toBeDefined();
    expect(caller.reports).toBeDefined();
    expect(caller.auth).toBeDefined();
  });
});
