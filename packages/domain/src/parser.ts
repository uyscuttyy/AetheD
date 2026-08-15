import { DatasetFormat, DatasetParseError, DatasetRecord, ParseOptions, ParsedDataset } from "./dataset.js";

const DEFAULT_MAX_BYTES = 25 * 1024 * 1024;
const DEFAULT_MAX_RECORDS = 250_000;

function formatFromFilename(filename: string): DatasetFormat {
  const extension = filename.toLowerCase().split(".").pop();
  if (extension === "csv" || extension === "json" || extension === "jsonl") return extension;
  throw new DatasetParseError("UNSUPPORTED_FORMAT", `Unsupported dataset format: ${extension ?? "unknown"}`);
}

function assertRecord(value: unknown, index: number): DatasetRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new DatasetParseError("INVALID_RECORD", `Record ${index + 1} must be a JSON object`);
  }
  return value as DatasetRecord;
}

function columns(records: DatasetRecord[]): string[] {
  return [...new Set(records.flatMap((record) => Object.keys(record)))].sort();
}

function parseCsv(source: string, maxRecords: number): DatasetRecord[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (character === '"') {
      if (quoted && next === '"') { cell += '"'; index += 1; } else quoted = !quoted;
    } else if (character === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(cell); cell = "";
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
    } else cell += character;
  }
  if (quoted) throw new DatasetParseError("MALFORMED_FILE", "CSV contains an unterminated quoted field");
  if (cell.length > 0 || row.length > 0) { row.push(cell); rows.push(row); }
  if (rows.length === 0) throw new DatasetParseError("MALFORMED_FILE", "CSV is empty");
  const headers = rows[0]!.map((header) => header.trim());
  if (headers.some((header) => header.length === 0) || new Set(headers).size !== headers.length) {
    throw new DatasetParseError("MALFORMED_FILE", "CSV headers must be non-empty and unique");
  }
  const dataRows = rows.slice(1);
  if (dataRows.length > maxRecords) throw new DatasetParseError("OVERSIZED_FILE", `Record limit exceeded: ${maxRecords}`);
  return dataRows.map((values, index) => {
    if (values.length !== headers.length) throw new DatasetParseError("INVALID_RECORD", `CSV row ${index + 2} has the wrong number of fields`);
    return Object.fromEntries(headers.map((header, column) => [header, values[column]]));
  });
}

export function parseDataset(filename: string, input: string | Uint8Array, options: ParseOptions = {}): ParsedDataset {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxRecords = options.maxRecords ?? DEFAULT_MAX_RECORDS;
  if (bytes.byteLength > maxBytes) throw new DatasetParseError("OVERSIZED_FILE", `File exceeds ${maxBytes} bytes`);
  const format = formatFromFilename(filename);
  const source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  let records: DatasetRecord[];
  try {
    if (format === "csv") records = parseCsv(source, maxRecords);
    else if (format === "jsonl") {
      const lines = source.split(/\r?\n/).filter((line) => line.trim() !== "");
      if (lines.length > maxRecords) throw new DatasetParseError("OVERSIZED_FILE", `Record limit exceeded: ${maxRecords}`);
      records = lines.map((line, index) => assertRecord(JSON.parse(line), index));
    } else {
      const parsed: unknown = JSON.parse(source);
      const values = Array.isArray(parsed) ? parsed : [parsed];
      if (values.length > maxRecords) throw new DatasetParseError("OVERSIZED_FILE", `Record limit exceeded: ${maxRecords}`);
      records = values.map(assertRecord);
    }
  } catch (error) {
    if (error instanceof DatasetParseError) throw error;
    throw new DatasetParseError("MALFORMED_FILE", error instanceof Error ? error.message : "Unable to parse dataset");
  }
  return { format, records, columns: columns(records), byteLength: bytes.byteLength };
}
