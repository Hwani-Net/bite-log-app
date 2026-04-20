import { NextResponse } from "next/server";
import type { FishingNewsItem } from "@/services/fishingNewsService";

export const revalidate = 3600;

const FISHING_CHANNELS = [
  { name: "한국낚시방송", id: "UCu4vSiHsadWOOjInbyJzRWQ" },
  { name: "FTV Korea", id: "UCwSVFgykq2a4JpvJ9eiKU5A" },
  { name: "앵쩡TV", id: "UCQ_2Uzf0pXNBPkEaoNgvmUg" },
  { name: "낚율", id: "UC9jilpNdE3kWaGGa9ce54HA" },
  // UCUg6197rR4RIl6FgEQRkcWA 제거 — RSS entry 없음 (planner-b 실측)
  { name: "낚시하는김아빠", id: "UC5ffU_9qIvyAg68BgrOAAtQ" },
  { name: "낚시의시간", id: "UCDWdPQ95ziDhGJd5ohq-_7g" },
  { name: "낚시가는길", id: "UCOL3t3mXCXi21yMy0fa1sTQ" },
  { name: "낚시한끼", id: "UCp_C581U_7UwfVbW5STKLxg" },
  { name: "피싱트립&태클", id: "UC86kmEzDxYXrA2dG8zs4jDg" },
  { name: "초짜낚시", id: "UC2p_1UG0IjoRfAo8rmVsmKQ" },
  { name: "와우낚시tv", id: "UCqMO8qO0HoCR9QIuOJ0PFDw" },
];

const FISHING_RELEVANCE_KEYWORDS = [
  "낚시",
  "조과",
  "조황",
  "조행",
  "출조",
  "입질",
  "히트",
  "채비",
  "캐스팅",
  "루어",
  "찌낚",
  "원투",
  "바다낚시",
  "선상",
  "방파제",
  "갯바위",
  "포인트",
  "미끼",
  "에기",
  "지깅",
  "타이라바",
  "감성돔",
  "볼락",
  "농어",
  "참돔",
  "돌돔",
  "벵에돔",
  "광어",
  "우럭",
  "쥐노래미",
  "고등어",
  "방어",
  "부시리",
  "갈치",
  "오징어",
  "문어",
  "주꾸미",
  "쭈꾸미",
  "릴",
  "대물",
  "마릿수",
  "쿨러",
  "씨알",
  "손맛",
  "올림",
  "물때",
  "수온",
  "조류",
  "만조",
  "간조",
  "낚시배",
  "피싱",
  "유어선",
  "낚시터",
  "갈치배",
];

const SHOPPING_KEYWORDS = [
  "할인",
  "구매",
  "특가",
  "쇼핑",
  "장비",
  "리뷰",
  "추천템",
  "최저가",
  "내돈내산",
  "품절",
  "공구",
  "마켓",
  "스토어",
  "판매",
  "이벤트",
  "당일발송",
  "무료배송",
  "사용후기",
  "실사용",
  "사용기",
  "체험단",
  "협찬",
  "광고",
  "다이와",
  "시마노",
  "JS컴퍼니",
];

function isFishingRelevant(text: string): boolean {
  const lower = text.toLowerCase();
  if (SHOPPING_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()))) {
    return false;
  }
  return FISHING_RELEVANCE_KEYWORDS.some((kw) =>
    lower.includes(kw.toLowerCase()),
  );
}

function calculateFreshness(
  publishedAt: string,
): "realtime" | "today" | "week" {
  const diffHours =
    (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60);
  if (diffHours <= 1) return "realtime";
  if (diffHours <= 24) return "today";
  return "week";
}

const REGION_KEYWORDS: Record<string, string[]> = {
  east: ["동해", "속초", "강릉", "삼척", "울진", "포항", "울산", "부산 기장"],
  west: ["서해", "인천", "태안", "보령", "군산", "목포", "신안", "영광"],
  south: ["남해", "통영", "거제", "여수", "완도", "고흥", "사천", "남해군"],
  jeju: ["제주", "서귀포", "한림", "성산", "모슬포", "추자도"],
};

const SPECIES_KEYWORDS = [
  "감성돔",
  "볼락",
  "농어",
  "참돔",
  "돌돔",
  "벵에돔",
  "광어",
  "우럭",
  "쥐노래미",
  "고등어",
  "방어",
  "부시리",
  "갈치",
  "오징어",
  "문어",
  "주꾸미",
  "쭈꾸미",
];

function detectRegion(text: string): string | undefined {
  for (const [region, keywords] of Object.entries(REGION_KEYWORDS)) {
    if (keywords.some((kw) => text.includes(kw))) return region;
  }
  return undefined;
}

function detectSpecies(text: string): string | undefined {
  return SPECIES_KEYWORDS.find((sp) => text.includes(sp));
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function parseYouTubeRSS(xml: string, channelName: string): FishingNewsItem[] {
  const entries = xml.match(/<entry>([\s\S]*?)<\/entry>/g) || [];
  const items: FishingNewsItem[] = [];

  for (const entry of entries) {
    try {
      const videoId = (entry.match(/yt:video:([^<\s]+)/) || [])[1] || "";
      if (!videoId) continue;

      const title = decodeXmlEntities(
        (entry.match(/<title>([^<]+)<\/title>/) || [])[1] || "",
      );
      const published =
        (entry.match(/<published>([^<]+)<\/published>/) || [])[1] ||
        new Date().toISOString();
      const thumbnail =
        (entry.match(/media:thumbnail url="([^"]+)"/) || [])[1] ||
        `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
      const rawDesc =
        (entry.match(/<media:description>([\s\S]*?)<\/media:description>/) ||
          [])[1] || "";
      const description = decodeXmlEntities(rawDesc.trim());

      const combined = title + " " + description;

      items.push({
        id: `yt_${videoId}`,
        title,
        description:
          description.slice(0, 120) + (description.length > 120 ? "..." : ""),
        link: `https://www.youtube.com/watch?v=${videoId}`,
        source: "youtube",
        sourceLabel: channelName,
        thumbnail,
        publishedAt: published,
        freshness: calculateFreshness(published),
        reliability: "sns",
        region: detectRegion(combined),
        species: detectSpecies(combined),
      });
    } catch (err) {
      console.error(
        `[YT RSS] parseYouTubeRSS entry error (${channelName}):`,
        err,
      );
    }
  }

  return items;
}

export async function GET() {
  const rssResults = await Promise.allSettled(
    FISHING_CHANNELS.map(async (ch) => {
      const res = await fetch(
        `https://www.youtube.com/feeds/videos.xml?channel_id=${ch.id}`,
        { next: { revalidate: 3600 } },
      );
      if (!res.ok) {
        console.error(`[YT RSS] ${ch.name} fetch failed: ${res.status}`);
        return [];
      }
      const xml = await res.text();
      return parseYouTubeRSS(xml, ch.name);
    }),
  );

  const allItems: FishingNewsItem[] = [];
  for (const result of rssResults) {
    if (result.status === "fulfilled") {
      allItems.push(...result.value);
    } else {
      console.error("[YT RSS] Channel fetch rejected:", result.reason);
    }
  }

  const filtered = allItems
    .filter((it) => isFishingRelevant(it.title + " " + it.description))
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    )
    .slice(0, 8);

  return NextResponse.json(filtered);
}
