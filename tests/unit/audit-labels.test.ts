import { describe, expect, it } from "vitest";
import { AUDIT_ACTIONS } from "@/lib/audit";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";

describe("audit actions", () => {
  it("each action written to audit_log has a label in both languages", () => {
    for (const messages of [en, fr]) {
      const labels = messages.billingAdmin as Record<string, string>;
      for (const action of AUDIT_ACTIONS) expect(labels[`action_${action.replaceAll(".", "_")}`], action).toBeTruthy();
    }
  });
});
