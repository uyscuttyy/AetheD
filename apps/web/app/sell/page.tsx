"use client";

import { useState } from "react";

type Result = { status: string; score?: number; confidence?: number; passport?: { passportHash: string; datasetHash: string; limitations: string[] }; error?: string };
type VerificationResponse = { data?: { status: string; score?: { score: number; confidence: number }; passport?: Result["passport"]; error?: string } };

export default function SellPage() {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Research");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  async function analyze() {
    if (!file || !name) return;
    setBusy(true); setResult({ status: "Uploading" });
    try {
      const form = new FormData();
      form.set("sellerAddress", "local-demo-seller");
      form.set("name", name); form.set("description", description); form.set("category", category);
      form.set("version", "1.0"); form.set("file", file);
      const response = await fetch("/api/v1/uploads", { method: "POST", body: form });
      const body = await response.json();
      if (!response.ok || !body.data) throw new Error(body.error?.message ?? "Dataset submission failed");
      setResult({ status: "Verifying" });
      let verified: VerificationResponse = {};
      for (let attempt = 0; attempt < 60; attempt++) {
        const verification = await fetch(`/api/v1/verifications/${body.data.verificationId}`, { cache: "no-store" });
        verified = await verification.json();
        if (verified.data?.status === "completed" || verified.data?.status === "failed") break;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      if (!verified.data) throw new Error("Verification result unavailable");
      setResult({ status: verified.data.status,
        ...(verified.data.score ? { score: verified.data.score.score, confidence: verified.data.score.confidence } : {}),
        ...(verified.data.passport ? { passport: verified.data.passport } : {}),
        ...(verified.data.error ? { error: verified.data.error } : {}) });
    } catch (error) {
      setResult({ status: "Failed", error: error instanceof Error ? error.message : "Unable to analyze dataset" });
    } finally { setBusy(false); }
  }

  return <section className="sellPage shell"><div className="pageIntro"><span className="sectionIndex">DATA PROVIDERS / LOCAL VERIFICATION</span><h1>Turn raw data into<br/><em>a trusted asset.</em></h1><p>Upload a CSV, JSON, or JSONL file. AetheD will measure its structure, integrity, consistency, and limitations.</p></div><div className="sellLayout"><form className="uploadForm" onSubmit={(event) => { event.preventDefault(); void analyze(); }}><label>Dataset name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Crypto Sentiment Pro" required /></label><label>Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} /></label><label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option>Research</option><option>Finance</option><option>Commerce</option><option>Language</option></select></label><label className="fileDrop">{file ? <><strong>{file.name}</strong><small>{(file.size / 1024).toFixed(1)} KB · ready to analyze</small></> : <><strong>Choose a dataset file</strong><small>CSV, JSON, or JSONL · local limit 25 MB</small></>}<input type="file" accept=".csv,.json,.jsonl" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required /></label><button className="darkButton" disabled={busy || !file || !name}>{busy ? "Analyzing…" : "Analyze Dataset →"}</button></form><aside className="verificationPanel">{!result ? <><span className="sectionIndex">WHAT HAPPENS NEXT</span><h2>Evidence before listing.</h2><p>The local verification engine profiles the exact file bytes, calculates AetheScore, and produces a version-specific Data Passport.</p><div className="pipelineSteps"><span>01 <b>Parse and validate</b></span><span>02 <b>Profile quality signals</b></span><span>03 <b>Score with limitations</b></span><span>04 <b>Generate Data Passport</b></span></div></> : <><span className="sectionIndex">VERIFICATION RESULT</span><div className={`resultState ${result.status.toLowerCase()}`}><i /> {result.status}</div>{result.score !== undefined && <div className="resultScore"><strong>{result.score}</strong><span>AetheScore<br/><small>{Math.round((result.confidence ?? 0) * 100)}% confidence</small></span></div>}{result.passport && <div className="resultMeta"><span>Dataset hash <code>{result.passport.datasetHash.slice(0, 24)}…</code></span><span>Passport hash <code>{result.passport.passportHash.slice(0, 24)}…</code></span><span>Limitations <b>{result.passport.limitations.length}</b></span></div>}{result.error && <p className="errorText">{result.error}</p>}</>}</aside></div></section>;
}
