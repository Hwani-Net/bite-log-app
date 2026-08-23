import { NextRequest, NextResponse } from "next/server";
import {
  fetchBoatAvailability,
  type BoatOperatorId,
} from "@/services/boatAvailabilityService";

export const revalidate = 1800; // 30 min — polite read frequency on the source site

const VALID_OPERATORS: BoatOperatorId[] = ["teambite", "masterfishing"];

export async function GET(request: NextRequest) {
  const operator = request.nextUrl.searchParams.get("operator");
  if (!operator || !VALID_OPERATORS.includes(operator as BoatOperatorId)) {
    return NextResponse.json(
      { ok: false, error: "invalid_operator" },
      { status: 400 },
    );
  }

  try {
    const days = await fetchBoatAvailability(operator as BoatOperatorId);
    return NextResponse.json({ ok: true, days });
  } catch (err) {
    console.error("[boat-availability]", err);
    return NextResponse.json({ ok: false, error: "fetch_failed" }, { status: 503 });
  }
}
