import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { SubmitDatasetInput, VerificationInputStore } from "../../domain/src/index.js";

type StoredInput = Omit<SubmitDatasetInput, "rawBytes"> & { rawBytesBase64: string };

export class FileVerificationInputStore implements VerificationInputStore {
  constructor(private readonly root: string) {}

  private path(id: string) {
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error("Invalid verification input identifier");
    return join(this.root, `${id}.json`);
  }

  async put(id: string, input: SubmitDatasetInput): Promise<void> {
    await mkdir(this.root, { recursive: true });
    const stored: StoredInput = { ...input, rawBytesBase64: Buffer.from(input.rawBytes).toString("base64") };
    delete (stored as Partial<SubmitDatasetInput>).rawBytes;
    await writeFile(this.path(id), JSON.stringify(stored), { flag: "wx", mode: 0o600 });
  }

  async get(id: string): Promise<SubmitDatasetInput | undefined> {
    try {
      const stored = JSON.parse(await readFile(this.path(id), "utf8")) as StoredInput;
      const { rawBytesBase64, ...input } = stored;
      return { ...input, rawBytes: Buffer.from(rawBytesBase64, "base64") };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    await rm(this.path(id), { force: true });
  }
}
