import { describe, it, expect } from "vitest";
import { nextPhase, isFinalPhase } from "../../src/domain/phase";

describe("Workflow phase transitions", () => {
  it("advances through phases deterministically", () => {
    expect(nextPhase("Understanding")).toBe("Requirements");
    expect(nextPhase("Requirements")).toBe("Scaffolding");
    expect(nextPhase("Scaffolding")).toBe("Production");
    expect(nextPhase("Production")).toBe("Finalization");
    expect(nextPhase("Finalization")).toBe(null);
  });

  it("detects final phase", () => {
    expect(isFinalPhase("Finalization")).toBe(true);
  });
});
