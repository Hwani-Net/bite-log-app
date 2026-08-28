"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/store/appStore";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { DynamicIcon } from "@/lib/iconMap";
import {
  Anchor,
  Flame,
  Scale,
  Fish,
  Newspaper,
  Trophy,
  Trash2,
  Heart,
  Download,
} from "lucide-react";
import {
  getNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferences,
} from "@/services/pushNotificationService";
import { getDataService } from "@/services/dataServiceFactory";
import { clearPendingRecords } from "@/services/offlineQueue";

// "조과 기록 초기화"가 지우는 로컬 키 — 확인 다이얼로그에 그대로 열거해
// 무엇이 지워지는지 사용자가 알게 한다(예전 구현은 fishlog_catches 하나만
// 지워서 로그인 사용자에겐 사실상 아무 일도 안 했다).
const RESET_LOCAL_KEYS: { key: string; labelKo: string }[] = [
  { key: "fishlog_catches", labelKo: "조과 기록(로컬)" },
  { key: "bitelog_alert_subscriptions", labelKo: "알림 구독" },
  { key: "fishlog_likes", labelKo: "피드 좋아요 표시" },
  { key: "biteLog_tripAlert", labelKo: "출조 브리핑 예약" },
  { key: "biteLog_briefingNotified", labelKo: "브리핑 알림 이력" },
  { key: "biteLog_cancelAlertNotified", labelKo: "출항 취소 경보 이력" },
  { key: "biteLog_seasonOpenNotified", labelKo: "금어기 해제 알림 이력" },
];

