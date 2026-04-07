"use client";

import { useState, useEffect, useMemo } from "react";
import { useAppStore } from "@/store/appStore";
import {
  getPublicFeed,
  toggleLike,
  getLikedSet,
  addComment,
} from "@/services/feedService";
import { PublicFeedItem } from "@/types";
import { ArrowLeft, Heart, MessageCircle, MapPin } from "lucide-react";
import { DynamicIcon } from "@/lib/iconMap";

type FilterType = "all" | "species" | "region";

export default function FeedPage() {
  const locale = useAppStore((s) => s.locale);
  const [feed, setFeed] = useState<PublicFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [commentInputId, setCommentInputId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");

  // Filter state
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  useEffect(() => {
    getPublicFeed()
      .then((items) => setFeed(items))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLikedIds(getLikedSet());
  }, []);

  // Derive unique species and regions from feed data
  const speciesList = useMemo(() => {
    const set = new Set(feed.map((f) => f.species));
    return Array.from(set).sort();
  }, [feed]);

  const regionList = useMemo(() => {
    const set = new Set(
      feed.map((f) => f.location.region).filter(Boolean) as string[],
    );
    return Array.from(set).sort();
  }, [feed]);

  // Filtered feed
  const filteredFeed = useMemo(() => {
    if (filterType === "species" && selectedSpecies) {
      return feed.filter((f) => f.species === selectedSpecies);
    }
    if (filterType === "region" && selectedRegion) {
      return feed.filter((f) => f.location.region === selectedRegion);
    }
    return feed;
  }, [feed, filterType, selectedSpecies, selectedRegion]);

  async function handleLike(itemId: string) {
    const { liked, newCount } = await toggleLike(itemId);
    const newSet = new Set(likedIds);
    if (liked) {
      newSet.add(itemId);
    } else {
      newSet.delete(itemId);
    }
    setLikedIds(newSet);
    setFeed((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              likeCount:
                newCount > 0
                  ? newCount
                  : Math.max(0, item.likeCount + (liked ? 1 : -1)),
            }
          : item,
      ),
    );
  }

  async function handleComment(item: PublicFeedItem) {
    if (!commentText.trim()) return;
    const firestoreComment = await addComment(
      item.id,
      "me",
      locale === "ko" ? "나" : "Me",
      commentText.trim(),
    );
    const newComment = firestoreComment || {
      id: `c-${Date.now()}`,
      userId: "me",
      userDisplayName: locale === "ko" ? "나" : "Me",
      content: commentText.trim(),
      createdAt: new Date().toISOString(),
    };
    setFeed((prev) =>
      prev.map((fi) =>
        fi.id === item.id
          ? {
              ...fi,
              comments: [...(fi.comments || []), newComment],
              commentCount: fi.commentCount + 1,
            }
          : fi,
      ),
    );
    setCommentText("");
    setCommentInputId(null);
  }

  function handleFilterChange(type: FilterType) {
    setFilterType(type);
    if (type === "all") {
      setSelectedSpecies(null);
      setSelectedRegion(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#080d14] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#080d14]/60 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-2">
          <DynamicIcon name="public" size={20} className="text-[#c9a84c]" />
          <h1 className="text-lg font-bold text-white">
            {locale === "ko" ? "낚시인 피드" : "Angler Feed"}
          </h1>
          <span className="ml-auto text-xs text-white/30 font-medium">
            {filteredFeed.length}
            {locale === "ko" ? "건" : " posts"}
          </span>
        </div>

        {/* Filter Tabs */}
        <div className="max-w-lg mx-auto px-4 pb-2 flex items-center gap-2">
          <button
            onClick={() => handleFilterChange("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filterType === "all"
                ? "bg-[#c9a84c] text-[#080d14]"
                : "bg-white/5 border border-white/10 text-white/50 hover:text-white/70"
            }`}
          >
            {locale === "ko" ? "전체" : "All"}
          </button>
          <button
            onClick={() => handleFilterChange("species")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filterType === "species"
                ? "bg-[#c9a84c] text-[#080d14]"
                : "bg-white/5 border border-white/10 text-white/50 hover:text-white/70"
            }`}
          >
            {locale === "ko" ? "어종별" : "By Species"}
          </button>
          <button
            onClick={() => handleFilterChange("region")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filterType === "region"
                ? "bg-[#c9a84c] text-[#080d14]"
                : "bg-white/5 border border-white/10 text-white/50 hover:text-white/70"
            }`}
          >
            {locale === "ko" ? "지역별" : "By Region"}
          </button>
        </div>

        {/* Sub-filter chips */}
        {filterType === "species" && speciesList.length > 0 && (
          <div className="max-w-lg mx-auto px-4 pb-2 overflow-x-auto">
            <div className="flex items-center gap-1.5 min-w-max">
              {speciesList.map((sp) => (
                <button
                  key={sp}
                  onClick={() =>
                    setSelectedSpecies(selectedSpecies === sp ? null : sp)
                  }
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all whitespace-nowrap ${
                    selectedSpecies === sp
                      ? "bg-[#7dd3fc] text-[#080d14]"
                      : "bg-[#7dd3fc]/10 text-[#7dd3fc] border border-[#7dd3fc]/20 hover:bg-[#7dd3fc]/20"
                  }`}
                >
                  {sp}
                </button>
              ))}
            </div>
          </div>
        )}
        {filterType === "region" && regionList.length > 0 && (
          <div className="max-w-lg mx-auto px-4 pb-2 overflow-x-auto">
            <div className="flex items-center gap-1.5 min-w-max">
              {regionList.map((rg) => (
                <button
                  key={rg}
                  onClick={() =>
                    setSelectedRegion(selectedRegion === rg ? null : rg)
                  }
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all whitespace-nowrap ${
                    selectedRegion === rg
                      ? "bg-[#c9a84c] text-[#080d14]"
                      : "bg-[#c9a84c]/10 text-[#c9a84c] border border-[#c9a84c]/20 hover:bg-[#c9a84c]/20"
                  }`}
                >
                  {rg}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white/5 border border-white/10 rounded-2xl p-4 animate-pulse"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-white/10 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 bg-white/10 rounded w-24" />
                    <div className="h-2 bg-white/10 rounded w-16" />
                  </div>
                </div>
                <div className="h-40 bg-white/10 rounded-xl" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredFeed.length === 0 && (
          <div className="text-center py-20">
            <DynamicIcon
              name={filterType === "all" ? "explore" : "filter_list"}
              size={48}
              className="text-white/10 mb-4 block"
            />
            <h2 className="text-lg font-bold text-white/30 mb-1">
              {filterType === "all"
                ? locale === "ko"
                  ? "아직 공개된 조과가 없어요"
                  : "No public catches yet"
                : locale === "ko"
                  ? "필터에 맞는 조과가 없어요"
                  : "No catches match this filter"}
            </h2>
            <p className="text-sm text-white/20">
              {filterType === "all"
                ? locale === "ko"
                  ? "기록 시 공개 설정하면 피드에 표시됩니다"
                  : "Make your catch public to appear here"
                : locale === "ko"
                  ? "다른 필터를 선택해보세요"
                  : "Try a different filter"}
            </p>
            {filterType !== "all" && (
              <button
                onClick={() => handleFilterChange("all")}
                className="mt-4 px-4 py-2 bg-[#c9a84c] text-[#080d14] rounded-full text-sm font-medium"
              >
                {locale === "ko" ? "전체 보기" : "Show All"}
              </button>
            )}
          </div>
        )}

        {/* Feed cards */}
        {filteredFeed.map((item) => {
          const isLiked = likedIds.has(item.id);
          const showComments = commentInputId === item.id;

          return (
            <article
              key={item.id}
              className="bg-white/5 backdrop-blur-[12px] border border-white/10 rounded-2xl overflow-hidden"
            >
              {/* User header */}
              <div className="px-4 pt-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#c9a84c] to-[#7dd3fc] flex items-center justify-center text-[#080d14] text-sm font-bold">
                  {item.userDisplayName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {item.userDisplayName}
                  </p>
                  <p className="text-[10px] text-white/30">
                    {item.date} · {item.location.name}
                  </p>
                </div>
                {/* Region badge */}
                {item.location.region && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/60 font-medium">
                    {item.location.region}
                  </span>
                )}
              </div>

              {/* Photo */}
              {item.photos.length > 0 && (
                <div className="px-4 pt-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.photos[0]}
                    alt={`${item.species} catch`}
                    className="w-full h-48 object-cover rounded-xl"
                  />
                </div>
              )}

              {/* Catch info */}
              <div className="px-4 pt-3 pb-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-[#7dd3fc] w-8 text-center">
                    {item.species.slice(0, 2)}
                  </span>
                  <div>
                    <p className="text-base font-bold text-white">
                      {item.species}
                      <span className="text-sm font-normal text-[#c9a84c] ml-1.5">
                        {item.count}
                        {locale === "ko" ? "마리" : " fish"}
                      </span>
                    </p>
                    {item.sizeCm && (
                      <p className="text-xs text-white/50">{item.sizeCm}cm</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {item.weather && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#c9a84c]/10 text-[#c9a84c] font-medium">
                      {item.weather.condition} {item.weather.tempC}°C
                    </span>
                  )}
                  {item.tide && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#7dd3fc]/10 text-[#7dd3fc] font-medium">
                      {item.tide.stationName}
                    </span>
                  )}
                </div>
              </div>

              {/* Action bar */}
              <div className="border-t border-white/5 px-4 py-2 flex items-center gap-4">
                <button
                  onClick={() => handleLike(item.id)}
                  aria-label={`${locale === "ko" ? "좋아요" : "Like"} ${item.likeCount > 0 ? item.likeCount : ""}`}
                  className={`flex items-center gap-1.5 text-sm font-medium transition-all ${isLiked ? "text-red-400 scale-110" : "text-white/30 hover:text-red-400"}`}
                >
                  <Heart
                    size={20}
                    fill={isLiked ? "#f87171" : "none"}
                    color={isLiked ? "#f87171" : "currentColor"}
                  />
                  <span>{item.likeCount > 0 ? item.likeCount : ""}</span>
                </button>
                <button
                  onClick={() =>
                    setCommentInputId(showComments ? null : item.id)
                  }
                  aria-label={`${locale === "ko" ? "댓글" : "Comment"} ${item.commentCount > 0 ? item.commentCount : ""}`}
                  className="flex items-center gap-1.5 text-sm font-medium text-white/30 hover:text-[#7dd3fc] transition-colors"
                >
                  <MessageCircle size={20} />
                  <span>{item.commentCount > 0 ? item.commentCount : ""}</span>
                </button>
              </div>

              {/* Comments section */}
              {(showComments ||
                (item.comments && item.comments.length > 0)) && (
                <div className="px-4 pb-3 space-y-2">
                  {item.comments?.map((c) => (
                    <div key={c.id} className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#c9a84c]/20 flex items-center justify-center text-[10px] font-bold text-[#c9a84c] shrink-0 mt-0.5">
                        {c.userDisplayName.charAt(0)}
                      </div>
                      <div className="flex-1 bg-white/5 rounded-xl px-3 py-2">
                        <p className="text-[10px] font-semibold text-white/50">
                          {c.userDisplayName}
                        </p>
                        <p className="text-xs text-white/70">{c.content}</p>
                      </div>
                    </div>
                  ))}
                  {showComments && (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleComment(item)
                        }
                        placeholder={
                          locale === "ko"
                            ? "댓글을 입력하세요..."
                            : "Add a comment..."
                        }
                        className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-xs text-white placeholder:text-white/30 outline-none focus:border-[#c9a84c]/50"
                      />
                      <button
                        onClick={() => handleComment(item)}
                        disabled={!commentText.trim()}
                        className="w-8 h-8 rounded-full bg-[#c9a84c] flex items-center justify-center disabled:opacity-40"
                      >
                        <DynamicIcon
                          name="send"
                          size={16}
                          className="text-[#080d14]"
                        />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </main>
    </div>
  );
}
