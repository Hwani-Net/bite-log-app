import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/tide/route";
import { fetchStationTides, findNearestStation, parseTideResponse, tideRangeCm } from "@/services/tideService";
import { fishingTideForDate } from "@/lib/fishingTide";

vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));

const raw = () => ({ header: { resultCode: "00" }, body: { items: { item: [
  { obsvtrNm: "군산", predcDt: "2026-09-28 03:49", predcTdlvVl: 679, extrSe: "1" },
  { obsvtrNm: "군산", predcDt: "2026-09-28 10:32", predcTdlvVl: 48, extrSe: "2" },
  { obsvtrNm: "군산", predcDt: "2026-09-28 16:11", predcTdlvVl: 708, extrSe: "3" },
  { obsvtrNm: "군산", predcDt: "2026-09-28 22:56", predcTdlvVl: 65, extrSe: "4" },
] } } });

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("booking tides", () => {
  it("parses the official root body, string extreme codes and daily range", () => {
    const data = parseTideResponse(raw(), "20260928");
    expect(data?.tides.map(t => t.type)).toEqual(["High", "Low", "High", "Low"]);
    expect(tideRangeCm(data)).toBe(660);
    expect(tideRangeCm({ ...data!, mocked: true })).toBeNull();
    expect(findNearestStation(36.4396, 126.5194)).toMatchObject({ code: "DT_0025", name: "보령" });
    expect(findNearestStation(36.157, 126.5238)).toMatchObject({ code: "DT_0018", name: "군산" });
  });

  it("rejects another date, invalid/missing levels, mixed stations and incomplete high/low", () => {
    expect(parseTideResponse(raw(), "20260925")).toBeNull();
    for (const patch of [{ predcTdlvVl: null }, { predcTdlvVl: NaN }, { obsvtrNm: "보령" }, { extrSe: "9" }]) {
      const input = raw();
      Object.assign(input.body.items.item[1], patch);
      expect(parseTideResponse(input, "20260928")).toBeNull();
    }
    expect(tideRangeCm({ stationName: "군산", tides: [{ type: "High", time: "12:00", level: 500 }] })).toBeNull();
  });

  it("never supplies random samples or wrong-station data to booking", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(Response.json(raw())).mockResolvedValueOnce(Response.json(raw()));
    vi.stubGlobal("fetch", fetchMock);
    expect(await fetchStationTides("DT_0018", "20260928")).toBeNull();
    expect(await fetchStationTides("DT_0025", "20260928")).toBeNull();
    expect(tideRangeCm(await fetchStationTides("DT_0018", "20260928"))).toBe(660);
  });

  it("uses lunar numbering with the selected convention, including invalid dates", () => {
    expect(fishingTideForDate("2026-09-28", 7)).toMatchObject({ label: "9물", strengthLabel: "강함" });
    expect(fishingTideForDate("2026-09-28", 8)?.label).toBe("10물");
    expect(fishingTideForDate("2026-09-18", 7)?.label).toBe("조금");
    expect(fishingTideForDate("2026-09-19", 7)?.label).toBe("무시");
    expect(fishingTideForDate("2026-02-30")).toBeNull();
  });

  it("calls the verified gateway, validates inputs and exposes failure as non-200", async () => {
    vi.stubEnv("KHOA_API_KEY", "test-key%2B");
    const fetchMock = vi.fn().mockResolvedValueOnce(Response.json(raw()))
      .mockResolvedValueOnce(new Response("missing", { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);
    const call = (date: string) => GET(new NextRequest(`http://localhost/api/tide?obsCode=DT_0018&reqDate=${date}`));
    expect((await call("20260230")).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
    expect((await call("20260928")).status).toBe(200);
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe("https://apis.data.go.kr/1192136/tideFcstHghLw/GetTideFcstHghLwApiService");
    expect(url.searchParams.get("serviceKey")).toBe("test-key+");
    expect((await call("20260928")).status).toBe(503);
  });
});
