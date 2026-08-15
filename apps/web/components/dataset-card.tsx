import Link from "next/link";
import type { DemoDataset } from "../lib/demo-data";
import { AetheScore } from "./aethe-score";
export function DatasetCard({ dataset }: { dataset: DemoDataset }) {
  return <article className="datasetCard"><div className="cardTop"><span className="category">{dataset.category}</span><AetheScore score={dataset.score} confidence={dataset.confidence} compact /></div><h3>{dataset.name}</h3><p>{dataset.description}</p><div className="facts">{dataset.records.toLocaleString()} records · {dataset.format}<span>Updated {dataset.freshness}</span></div><div className="tags">{dataset.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><div className="cardBottom"><strong>${dataset.price.toFixed(2)}</strong><Link href={`/datasets/${dataset.id}`}>View Dataset <span>→</span></Link></div>{dataset.synthetic && <small className="demoLabel">SYNTHETIC DEMO DATA</small>}</article>;
}
