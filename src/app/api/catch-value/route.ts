import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.CATCH_VALUE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "no_key" }, { status: 503 });
  }
  return NextResponse.json(
    { ok: false, error: "not_implemented" },
    { status: 503 },
  );
}
