import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export type ArtifactReference = { provider: "local" | "0g"; reference: string; contentHash: string; transactionHash?: string };
export interface ArtifactStore {
  put(key: string, content: Uint8Array): Promise<ArtifactReference>;
  get(reference: string): Promise<Uint8Array>;
}

export class LocalArtifactStore implements ArtifactStore {
  constructor(private readonly rootDirectory: string) {}

  async put(key: string, content: Uint8Array): Promise<ArtifactReference> {
    const target = this.resolveSafe(key);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content, { flag: "wx" });
    return {
      provider: "local", reference: key,
      contentHash: `sha256:${createHash("sha256").update(content).digest("hex")}`
    };
  }

  async get(reference: string): Promise<Uint8Array> {
    return readFile(this.resolveSafe(reference));
  }

  private resolveSafe(reference: string): string {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(reference)) throw new Error("Invalid artifact reference");
    const root = resolve(this.rootDirectory);
    const target = resolve(root, reference);
    if (!target.startsWith(`${root}/`)) throw new Error("Artifact reference escapes storage root");
    return target;
  }
}
