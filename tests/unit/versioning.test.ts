import { describe, it, expect } from "vitest";
import { nextCheckpointLabel, canCheckpoint, canLock, lockLabel } from "../../src/domain/versioning";

describe("Versioning rules", () => {
  it("computes next checkpoint labels", () => {
    expect(nextCheckpointLabel([])).toBe("V1");
    expect(nextCheckpointLabel(["V1"])).toBe("V2");
  });

  it("controls checkpoint/lock transitions", () => {
    expect(canCheckpoint("draft")).toBe(true);
    expect(canCheckpoint("final")).toBe(false);
    expect(canLock("checkpoint")).toBe(true);
    expect(canLock("draft")).toBe(false);
    expect(lockLabel()).toBe("Final");
  });
});
