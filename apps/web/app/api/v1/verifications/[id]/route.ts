import { NextResponse } from "next/server";
import { getLocalApi } from "../../../../../lib/local-api";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const base = process.env.AETHED_API_URL?.replace(/\/$/, "");
  if (base) {
    const response = await fetch(`${base}/api/v1/verifications/${encodeURIComponent((await context.params).id)}`, { cache: "no-store" });
    return NextResponse.json(await response.json(), { status: response.status });
  }
  const response = await getLocalApi().api.getVerification((await context.params).id);
  return NextResponse.json(response.body, { status: response.status });
}
