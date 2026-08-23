export type SeaRegion = "서해" | "남해" | "동해" | "제주";

// Coarse lat/lng → Korean sea-region bucketing shared by bite-forecast's
// official index filter and the booking page's platform sort.
export function getRegionForCoords(
  lat?: number,
  lon?: number,
): SeaRegion | "기타" {
  if (lat == null || lon == null) return "기타";
  if (lat < 33.9) return "제주";
  if (lon < 127.2) return "서해";
  if (lon > 128.8) return "동해";
  return "남해";
}
