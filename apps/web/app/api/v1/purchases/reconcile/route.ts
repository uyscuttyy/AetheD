import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const apiUrl = process.env.AETHED_API_URL?.replace(/\/$/, "");
  if (!apiUrl) return NextResponse.json({ error: { code: "API_UNAVAILABLE", message: "AETHED_API_URL is not configured" } }, { status: 503 });
  const response = await fetch(`${apiUrl}/api/v1/purchases/reconcile`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify(await request.json()), cache: "no-store"
  });
  return NextResponse.json(await response.json(), { status: response.status });
}
