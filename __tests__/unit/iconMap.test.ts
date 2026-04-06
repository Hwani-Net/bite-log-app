import { describe, it, expect } from "vitest";
import { getLucideIcon } from "@/lib/iconMap";
import { Home, Fish, MapPin, Info, Settings, Bell } from "lucide-react";

describe("getLucideIcon", () => {
  it("maps home to Home icon", () => {
    expect(getLucideIcon("home")).toBe(Home);
  });

  it("maps set_meal to Fish icon", () => {
    expect(getLucideIcon("set_meal")).toBe(Fish);
  });

  it("maps location_on to MapPin icon", () => {
    expect(getLucideIcon("location_on")).toBe(MapPin);
  });

  it("maps settings to Settings icon", () => {
    expect(getLucideIcon("settings")).toBe(Settings);
  });

  it("maps notifications to Bell icon", () => {
    expect(getLucideIcon("notifications")).toBe(Bell);
  });

  it("falls back to Info for unknown icon names", () => {
    expect(getLucideIcon("nonexistent_icon_xyz")).toBe(Info);
  });

  it("falls back to Info for empty string", () => {
    expect(getLucideIcon("")).toBe(Info);
  });
});
