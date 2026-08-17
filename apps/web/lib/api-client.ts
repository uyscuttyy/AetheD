import { getDataset as getDemoDataset, datasets as demoDatasets, type DemoDataset } from "./demo-data";

const apiUrl = () => process.env.AETHED_API_URL?.replace(/\/$/, "");
type ApiDataset = { id: string; name: string; description: string; category: string; versions: Array<{ version: string; format: string; sizeBytes: number; recordCount: number; contentHash: string; verification?: { score?: { score: number; confidence: number; dimensions: Record<string, { score: number | null }> }; passport?: { contentHash?: string } } }> };
type ApiSearchDataset = { id: string; name: string; category: string; version: string; format: string; recordCount: number; aetheScore?: number; confidence?: number };

const toView = (value: ApiDataset): DemoDataset => {
  const version = value.versions.at(-1); const score = version?.verification?.score;
  return { id: value.id, name: value.name, description: value.description, category: value.category,
    score: score?.score ?? 0, confidence: score?.confidence ?? 0, records: version?.recordCount ?? 0,
    format: (version?.format?.toUpperCase() ?? "JSON") as DemoDataset["format"], freshness: "Unknown",
    tags: [value.category], price: 0, size: version ? `${Math.round(version.sizeBytes / 1024 / 1024)} MB` : "Unknown",
    license: "Not specified", version: version?.version ?? "Unknown", hash: version?.contentHash ?? "Unknown",
    synthetic: false, dimensions: Object.fromEntries(Object.entries(score?.dimensions ?? {}).map(([key, item]) => [key, item.score])) };
};

type DataSource = "api" | "demo" | "unavailable";
const allowDemo = process.env.NODE_ENV !== "production" && process.env.AETHED_ENABLE_DEMO_DATA !== "false";

export async function fetchMarketplace(): Promise<{ datasets: DemoDataset[]; source: DataSource }> {
  const base = apiUrl(); if (!base) return allowDemo ? { datasets: demoDatasets, source: "demo" } : { datasets: [], source: "unavailable" };
  try { const response = await fetch(`${base}/api/v1/datasets`, { next: { revalidate: 15 } }); if (!response.ok) throw new Error();
    const body = await response.json() as { data: ApiSearchDataset[] };
    return { datasets: body.data.map(value => ({ id: value.id, name: value.name, description: "Verified dataset listing", category: value.category,
      score: value.aetheScore ?? 0, confidence: value.confidence ?? 0, records: value.recordCount,
      format: value.format.toUpperCase() as DemoDataset["format"], freshness: "Unknown", tags: [value.category],
      price: 0, size: "See dataset", license: "Not specified", version: value.version, hash: "See Data Passport",
      synthetic: false, dimensions: {} })), source: "api" };
  } catch { return allowDemo ? { datasets: demoDatasets, source: "demo" } : { datasets: [], source: "unavailable" }; }
}

export async function fetchDataset(id: string): Promise<{ dataset?: DemoDataset; source: DataSource }> {
  const base = apiUrl();
  if (base) try { const response = await fetch(`${base}/api/v1/datasets/${encodeURIComponent(id)}`, { next: { revalidate: 15 } });
    if (response.ok) return { dataset: toView((await response.json() as { data: ApiDataset }).data), source: "api" }; } catch {}
  if (!allowDemo) return { source: "unavailable" };
  const demo = getDemoDataset(id);
  return demo ? { dataset: demo, source: "demo" } : { source: "demo" };
}
