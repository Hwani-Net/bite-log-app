import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Server-side Gemini API proxy.
 * Keeps GEMINI_API_KEY out of the client bundle.
 *
 * POST body: { model?: string; contents: unknown[]; systemInstruction?: unknown; generationConfig?: unknown }
 */
export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "API key not configured" },
      { status: 503 },
    );
  }

  let body: {
    model?: string;
    contents: unknown[];
    systemInstruction?: unknown;
    generationConfig?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const model = body.model ?? "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Forward only the recognised fields to Gemini
  const payload = {
    contents: body.contents,
    ...(body.systemInstruction
      ? { systemInstruction: body.systemInstruction }
      : {}),
    ...(body.generationConfig
      ? { generationConfig: body.generationConfig }
      : {}),
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.ok ? 200 : res.status });
  } catch (err) {
    console.error("[Gemini proxy] fetch failed:", err);
    return NextResponse.json(
      { error: "Upstream request failed" },
      { status: 502 },
    );
  }
}
