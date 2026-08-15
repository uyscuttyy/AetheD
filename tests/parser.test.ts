import { describe, expect, it } from "vitest";
import { DatasetParseError, parseDataset } from "../packages/domain/src/index.js";

describe("parseDataset", () => {
  it("parses quoted CSV records", () => {
    const result = parseDataset("reviews.csv", 'id,text\n1,"clear, useful"\n2,good');
    expect(result.records).toHaveLength(2);
    expect(result.records[0]?.text).toBe("clear, useful");
  });

  it("parses JSON and JSONL object records", () => {
    expect(parseDataset("data.json", '[{"id":1}]').records).toHaveLength(1);
    expect(parseDataset("data.jsonl", '{"id":1}\n{"id":2}\n').records).toHaveLength(2);
  });

  it("rejects unsupported, malformed, and oversized files", () => {
    expect(() => parseDataset("data.xml", "<x />")).toThrow(DatasetParseError);
    expect(() => parseDataset("data.json", "{")).toThrow(DatasetParseError);
    expect(() => parseDataset("data.json", "[]", { maxBytes: 1 })).toThrowError(/exceeds/);
  });

  it("rejects inconsistent CSV rows", () => {
    expect(() => parseDataset("data.csv", "id,name\n1")).toThrowError(/wrong number of fields/);
  });
});
