"use client";

// Client component for record detail using query params for static export

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppStore } from "@/store/appStore";
import { getDataService } from "@/services/dataServiceFactory";
import { shareCatchRecord } from "@/services/shareService";
import { toggleVisibility } from "@/services/feedService";
import { CatchRecord, FISH_SPECIES } from "@/types";
import {
  ArrowLeft,
  X,
  ChevronRight,
  MapPin,
  Calendar,
  Clock,
  Fish,
  Ruler,
  Thermometer,
  Wind,
  Droplets,
  Eye,
  EyeOff,
  Share2,
  Trash2,
  Edit3,
  Save,
  Loader2,
  Camera,
  CheckCircle,
  Cloud,
} from "lucide-react";
import { DynamicIcon } from "@/lib/iconMap";

function RecordDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const router = useRouter();
  const { t, locale } = useAppStore();
  const [record, setRecord] = useState<CatchRecord | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);

  // Edit form state
  const [date, setDate] = useState("");
  const [locationName, setLocationName] = useState("");
  const [species, setSpecies] = useState("");
  const [count, setCount] = useState(1);
  const [sizeCm, setSizeCm] = useState("");
  const [memo, setMemo] = useState("");

  useEffect(() => {
    if (!id) return;
    getDataService()
      .getCatchRecord(id)
      .then((r) => {
        if (r) {
          setRecord(r);
          setDate(r.date);
          setLocationName(r.location.name);
          setSpecies(r.species);
          setCount(r.count);
          setSizeCm(r.sizeCm?.toString() || "");
          setMemo(r.memo || "");
        }
      });
  }, [id]);

  async function handleSave() {
    if (!record) return;
    setSaving(true);
    try {
      const updated = await getDataService().updateCatchRecord(record.id, {
        date,
        location: { name: locationName.trim() },
        species,
        count,
        sizeCm: sizeCm ? Number(sizeCm) : undefined,
        memo: memo.trim() || undefined,
      });
      setRecord(updated);
      setEditing(false);
    } catch (err) {
      console.error("Update failed:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!record) return;
    if (
      !confirm(
        locale === "ko" ? "이 기록을 삭제할까요?" : "Delete this record?",
      )
    )
      return;
    await getDataService().deleteCatchRecord(record.id);
    router.push("/records");
  }

  async function handleToggleVisibility() {
    if (!record) return;
    const newVis =
      (record.visibility || "private") === "private" ? "public" : "private";
    const updated = await toggleVisibility(
      record.id,
      newVis as "public" | "private",
    );
    setRecord(updated);
  }

  const inputCls =
    "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-[#c9a84c]/50 focus:ring-1 focus:ring-[#c9a84c]/30 transition-all text-white placeholder:text-white/30";

  if (!record) {
    return (
      <div className="page-enter relative z-10 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Fish size={48} className="text-white/20 animate-pulse" />
          <p className="text-white/60 mt-2">
            {locale === "ko" ? "불러오는 중..." : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter relative z-10 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center bg-[#080d14]/60 backdrop-blur-xl px-4 py-4 justify-between border-b border-white/5">
        <button
          onClick={() => router.back()}
          className="text-white/70 flex size-10 shrink-0 items-center justify-center hover:bg-white/10 rounded-full transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-lg font-bold text-white flex-1 text-center uppercase tracking-[0.1em]">
          {editing
            ? t("record.editTitle")
            : locale === "ko"
              ? "조과 상세"
              : "Catch Detail"}
        </h2>
        <div className="flex items-center gap-1">
          {editing ? (
            <button
              onClick={() => setEditing(false)}
              className="text-white/50 text-sm font-medium px-2"
            >
              {t("common.cancel")}
            </button>
          ) : (
            <>
              <button
                onClick={() => setEditing(true)}
                className="text-[#c9a84c] size-10 flex items-center justify-center rounded-full hover:bg-[#c9a84c]/10 transition-colors"
              >
                <Edit3 size={20} />
              </button>
              <button
                onClick={async () => {
                  if (!record) return;
                  const result = await shareCatchRecord(record, locale);
                  if (result.success) {
                    setShareToast(
                      result.method === "clipboard"
                        ? locale === "ko"
                          ? "클립보드에 복사됨!"
                          : "Copied to clipboard!"
                        : locale === "ko"
                          ? "공유 완료!"
                          : "Shared!",
                    );
                    setTimeout(() => setShareToast(null), 2000);
                  }
                }}
                className="text-[#c9a84c] size-10 flex items-center justify-center rounded-full hover:bg-[#c9a84c]/10 transition-colors"
              >
                <Share2 size={20} />
              </button>
              <button
                onClick={handleDelete}
                className="text-red-400 size-10 flex items-center justify-center rounded-full hover:bg-red-500/10 transition-colors"
              >
                <Trash2 size={20} />
              </button>
              <button
                onClick={handleToggleVisibility}
                className={`size-10 flex items-center justify-center rounded-full transition-colors ${
                  (record.visibility || "private") === "public"
                    ? "text-emerald-400 hover:bg-emerald-500/10"
                    : "text-white/30 hover:bg-white/10"
                }`}
                title={
                  (record.visibility || "private") === "public"
                    ? locale === "ko"
                      ? "공개 중"
                      : "Public"
                    : locale === "ko"
                      ? "비공개"
                      : "Private"
                }
              >
                {(record.visibility || "private") === "public" ? (
                  <Eye size={20} />
                ) : (
                  <EyeOff size={20} />
                )}
              </button>
            </>
          )}
        </div>
      </header>

      {/* Photo hero */}
      {record.photos.length > 0 && (
        <div className="w-full aspect-video bg-white/5 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={record.photos[0]}
            alt={record.species}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {editing ? (
        /* ===== EDIT MODE ===== */
        <div className="px-4 pt-4 space-y-4">
          <div className="glass-morphism border border-white/5 rounded-2xl p-4">
            <label className="flex flex-col gap-2">
              <span className="text-white/70 text-sm font-semibold flex items-center gap-2">
                <Calendar size={16} className="text-[#c9a84c]" />
                {t("record.date")}
              </span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputCls}
              />
            </label>
          </div>

          <div className="glass-morphism border border-white/5 rounded-2xl p-4">
            <label className="flex flex-col gap-2">
              <span className="text-white/70 text-sm font-semibold flex items-center gap-2">
                <MapPin size={16} className="text-[#c9a84c]" />
                {t("record.location")}
              </span>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                className={inputCls}
              />
            </label>
          </div>

          <div className="glass-morphism border border-white/5 rounded-2xl p-4">
            <label className="flex flex-col gap-2">
              <span className="text-white/70 text-sm font-semibold flex items-center gap-2">
                <Fish size={16} className="text-[#c9a84c]" />
                {t("record.species")}
              </span>
              <select
                value={species}
                onChange={(e) => setSpecies(e.target.value)}
                className={`${inputCls} appearance-none`}
              >
                {FISH_SPECIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="glass-morphism border border-white/5 rounded-2xl p-4">
              <label className="flex flex-col gap-2">
                <span className="text-white/70 text-sm font-semibold">
                  {t("record.count")}
                </span>
                <div className="flex items-center justify-between bg-white/5 rounded-xl p-1 border border-white/10">
                  <button
                    type="button"
                    onClick={() => setCount((c) => Math.max(1, c - 1))}
                    className="size-9 flex items-center justify-center bg-white/10 rounded-lg text-white/60"
                  >
                    <DynamicIcon name="remove" size={18} />
                  </button>
                  <span className="text-lg font-bold text-white">{count}</span>
                  <button
                    type="button"
                    onClick={() => setCount((c) => c + 1)}
                    className="size-9 flex items-center justify-center bg-[#c9a84c] rounded-lg text-[#080d14]"
                  >
                    <DynamicIcon name="add" size={18} />
                  </button>
                </div>
              </label>
            </div>
            <div className="glass-morphism border border-white/5 rounded-2xl p-4">
              <label className="flex flex-col gap-2">
                <span className="text-white/70 text-sm font-semibold">
                  {t("record.size")}
                </span>
                <input
                  type="number"
                  value={sizeCm}
                  onChange={(e) => setSizeCm(e.target.value)}
                  placeholder="0.0"
                  className={`${inputCls} text-center font-bold`}
                />
              </label>
            </div>
          </div>

          <div className="glass-morphism border border-white/5 rounded-2xl p-4">
            <label className="flex flex-col gap-2">
              <span className="text-white/70 text-sm font-semibold flex items-center gap-2">
                <Edit3 size={16} className="text-[#c9a84c]" />
                {t("record.memo")}
              </span>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                rows={3}
                className={`${inputCls} resize-none`}
              />
            </label>
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-14 rounded-2xl bg-[#c9a84c] text-[#080d14] font-bold text-lg shadow-xl shadow-[#c9a84c]/20 flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
          >
            {saving ? "..." : t("record.submit")}
          </button>
        </div>
      ) : (
        /* ===== VIEW MODE ===== */
        <div className="px-4 pt-6 space-y-4">
          {/* Species + Count */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#c9a84c]/40 to-[#7dd3fc]/30 flex items-center justify-center shrink-0">
              <Fish size={20} className="text-[#c9a84c]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{record.species}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[#c9a84c]/20 text-[#c9a84c]">
                  {record.count}
                  {locale === "ko" ? "마리" : " fish"}
                </span>
                {record.sizeCm && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[#7dd3fc]/10 text-[#7dd3fc]">
                    {record.sizeCm}cm
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Info cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-morphism border border-white/5 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-white/60 text-xs mb-1">
                <Calendar size={14} className="text-[#c9a84c]" />
                {t("record.date")}
              </div>
              <p className="text-sm font-semibold text-white">{record.date}</p>
            </div>
            <div className="glass-morphism border border-white/5 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-white/60 text-xs mb-1">
                <MapPin size={14} className="text-[#c9a84c]" />
                {t("record.location")}
              </div>
              <p className="text-sm font-semibold text-white truncate">
                {record.location.name}
              </p>
              {record.location.lat && record.location.lng && (
                <p className="text-[10px] text-white/30 mt-0.5">
                  {record.location.lat.toFixed(4)},{" "}
                  {record.location.lng.toFixed(4)}
                </p>
              )}
            </div>
          </div>

          {/* Weather info */}
          {record.weather && (
            <div className="glass-morphism border border-white/5 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-white/60 text-xs mb-3">
                <Cloud size={14} className="text-[#7dd3fc]" />
                {t("record.weather")}
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-[#c9a84c]/10">
                  <Cloud size={18} className="text-[#c9a84c]" />
                  <span className="text-[10px] font-semibold text-white/50 text-center">
                    {record.weather.condition}
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-orange-500/10">
                  <Thermometer size={18} className="text-orange-400" />
                  <span className="text-xs font-bold text-white">
                    {record.weather.tempC}°C
                  </span>
                </div>
                {record.weather.windSpeed !== undefined && (
                  <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-[#7dd3fc]/10">
                    <Wind size={18} className="text-[#7dd3fc]" />
                    <span className="text-xs font-bold text-white">
                      {record.weather.windSpeed}m/s
                    </span>
                  </div>
                )}
                {record.weather.humidity !== undefined && (
                  <div className="flex flex-col items-center gap-1 p-2 rounded-xl bg-[#7dd3fc]/10">
                    <Droplets size={18} className="text-[#7dd3fc]" />
                    <span className="text-xs font-bold text-white">
                      {record.weather.humidity}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tide info */}
          {record.tide && (
            <div className="glass-morphism border border-[#7dd3fc]/10 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-white/60 text-xs mb-3">
                <DynamicIcon
                  name="waves"
                  size={14}
                  className="text-[#7dd3fc]"
                />
                {locale === "ko" ? "물때 정보" : "Tide"}
                <span className="text-[10px] text-white/30 ml-auto">
                  {record.tide.stationName} 관측소
                </span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {record.tide.tides.map((t, i) => (
                  <span
                    key={i}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl flex-1 min-w-[60px] ${t.type === "High" ? "bg-[#7dd3fc]/10 text-[#7dd3fc]" : "bg-[#c9a84c]/10 text-[#c9a84c]"}`}
                  >
                    <span className="font-bold mb-0.5">
                      {t.type === "High"
                        ? locale === "ko"
                          ? "▲ 고조"
                          : "▲ High"
                        : locale === "ko"
                          ? "▼ 저조"
                          : "▼ Low"}
                    </span>
                    <span className="text-white/50 font-medium">{t.time}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Memo */}
          {record.memo && (
            <div className="glass-morphism border border-white/5 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-white/60 text-xs mb-2">
                <Edit3 size={14} className="text-[#c9a84c]" />
                {t("record.memo")}
              </div>
              <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
                {record.memo}
              </p>
            </div>
          )}

          {/* All photos */}
          {record.photos.length > 1 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-white/60 flex items-center gap-1 uppercase tracking-[0.15em]">
                <Camera size={14} />
                {locale === "ko" ? "사진" : "Photos"} ({record.photos.length})
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {record.photos.map((p, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-xl overflow-hidden bg-white/5"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p}
                      alt={`Photo ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="text-[10px] text-white/20 text-center pt-4">
            {locale === "ko" ? "작성" : "Created"}:{" "}
            {new Date(record.createdAt).toLocaleString()}
            {record.updatedAt !== record.createdAt && (
              <>
                {" "}
                · {locale === "ko" ? "수정" : "Updated"}:{" "}
                {new Date(record.updatedAt).toLocaleString()}
              </>
            )}
          </div>
        </div>
      )}

      {/* Share toast */}
      {shareToast && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-[#0f141b] border border-[#c9a84c]/30 text-white text-sm font-semibold rounded-full shadow-xl animate-pulse">
          <CheckCircle
            size={14}
            className="inline align-middle mr-1 text-[#c9a84c]"
          />
          {shareToast}
        </div>
      )}
    </div>
  );
}

export default function RecordDetailPage() {
  return (
    <Suspense
      fallback={<div className="p-8 text-center text-white/60">Loading...</div>}
    >
      <RecordDetailContent />
    </Suspense>
  );
}
