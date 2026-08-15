export type DatasetFormat = "csv" | "json" | "jsonl";

export type DatasetRecord = Record<string, unknown>;

export type ParseOptions = {
  maxBytes?: number;
  maxRecords?: number;
};

export type ParsedDataset = {
  format: DatasetFormat;
  records: DatasetRecord[];
  columns: string[];
  byteLength: number;
};

export class DatasetParseError extends Error {
  readonly code: "UNSUPPORTED_FORMAT" | "OVERSIZED_FILE" | "MALFORMED_FILE" | "INVALID_RECORD";

  constructor(code: DatasetParseError["code"], message: string) {
    super(message);
    this.name = "DatasetParseError";
    this.code = code;
  }
}
