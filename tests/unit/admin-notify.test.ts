import { describe, expect, it } from "vitest";
import { adminNotifyAddress } from "@/lib/email/admin";
import { appVersion } from "@/lib/version";

describe("adminNotifyAddress", () => {
  it("keeps a valid address, trimmed, and refuses anything else", () => {
    expect(adminNotifyAddress(" owner@example.com ")).toBe("owner@example.com");
    for (const bad of [undefined, "", "   ", "owner", "owner@", "@example.com", "a b@example.com", `${"a".repeat(250)}@example.com`]) expect(adminNotifyAddress(bad)).toBeNull();
  });

  it("answers at once on a long input without an @", () => {
    const start = performance.now();
    expect(adminNotifyAddress("a".repeat(50_000))).toBeNull();
    expect(performance.now() - start).toBeLessThan(500);
  });
});

describe("appVersion", () => {
  it("shows a tag, a describe output or a commit, and dev otherwise", () => {
    expect(appVersion("v2026.11.23.1")).toBe("v2026.11.23.1");
    expect(appVersion(" v2026.11.23.1-3-gabc1234 ")).toBe("v2026.11.23.1-3-gabc1234");
    for (const bad of [undefined, "", "<script>", "a".repeat(65)]) expect(appVersion(bad)).toBe("dev");
  });
});
