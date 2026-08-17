import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const apiUrl = process.env.AETHED_API_URL?.replace(/\/$/, "");
  if (!apiUrl) return NextResponse.json({ error: { code: "API_UNAVAILABLE", message: "AETHED_API_URL is not configured" } }, { status: 503 });
  const source = new URL(request.url);
  const target = new URL(`${apiUrl}/api/v1/versions/${encodeURIComponent((await params).id)}/content`);
  for (const key of ["buyerAddress", "timestamp", "signature"]) { const value = source.searchParams.get(key); if (value) target.searchParams.set(key, value); }
  const response = await fetch(target, { cache: "no-store" });
  if (!response.ok) return NextResponse.json(await response.json(), { status: response.status });
  const hash = response.headers.get("x-aethed-content-hash");
  return new NextResponse(response.body, { status: 200, headers: {
    "content-type": response.headers.get("content-type") ?? "application/octet-stream",
    "content-disposition": response.headers.get("content-disposition") ?? "attachment",
    ...(hash ? { "x-aethed-content-hash": hash } : {})
  } });
}
