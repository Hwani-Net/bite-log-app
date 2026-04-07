"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAppStore } from "@/store/appStore";
import { getPublicFeed } from "@/services/feedService";
import { PublicFeedItem } from "@/types";
import { fetchTopNews, FishingNewsItem } from "@/services/fishingNewsService";
import { DynamicIcon } from "@/lib/iconMap";
import { FISH_SEASON_DB, getSeasonStatus } from "@/data/fishSeasonDB";

// ─── Types ────────────────────────────────────────────────────────────────────
interface RegionStat {
  region: string;
  count: number;
  topSpecies: string;
  emoji: string;
}

interface SpeciesStat {
  species: string;
  emoji: string;
  count: number;
  avgSize: number;
  topLocation: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const REGION_MAP: Record<string, string> = {
  제주: "제주",
  서귀포: "제주",
  부산: "남해",
  통영: "남해",
  거제: "남해",
  여수: "남해",
  목포: "남해",
  인천: "서해",
  당진: "서해",
  태안: "서해",
  보령: "서해",
  군산: "서해",
  속초: "동해",
  강릉: "동해",
  포항: "동해",
  울산: "동해",
  동해: "동해",
};

function getRegion(locationName: string): string {
  for (const [key, region] of Object.entries(REGION_MAP)) {
    if (locationName.includes(key)) return region;
  }
  return "기타";
}

const SPECIES_EMOJIS: Record<string, string> = {
  농어: "🐟",
  우럭: "🪨",
  참돔: "🎏",
  감성돔: "🐠",
  볼락: "🐡",
  광어: "🫓",
  고등어: "🐟",
  방어: "🐟",
  주꾸미: "🐙",
  전갱이: "🐟",
  숭어: "🐟",
  학꽁치: "🐟",
};

// ─── Region Card ──────────────────────────────────────────────────────────────
const REGION_ACCENT: Record<string, string> = {
  서해: "text-[#c9a84c]",
  남해: "text-[#7dd3fc]",
  동해: "text-blue-400",
  제주: "text-emerald-400",
  기타: "text-white/50",
};

function RegionCard({ stat }: { stat: RegionStat }) {
  const accent = REGION_ACCENT[stat.region] || REGION_ACCENT["기타"];

  return (
    <div className="bg-white/5 backdrop-blur-[12px] rounded-2xl p-3 border border-white/10">
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-sm font-bold ${accent}`}>{stat.region}</span>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <span className="text-2xl font-black text-white">{stat.count}</span>
          <span className="text-[10px] text-white/30 ml-1">마리</span>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-white/30">인기 어종</p>
          <p className="text-xs font-bold text-white/70">{stat.topSpecies}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Species Row ──────────────────────────────────────────────────────────────
function SpeciesRow({ stat, rank }: { stat: SpeciesStat; rank: number }) {
  const rankColors = ["text-[#c9a84c]", "text-white/40", "text-[#c9a84c]/60"];

  return (
    <div className="flex items-center gap-3 bg-white/5 backdrop-blur-[12px] rounded-xl px-3 py-2.5 border border-white/10">
      <span
        className={`text-lg font-black ${rankColors[rank - 1] || "text-white/30"} w-6 text-center`}
      >
        {rank}
      </span>
      <span className="text-xs font-bold text-white/40 w-6 text-center">
        {stat.species.slice(0, 2)}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white">{stat.species}</p>
        <p className="text-[10px] text-white/30 truncate">{stat.topLocation}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold text-white">{stat.count}마리</p>
        {stat.avgSize > 0 && (
          <p className="text-[10px] text-white/30">평균 {stat.avgSize}cm</p>
        )}
      </div>
    </div>
  );
}

// ─── Live News Ticker ─────────────────────────────────────────────────────────
function LiveNewsTicker({ news }: { news: FishingNewsItem[] }) {
  if (news.length === 0) return null;

  return (
    <div className="bg-white/5 backdrop-blur-[12px] rounded-2xl border border-white/10 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">
          LIVE
        </span>
        <span className="text-xs font-bold text-white">실시간 조과 소식</span>
      </div>
      <div className="divide-y divide-white/5">
        {news.slice(0, 5).map((item) => (
          <a
            key={item.id}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white/80 truncate">
                {item.title}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-white/30">
                  {item.sourceLabel}
                </span>
                {item.species && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#7dd3fc]/10 text-[#7dd3fc] font-bold">
                    {item.species}
                  </span>
                )}
              </div>
            </div>
            <DynamicIcon
              name="open_in_new"
              size={14}
              className="text-white/20"
            />
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function LiveDashboardPage() {
  const locale = useAppStore((s) => s.locale);
  const isKo = locale === "ko";
  const [feed, setFeed] = useState<PublicFeedItem[]>([]);
  const [news, setNews] = useState<FishingNewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  useEffect(() => {
    Promise.all([
      getPublicFeed()
        .then(setFeed)
        .catch(() => setFeed([])),
      fetchTopNews()
        .then(setNews)
        .catch(() => setNews([])),
    ]).finally(() => setLoading(false));
  }, []);

  // Calculate region stats
  const regionStats = useMemo((): RegionStat[] => {
    const regionMap = new Map<
      string,
      { count: number; speciesCount: Map<string, number> }
    >();

    feed.forEach((item) => {
      const region = getRegion(item.location.name);
      if (!regionMap.has(region)) {
        regionMap.set(region, { count: 0, speciesCount: new Map() });
      }
      const stat = regionMap.get(region)!;
      stat.count += item.count;
      stat.speciesCount.set(
        item.species,
        (stat.speciesCount.get(item.species) || 0) + item.count,
      );
    });

    return Array.from(regionMap.entries())
      .map(([region, data]) => {
        const topSpeciesEntry = [...data.speciesCount.entries()].sort(
          (a, b) => b[1] - a[1],
        )[0];
        return {
          region,
          count: data.count,
          topSpecies: topSpeciesEntry?.[0] || "-",
          emoji: SPECIES_EMOJIS[topSpeciesEntry?.[0]] || "🐟",
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [feed]);

  // Calculate species stats
  const speciesStats = useMemo((): SpeciesStat[] => {
    const speciesMap = new Map<
      string,
      { count: number; sizes: number[]; locations: Map<string, number> }
    >();

    feed.forEach((item) => {
      if (!speciesMap.has(item.species)) {
        speciesMap.set(item.species, {
          count: 0,
          sizes: [],
          locations: new Map(),
        });
      }
      const stat = speciesMap.get(item.species)!;
      stat.count += item.count;
      if (item.sizeCm) stat.sizes.push(item.sizeCm);
      stat.locations.set(
        item.location.name,
        (stat.locations.get(item.location.name) || 0) + 1,
      );
    });

    return Array.from(speciesMap.entries())
      .map(([species, data]) => {
        const topLocation = [...data.locations.entries()].sort(
          (a, b) => b[1] - a[1],
        )[0];
        return {
          species,
          emoji: SPECIES_EMOJIS[species] || "🐟",
          count: data.count,
          avgSize:
            data.sizes.length > 0
              ? Math.round(
                  data.sizes.reduce((a, b) => a + b, 0) / data.sizes.length,
                )
              : 0,
          topLocation: topLocation?.[0] || "-",
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [feed]);

  // Season fish that are in season right now
  const inSeasonFish = FISH_SEASON_DB.filter((d) => {
    const st = getSeasonStatus(d, month, day);
    return st === "peak" || st === "gold";
  });

  return (
    <div className="relative flex min-h-dvh w-full flex-col bg-[#080d14] overflow-x-hidden pb-24">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 pt-6 pb-2 bg-[#080d14]/60 backdrop-blur-xl border-b border-white/5 sticky top-0 z-30">
        <Link
          href="/"
          className="size-9 flex items-center justify-center rounded-full bg-white/5 border border-white/10"
        >
          <DynamicIcon name="arrow_back" size={20} className="text-white/50" />
        </Link>
        <div className="flex-1">
          <h1 className="text-base font-bold text-white">
            {isKo ? "실시간 조황" : "Live Dashboard"}
          </h1>
          <p className="text-[10px] text-white/30">
            {isKo ? "전국 낚시 현황 · 업데이트됨" : "Nationwide fishing status"}
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 rounded-full px-2.5 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[10px] font-bold text-red-400">LIVE</span>
        </div>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 border-4 border-[#c9a84c]/30 border-t-[#c9a84c] rounded-full animate-spin" />
            <p className="text-sm text-white/50">전국 조황 데이터 수집 중...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-5 px-4 pt-4">
          {/* ── Summary Banner ── */}
          <div className="rounded-2xl p-[1px] bg-gradient-to-r from-[#c9a84c] to-[#7dd3fc]">
            <div className="rounded-2xl bg-[#0f141b] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em] mb-1">
                    {isKo ? "오늘 전국 조과" : "Today's Total"}
                  </p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-black text-white">
                      {feed
                        .reduce((sum, f) => sum + f.count, 0)
                        .toLocaleString()}
                    </span>
                    <span className="text-sm text-white/50">마리</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-white/30 mb-0.5">
                    {feed.length}건 기록
                  </p>
                  <p className="text-[10px] text-white/30">
                    {regionStats.length}개 해역
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Season Fish Banner ── */}
          {inSeasonFish.length > 0 && (
            <div className="bg-white/5 backdrop-blur-[12px] rounded-2xl border border-white/10 p-4">
              <div className="flex items-center gap-2 mb-2.5">
                <DynamicIcon
                  name="local_fire_department"
                  size={16}
                  className="text-[#c9a84c]"
                />
                <h2 className="text-sm font-bold text-white">
                  {isKo ? `${month}월 시즌 어종` : `${month} In-Season`}
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {inSeasonFish.map((d) => {
                  const st = getSeasonStatus(d, month, day);
                  const isGold = st === "gold";
                  return (
                    <Link
                      key={d.species}
                      href="/season-forecast"
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all hover:scale-105 ${
                        isGold
                          ? "bg-[#c9a84c]/10 border-[#c9a84c]/30 text-[#c9a84c]"
                          : "bg-[#7dd3fc]/10 border-[#7dd3fc]/30 text-[#7dd3fc]"
                      }`}
                    >
                      <span className="text-xs font-bold">{d.species}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                          isGold
                            ? "bg-[#c9a84c] text-[#080d14]"
                            : "bg-[#7dd3fc] text-[#080d14]"
                        }`}
                      >
                        {isGold ? "황금" : "피크"}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Region Grid ── */}
          {regionStats.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <DynamicIcon
                  name="location_on"
                  size={16}
                  className="text-[#c9a84c]"
                />
                <h2 className="text-sm font-bold text-white/50 uppercase tracking-[0.2em]">
                  {isKo ? "해역별 현황" : "By Region"}
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {regionStats.map((stat) => (
                  <RegionCard key={stat.region} stat={stat} />
                ))}
              </div>
            </div>
          )}

          {/* ── Species Ranking ── */}
          {speciesStats.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <DynamicIcon
                  name="emoji_events"
                  size={16}
                  className="text-[#c9a84c]"
                />
                <h2 className="text-sm font-bold text-white/50 uppercase tracking-[0.2em]">
                  {isKo ? "어종별 랭킹" : "Species Ranking"}
                </h2>
              </div>
              <div className="space-y-2">
                {speciesStats.slice(0, 5).map((stat, i) => (
                  <SpeciesRow key={stat.species} stat={stat} rank={i + 1} />
                ))}
              </div>
            </div>
          )}

          {/* ── Live News ── */}
          <LiveNewsTicker news={news} />

          {/* ── Empty state ── */}
          {feed.length === 0 && news.length === 0 && (
            <div className="bg-white/5 backdrop-blur-[12px] rounded-2xl border border-white/10 p-8 text-center">
              <DynamicIcon
                name="phishing"
                size={40}
                className="text-white/20 mb-1"
              />
              <p className="text-sm font-bold text-white mt-3">
                아직 오늘의 조과가 없습니다
              </p>
              <p className="text-xs text-white/30 mt-1">
                첫 번째 조과를 기록해보세요!
              </p>
              <Link
                href="/record"
                className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-[#c9a84c] text-[#080d14] rounded-full text-xs font-bold hover:opacity-90 transition-opacity"
              >
                <DynamicIcon name="add" size={14} />
                기록 추가
              </Link>
            </div>
          )}

          {/* ── Data source ── */}
          <p className="text-[10px] text-white/20 text-center pb-4">
            {isKo
              ? "※ 커뮤니티 피드 + 네이버 뉴스 기반. 실시간 업데이트됩니다."
              : "※ Community feed + Naver news. Updated in real-time."}
          </p>
        </div>
      )}
    </div>
  );
}
