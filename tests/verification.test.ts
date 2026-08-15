import { describe, expect, it } from "vitest";
import { calculateAetheScore, parseDataset, profileDataset } from "../packages/domain/src/index.js";

const verify = (source: string) => {
  const rawBytes = new TextEncoder().encode(source);
  const dataset = parseDataset("data.json", rawBytes);
  const profile = profileDataset({ dataset, rawBytes });
  return { profile, result: calculateAetheScore(profile) };
};

describe("verification and AetheScore", () => {
  it("measures missing values and exact duplicates", () => {
    const { profile } = verify('[{"id":1,"label":"a"},{"id":1,"label":"a"},{"id":2,"label":null}]');
    expect(profile.duplicateRate).toBeCloseTo(1 / 3);
    expect(profile.missingCellRate).toBeCloseTo(1 / 6);
    expect(profile.contentHash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("caps datasets with unknown provenance and reports limitations", () => {
    const { result } = verify('[{"id":1,"label":"a"},{"id":2,"label":"b"}]');
    expect(result.score).toBeLessThanOrEqual(84);
    expect(result.components.provenance.evidenceKind).toBe("unknown");
    expect(result.limitations).toContain("No independently verified provenance evidence was supplied");
  });

  it("penalizes severe missingness and duplication", () => {
    const strong = verify('[{"id":1,"label":"a"},{"id":2,"label":"b"}]').result;
    const weak = verify('[{"id":1,"label":null},{"id":1,"label":null},{"id":1,"label":null}]').result;
    expect(weak.score).toBeLessThan(strong.score);
  });

  it("labels AI utility as inferred with low confidence", () => {
    const { result } = verify('[{"text":"sample","label":"positive"}]');
    expect(result.components.aiUtility.evidenceKind).toBe("inferred");
    expect(result.components.aiUtility.confidence).toBeLessThan(0.5);
  });
});