export default function SettingsPage() {
  const { t, theme, setTheme, locale, setLocale } = useAppStore();
  const { user, isLoggedIn, signInWithGoogle, signOut, loading } = useAuth();

  // 실제로 읽히고 강제되는 저장소(fishlog_notification_prefs)와 연결 —
  // 예전 토글은 아무도 읽지 않는 biteLog_notif_* 키에 써서 전부
  // 무동작이었다(4차 GOAL-3). SSR에선 null(비활성 렌더), 클라이언트
  // 첫 렌더에서 저장값 — 서버/클라이언트 속성 차이는 해당 입력에
  // suppressHydrationWarning으로 한정 흡수한다.
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(() =>
    typeof window === "undefined" ? null : getNotificationPreferences(),
  );
  const updatePref = (patch: Partial<NotificationPreferences>) => {
    saveNotificationPreferences(patch);
    setPrefs((p) => (p ? { ...p, ...patch } : p));
  };

  const [resetting, setResetting] = useState(false);

  async function handleReset() {
    const listing = RESET_LOCAL_KEYS.map((k) => `· ${k.labelKo}`).join("\n");
    const target = isLoggedIn
      ? locale === "ko"
        ? "계정에 저장된 조과 기록 전체와 아래 로컬 데이터"
        : "all catch records in your account and the local data below"
      : locale === "ko"
        ? "이 기기의 아래 데이터"
        : "the local data below";
    if (
      !window.confirm(
        locale === "ko"
          ? `${target}를 삭제합니다:\n${listing}\n\n되돌릴 수 없습니다. 계속할까요?`
          : `This deletes ${target}:\n${listing}\n\nThis cannot be undone. Continue?`,
      )
    )
      return;
    setResetting(true);
    try {
      // 로그인 상태면 Firestore의 기록도 실제로 지운다 — 예전엔 로컬 키
      // 하나만 지워 "초기화했는데 그대로"인 거짓 버튼이었다.
      const service = getDataService();
      const records = await service.getCatchRecords();
      for (const r of records) {
        await service.deleteCatchRecord(r.id);
      }
      for (const k of RESET_LOCAL_KEYS) {
        localStorage.removeItem(k.key);
      }
      await clearPendingRecords().catch(() => {});
      window.location.reload();
    } catch (err) {
      console.error("Reset failed:", err);
      setResetting(false);
    }
  }

  async function handleExportAll() {
    const records = await getDataService()
      .getCatchRecords()
      .catch(() => []);
    const readJson = (key: string) => {
      try {
        return JSON.parse(localStorage.getItem(key) ?? "null");
      } catch {
        return null;
      }
    };
    const payload = {
      exportedAt: new Date().toISOString(),
      app: "BiteLog",
      records,
      alertSubscriptions: readJson("bitelog_alert_subscriptions"),
      myBoats: readJson("biteLog_myBoats"),
      boatWatchlist: readJson("biteLog_boatWatchlist"),
      tripAlert: readJson("biteLog_tripAlert"),
      notificationPreferences: getNotificationPreferences(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bitelog-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const themes = [
    {
      value: "light" as const,
      icon: "light_mode",
      label: t("theme.light"),
      desc: locale === "ko" ? "밝은 화면" : "Bright",
    },
    {
      value: "dark" as const,
      icon: "dark_mode",
      label: t("theme.dark"),
      desc: locale === "ko" ? "어두운 화면" : "Dark",
    },
    {
      value: "system" as const,
      icon: "devices",
      label: t("theme.system"),
      desc: locale === "ko" ? "기기 설정" : "Device",
    },
  ];

  const languages = [
    { value: "ko" as const, label: "한국어", flag: "KR" },
    { value: "en" as const, label: "English", flag: "US" },
  ];

  return (
    <div className="page-enter relative z-10 px-4 pt-6 pb-24 min-h-screen bg-[#080d14]">
      <header className="mb-6">
        <h1
          className="text-2xl font-bold text-white flex items-center gap-2"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          <DynamicIcon name="settings" size={20} className="text-[#c9a84c]" />
          {t("nav.settings")}
        </h1>
        <p className="text-sm text-white/50 mt-1">
          {locale === "ko"
            ? "앱 환경을 설정하세요"
            : "Customize your experience"}
        </p>
      </header>

      {/* Profile / Auth */}
      <section className="mb-6">
        <div className="bg-white/5 backdrop-blur-[12px] border border-white/10 rounded-2xl p-5">
          {isLoggedIn && user ? (
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-tr from-[#c9a84c] to-[#7dd3fc] flex items-center justify-center shadow-lg">
                {user.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.photoURL}
                    alt="profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-bold text-white">
                    {user.displayName?.charAt(0) ?? "?"}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white truncate">
                  {user.displayName || (locale === "ko" ? "낚시인" : "Angler")}
                </h3>
                <p className="text-xs text-white/50 mt-0.5 truncate">
                  {user.email}
                </p>
              </div>
              <button
                onClick={signOut}
                className="px-3 py-1.5 rounded-full bg-red-500/20 text-red-400 text-xs font-medium transition-colors hover:bg-red-500/30"
              >
                {locale === "ko" ? "로그아웃" : "Logout"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-2">
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#c9a84c] to-[#7dd3fc] flex items-center justify-center shadow-lg">
                <span className="text-xs font-bold text-white">?</span>
              </div>
              <div className="text-center">
                <h3 className="font-bold text-white">
                  {locale === "ko"
                    ? "로그인하고 기록을 동기화하세요"
                    : "Sign in to sync your data"}
                </h3>
                <p className="text-xs text-white/50 mt-1">
                  {locale === "ko"
                    ? "다른 기기에서도 낚시 기록을 확인할 수 있어요"
                    : "Access your fishing records across devices"}
                </p>
              </div>
              <button
                onClick={signInWithGoogle}
                disabled={loading}
                className="flex items-center gap-3 px-6 py-3 rounded-xl bg-white/10 border border-white/20 hover:bg-white/15 transition-all active:scale-95 disabled:opacity-50"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="w-5 h-5">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="text-sm font-semibold text-white">
                  {loading
                    ? locale === "ko"
                      ? "로그인 중..."
                      : "Signing in..."
                    : locale === "ko"
                      ? "Google로 로그인"
                      : "Sign in with Google"}
                </span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Theme */}
      <section className="mb-5">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-[0.2em] mb-3 flex items-center gap-1">
          <DynamicIcon name="palette" size={14} />
          {locale === "ko" ? "테마" : "Theme"}
        </h2>
        <div className="bg-white/5 backdrop-blur-[12px] border border-white/10 rounded-2xl p-4">
          <div className="grid grid-cols-3 gap-2">
            {themes.map(({ value, icon, label, desc }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 ${
                  theme === value
                    ? "border-[#c9a84c] bg-[#c9a84c]/10 shadow-md scale-[1.02]"
                    : "border-white/5 hover:bg-white/5"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    theme === value
                      ? "bg-gradient-to-tr from-[#c9a84c] to-[#7dd3fc] text-[#080d14] shadow-sm"
                      : "bg-white/10 text-white/60"
                  }`}
                >
                  <DynamicIcon name={icon} size={20} />
                </div>
                <span
                  className={`text-xs font-semibold ${theme === value ? "text-[#c9a84c]" : "text-white/60"}`}
                >
                  {label}
                </span>
                <span className="text-[10px] text-white/30">{desc}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Language */}
      <section className="mb-5">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-[0.2em] mb-3 flex items-center gap-1">
          <DynamicIcon name="language" size={14} />
          {locale === "ko" ? "언어" : "Language"}
        </h2>
        <div className="bg-white/5 backdrop-blur-[12px] border border-white/10 rounded-2xl p-4">
          <div className="grid grid-cols-2 gap-2">
            {languages.map(({ value, label, flag }) => (
              <button
                key={value}
                onClick={() => setLocale(value)}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 ${
                  locale === value
                    ? "border-[#c9a84c] bg-[#c9a84c]/10 shadow-md"
                    : "border-white/5 hover:bg-white/5"
                }`}
              >
                <span className="text-sm font-bold">{flag}</span>
                <span
                  className={`text-sm font-semibold ${locale === value ? "text-[#c9a84c]" : "text-white/60"}`}
                >
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-[0.2em] mb-3 flex items-center gap-1">
          <DynamicIcon name="notifications" size={14} />
          {locale === "ko" ? "알림 설정" : "Notifications"}
        </h2>
        <div className="bg-white/5 backdrop-blur-[12px] border border-white/10 rounded-2xl p-4 space-y-3">
          {(
            [
              {
                Icon: Fish,
                label:
                  locale === "ko" ? "입질 최적 시간 알림" : "Bite Time Alert",
                key: "biteTimeAlert",
              },
              {
                Icon: Newspaper,
                label: locale === "ko" ? "조과 뉴스 알림" : "News Alert",
                key: "newsAlert",
              },
              {
                Icon: Trophy,
                label: locale === "ko" ? "배지 획득 알림" : "Badge Alert",
                key: "badgeAlert",
              },
              {
                Icon: Anchor,
                label:
                  locale === "ko"
                    ? "금어기 해제 임박 알림"
                    : "Season Opening Alert",
                key: "seasonOpenAlert",
              },
            ] as const
          ).map((item, i) => (
            <div key={item.key}>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-white/80 flex items-center gap-2">
                  <item.Icon size={15} className="text-white/50" /> {item.label}
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <span className="sr-only">{item.label}</span>
                  <input
                    type="checkbox"
                    checked={prefs?.[item.key] ?? true}
                    disabled={!prefs}
                    suppressHydrationWarning
                    onChange={(e) => updatePref({ [item.key]: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#c9a84c]" />
                </label>
              </div>
              {i < 3 && <div className="h-[1px] bg-white/5" />}
            </div>
          ))}

          {/* 방해 금지 시간 — 저장 계층엔 이미 구현·강제되고 있었는데 UI만
              없었다. sendLocalNotification이 이 구간의 알림을 전부 막는다. */}
          <div className="h-[1px] bg-white/5" />
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-white/80 flex items-center gap-2">
              <DynamicIcon name="dark_mode" size={15} />
              {locale === "ko" ? "방해 금지 시간" : "Quiet Hours"}
            </span>
            <span className="flex items-center gap-1 text-sm text-white/70">
              <select
                aria-label={locale === "ko" ? "방해 금지 시작" : "Quiet start"}
                value={prefs?.quietHoursStart ?? 23}
                disabled={!prefs}
                suppressHydrationWarning
                onChange={(e) =>
                  updatePref({ quietHoursStart: Number(e.target.value) })
                }
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs"
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {h}시
                  </option>
                ))}
              </select>
              ~
              <select
                aria-label={locale === "ko" ? "방해 금지 종료" : "Quiet end"}
                value={prefs?.quietHoursEnd ?? 6}
                disabled={!prefs}
                suppressHydrationWarning
                onChange={(e) =>
                  updatePref({ quietHoursEnd: Number(e.target.value) })
                }
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs"
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {h}시
                  </option>
                ))}
              </select>
            </span>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-[0.2em] mb-3 flex items-center gap-1">
          <DynamicIcon name="link" size={14} />
          {locale === "ko" ? "바로가기" : "Quick Links"}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/booking"
            className="bg-white/5 backdrop-blur-[12px] border border-white/10 rounded-2xl p-4 flex flex-col items-center gap-2 hover:border-[#c9a84c]/30 transition-colors"
          >
            <Anchor size={22} className="text-white/60" />
            <span className="text-xs font-medium text-white/80">
              {locale === "ko" ? "낚시 예약" : "Booking"}
            </span>
          </Link>
          <Link
            href="/news"
            className="bg-white/5 backdrop-blur-[12px] border border-white/10 rounded-2xl p-4 flex flex-col items-center gap-2 hover:border-[#c9a84c]/30 transition-colors"
          >
            <Flame size={22} className="text-white/60" />
            <span className="text-xs font-medium text-white/80">
              {locale === "ko" ? "조과 소식" : "News"}
            </span>
          </Link>
          <Link
            href="/regulations"
            className="bg-white/5 backdrop-blur-[12px] border border-white/10 rounded-2xl p-4 flex flex-col items-center gap-2 hover:border-[#c9a84c]/30 transition-colors"
          >
            <Scale size={22} className="text-white/60" />
            <span className="text-xs font-medium text-white/80">
              {locale === "ko" ? "금어기·법규" : "Regulations"}
            </span>
          </Link>
        </div>
      </section>

      {/* About */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-[0.2em] mb-3 flex items-center gap-1">
          <DynamicIcon name="info" size={14} />
          {locale === "ko" ? "정보" : "About"}
        </h2>
        <div className="bg-white/5 backdrop-blur-[12px] border border-white/10 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-white/50">
              {locale === "ko" ? "버전" : "Version"}
            </span>
            <span className="text-sm font-medium text-white">1.1.0</span>
          </div>
          <div className="h-[1px] bg-white/5" />
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-white/50">
              {locale === "ko" ? "개발자" : "Developer"}
            </span>
            <span className="text-sm font-medium text-white flex items-center gap-1">
              <Heart size={14} className="text-red-400" />
              BITE Log Team
            </span>
          </div>
          <div className="h-[1px] bg-white/5" />
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-white/50">
              {locale === "ko" ? "데이터" : "Data"}
            </span>
            <span className="text-sm font-medium text-white flex items-center gap-1">
              <DynamicIcon
                name={isLoggedIn ? "cloud" : "info"}
                size={14}
                className="text-[#c9a84c]"
              />
              {isLoggedIn
                ? locale === "ko"
                  ? "Firebase 동기화"
                  : "Firebase Synced"
                : locale === "ko"
                  ? "로컬 저장"
                  : "Local Storage"}
            </span>
          </div>
          <div className="h-[1px] bg-white/5" />
          <Link
            href="/terms"
            className="flex items-center justify-between py-2 group"
          >
            <span className="text-sm text-white/50 group-hover:text-[#c9a84c] transition-colors">
              {locale === "ko" ? "이용약관" : "Terms of Service"}
            </span>
            <DynamicIcon
              name="chevron_right"
              size={14}
              className="text-white/20"
            />
          </Link>
          <div className="h-[1px] bg-white/5" />
          <Link
            href="/privacy"
            className="flex items-center justify-between py-2 group"
          >
            <span className="text-sm text-white/50 group-hover:text-[#c9a84c] transition-colors">
              {locale === "ko" ? "개인정보처리방침" : "Privacy Policy"}
            </span>
            <DynamicIcon
              name="chevron_right"
              size={14}
              className="text-white/20"
            />
          </Link>
        </div>
      </section>

      {/* Data Management */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-[0.2em] mb-3 flex items-center gap-1">
          <DynamicIcon name="info" size={14} />
          {locale === "ko" ? "데이터 관리" : "Data Management"}
        </h2>
        <div className="bg-white/5 backdrop-blur-[12px] border border-white/10 rounded-2xl p-4 space-y-3">
          {/* 내 데이터 전부 내려받기 — "사용자의 데이터를 대변"의 가장
              직접적인 형태. */}
          <div className="flex items-center justify-between py-2">
            <div>
              <span className="text-sm text-white/80 flex items-center gap-2">
                <Download size={15} className="text-white/50" />{" "}
                {locale === "ko" ? "내 데이터 전부 내려받기" : "Export All Data"}
              </span>
              <p className="text-[11px] text-white/60 mt-0.5 ml-7">
                {locale === "ko"
                  ? "기록·내 선사 카드·알림 구독을 JSON 한 파일로"
                  : "Records, boats, and alert subscriptions as one JSON"}
              </p>
            </div>
            <button
              onClick={handleExportAll}
              data-testid="export-all"
              className="px-3 py-1.5 rounded-full bg-[#c9a84c]/20 text-[#c9a84c] text-xs font-medium transition-colors hover:bg-[#c9a84c]/30 whitespace-nowrap"
            >
              {locale === "ko" ? "내려받기" : "Download"}
            </button>
          </div>
          <div className="h-[1px] bg-white/5" />
          <div className="flex items-center justify-between py-2">
            <div>
              <span className="text-sm text-white/80 flex items-center gap-2">
                <Trash2 size={15} className="text-white/50" />{" "}
                {locale === "ko" ? "조과 기록 초기화" : "Reset Catch Records"}
              </span>
              <p className="text-[11px] text-white/60 mt-0.5 ml-7">
                {locale === "ko"
                  ? isLoggedIn
                    ? "계정의 기록과 이 기기의 관련 데이터를 삭제합니다"
                    : "이 기기에 저장된 기록과 관련 데이터를 삭제합니다"
                  : "Delete records and related data"}
              </p>
            </div>
            <button
              onClick={handleReset}
              disabled={resetting}
              data-testid="reset-data"
              className="px-3 py-1.5 rounded-full bg-red-500/20 text-red-400 text-xs font-medium transition-colors hover:bg-red-500/30 whitespace-nowrap disabled:opacity-50"
            >
              {resetting
                ? locale === "ko"
                  ? "삭제 중..."
                  : "Deleting..."
                : locale === "ko"
                  ? "초기화"
                  : "Reset"}
            </button>
          </div>
        </div>
      </section>

      <div className="text-center text-xs text-white/30 mt-6">
        <p>{locale === "ko" ? "나만의 낚시 일지" : "Your Fishing Diary"}</p>
      </div>
    </div>
  );
}
