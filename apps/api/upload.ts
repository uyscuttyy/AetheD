import Busboy from "busboy";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, rm } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { randomUUID } from "node:crypto";
import type { IncomingMessage } from "node:http";
import { parseDataset, type VerificationApplicationService } from "../../packages/domain/src/index.js";

const allowedExtensions = new Set([".csv", ".json", ".jsonl"]);
const requiredFields = ["sellerAddress", "name", "version"] as const;

export async function receiveDatasetUpload(
  request: IncomingMessage,
  options: { maxBytes: number; uploadRoot: string; service: VerificationApplicationService }
) {
  const contentType = request.headers["content-type"];
  if (!contentType?.startsWith("multipart/form-data")) throw new Error("Content-Type must be multipart/form-data");
  await mkdir(options.uploadRoot, { recursive: true });

  const fields: Record<string, string> = {};
  let filename = "";
  let stagedPath = "";
  let fileWrite: Promise<void> | undefined;
  const parser = Busboy({
    headers: request.headers,
    limits: { files: 1, fileSize: options.maxBytes, fields: 12, fieldSize: 16_384, parts: 13 }
  });

  const parsed = new Promise<void>((resolve, reject) => {
    parser.on("field", (name, value) => { fields[name] = value.trim(); });
    parser.on("file", (_name, stream, info) => {
      filename = basename(info.filename);
      if (!allowedExtensions.has(extname(filename).toLowerCase())) {
        stream.resume();
        reject(new Error("Only CSV, JSON, and JSONL uploads are supported"));
        return;
      }
      stagedPath = join(options.uploadRoot, `${randomUUID()}${extname(filename).toLowerCase()}`);
      const output = createWriteStream(stagedPath, { flags: "wx", mode: 0o600 });
      fileWrite = new Promise<void>((done, fail) => {
        output.once("finish", done);
        output.once("error", fail);
        stream.once("limit", () => fail(new Error(`Upload exceeds ${options.maxBytes} bytes`)));
        stream.once("error", fail);
      });
      stream.pipe(output);
    });
    parser.once("partsLimit", () => reject(new Error("Upload contains too many parts")));
    parser.once("filesLimit", () => reject(new Error("Only one dataset file is allowed")));
    parser.once("error", reject);
    parser.once("finish", resolve);
  });

  request.pipe(parser);
  try {
    await parsed;
    await fileWrite;
    if (!stagedPath || !filename) throw new Error("A dataset file is required");
    for (const field of requiredFields) if (!fields[field]) throw new Error(`${field} is required`);
    const rawBytes = await readFile(stagedPath);
    const dataset = parseDataset(filename, rawBytes, { maxBytes: options.maxBytes });
    return await options.service.submit({
      sellerAddress: fields.sellerAddress!,
      name: fields.name!,
      description: fields.description ?? "",
      category: fields.category ?? "Other",
      version: fields.version!,
      dataset,
      rawBytes
    });
  } finally {
    if (stagedPath) await rm(stagedPath, { force: true });
  }
}
