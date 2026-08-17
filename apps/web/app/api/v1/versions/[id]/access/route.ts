import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const apiUrl = process.env.AETHED_API_URL?.replace(/\/$/, "");
  if (!apiUrl) return NextResponse.json({ error: { code: "API_UNAVAILABLE", message: "AETHED_API_URL is not configured" } }, { status: 503 });
  const source = new URL(request.url);
  const target = new URL(`${apiUrl}/api/v1/versions/${encodeURIComponent((await params).id)}/access`);
  for (const key of ["buyerAddress", "timestamp", "signature"]) {
    const value = source.searchParams.get(key); if (value) target.searchParams.set(key, value);
  }
  const response = await fetch(target, { cache: "no-store" });
  return NextResponse.json(await response.json(), { status: response.status });
}
