import { NextResponse } from "next/server";
import { getLocalApi } from "../../../../lib/local-api";

export async function POST(request: Request) {
  try {
    const response = await getLocalApi().api.submitDataset(await request.json());
    if (response.status === 202) await getLocalApi().api.processVerifications();
    return NextResponse.json(response.body, { status: response.status });
  } catch {
    return NextResponse.json({ error: { code: "INVALID_JSON", message: "Request body must be valid JSON" } }, { status: 400 });
  }
}
