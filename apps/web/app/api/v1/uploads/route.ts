import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const base = process.env.AETHED_API_URL?.replace(/\/$/, "");
  if (!base) return NextResponse.json({ error: { code: "API_NOT_CONFIGURED", message: "AETHED_API_URL is required for production uploads" } }, { status: 503 });
  const response = await fetch(`${base}/api/v1/uploads`, { method: "POST", body: await request.formData() });
  return NextResponse.json(await response.json(), { status: response.status });
}
