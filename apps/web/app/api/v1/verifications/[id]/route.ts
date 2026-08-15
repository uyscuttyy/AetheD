import { NextResponse } from "next/server";
import { getLocalApi } from "../../../../../lib/local-api";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const response = await getLocalApi().api.getVerification((await context.params).id);
  return NextResponse.json(response.body, { status: response.status });
}
