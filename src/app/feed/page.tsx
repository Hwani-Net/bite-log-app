'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '@/store/appStore';
import { getPublicFeed, toggleLike, getLikedSet, addComment } from '@/services/feedService';
import { PublicFeedItem } from '@/types';

type FilterType = 'all' | 'species' | 'region';

export default function FeedPage() {
  const locale = useAppStore((s) => s.locale);
  const [feed, setFeed] = useState<PublicFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [commentInputId, setCommentInputId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  // Filter state
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  useEffect(() => {
    getPublicFeed()
      .then((items) => setFeed(items))
      .finally(() => setLoading(false));
    setLikedIds(getLikedSet());
  }, []);

  // Derive unique species and regions from feed data
  const speciesList = useMemo(() => {
    const set = new Set(feed.map((f) => f.species));
    return Array.from(set).sort();
  }, [feed]);

  const regionList = useMemo(() => {
    const set = new Set(feed.map((f) => f.location.region).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [feed]);

  // Filtered feed
  const filteredFeed = useMemo(() => {
    if (filterType === 'species' && selectedSpecies) {
      return feed.filter((f) => f.species === selectedSpecies);
    }
    if (filterType === 'region' && selectedRegion) {
      return feed.filter((f) => f.location.region === selectedRegion);
    }
    return feed;
  }, [feed, filterType, selectedSpecies, selectedRegion]);

  async function handleLike(itemId: string) {
    const { liked, newCount } = await toggleLike(itemId);
    const newSet = new Set(likedIds);
    if (liked) { newSet.add(itemId); } else { newSet.delete(itemId); }
    setLikedIds(newSet);
    setFeed((prev) => prev.map((item) =>
      item.id === itemId
        ? { ...item, likeCount: newCount > 0 ? newCount : Math.max(0, item.likeCount + (liked ? 1 : -1)) }
        : item
    ));
  }

  async function handleComment(item: PublicFeedItem) {
    if (!commentText.trim()) return;
    const firestoreComment = await addComment(
      item.id, 'me', locale === 'ko' ? '나' : 'Me', commentText.trim()
    );
    const newComment = firestoreComment || {
      id: `c-${Date.now()}`,
      userId: 'me',
      userDisplayName: locale === 'ko' ? '나' : 'Me',
      content: commentText.trim(),
      createdAt: new Date().toISOString(),
    };
    setFeed((prev) => prev.map((fi) =>
      fi.id === item.id
        ? { ...fi, comments: [...(fi.comments || []), newComment], commentCount: fi.commentCount + 1 }
        : fi
    ));
    setCommentText('');
    setCommentInputId(null);
  }

  function handleFilterChange(type: FilterType) {
    setFilterType(type);
    if (type === 'all') {
      setSelectedSpecies(null);
      setSelectedRegion(null);
    }
  }

  return (
    <div className="min-h-screen bg-background dark:bg-background-dark pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">public</span>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">
            {locale === 'ko' ? '낚시인 피드' : 'Angler Feed'}
          </h1>
          <span className="ml-auto text-xs text-slate-400 font-medium">
            {filteredFeed.length}{locale === 'ko' ? '건' : ' posts'}
          </span>
        </div>

        {/* Filter Tabs */}
        <div className="max-w-lg mx-auto px-4 pb-2 flex items-center gap-2">
          <button
            onClick={() => handleFilterChange('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filterType === 'all'
                ? 'bg-primary text-white shadow-md shadow-primary/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {locale === 'ko' ? '전체' : 'All'}
          </button>
          <button
            onClick={() => handleFilterChange('species')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filterType === 'species'
                ? 'bg-primary text-white shadow-md shadow-primary/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            🐟 {locale === 'ko' ? '어종별' : 'By Species'}
          </button>
          <button
            onClick={() => handleFilterChange('region')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filterType === 'region'
                ? 'bg-primary text-white shadow-md shadow-primary/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            📍 {locale === 'ko' ? '지역별' : 'By Region'}
          </button>
        </div>

        {/* Sub-filter chips */}
        {filterType === 'species' && speciesList.length > 0 && (
          <div className="max-w-lg mx-auto px-4 pb-2 overflow-x-auto">
            <div className="flex items-center gap-1.5 min-w-max">
              {speciesList.map((sp) => (
                <button
                  key={sp}
                  onClick={() => setSelectedSpecies(selectedSpecies === sp ? null : sp)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all whitespace-nowrap ${
                    selectedSpecies === sp
                      ? 'bg-teal-500 text-white shadow-sm'
                      : 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/40'
                  }`}
                >
                  {sp}
                </button>
              ))}
            </div>
          </div>
        )}
        {filterType === 'region' && regionList.length > 0 && (
          <div className="max-w-lg mx-auto px-4 pb-2 overflow-x-auto">
            <div className="flex items-center gap-1.5 min-w-max">
              {regionList.map((rg) => (
                <button
                  key={rg}
                  onClick={() => setSelectedRegion(selectedRegion === rg ? null : rg)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all whitespace-nowrap ${
                    selectedRegion === rg
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40'
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
              <div key={i} className="glass-card rounded-2xl p-4 shadow-sm animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-24" />
                    <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-16" />
                  </div>
                </div>
                <div className="h-40 bg-slate-200 dark:bg-slate-700 rounded-xl" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredFeed.length === 0 && (
          <div className="text-center py-20">
            <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-4 block">
              {filterType === 'all' ? 'explore' : 'filter_list_off'}
            </span>
            <h2 className="text-lg font-bold text-slate-400 dark:text-slate-500 mb-1">
              {filterType === 'all'
                ? (locale === 'ko' ? '아직 공개된 조과가 없어요' : 'No public catches yet')
                : (locale === 'ko' ? '필터에 맞는 조과가 없어요' : 'No catches match this filter')}
            </h2>
            <p className="text-sm text-slate-400">
              {filterType === 'all'
                ? (locale === 'ko' ? '기록 시 공개 설정하면 피드에 표시됩니다' : 'Make your catch public to appear here')
                : (locale === 'ko' ? '다른 필터를 선택해보세요' : 'Try a different filter')}
            </p>
            {filterType !== 'all' && (
              <button onClick={() => handleFilterChange('all')} className="mt-4 px-4 py-2 bg-primary text-white rounded-full text-sm font-medium">
                {locale === 'ko' ? '전체 보기' : 'Show All'}
              </button>
            )}
          </div>
        )}

        {/* Feed cards */}
        {filteredFeed.map((item) => {
          const isLiked = likedIds.has(item.id);
          const showComments = commentInputId === item.id;

          return (
            <article key={item.id} className="glass-card rounded-2xl shadow-sm overflow-hidden">
              {/* User header */}
              <div className="px-4 pt-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-teal-accent flex items-center justify-center text-white text-sm font-bold shadow-md">
                  {item.userDisplayName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{item.userDisplayName}</p>
                  <p className="text-[10px] text-slate-400">{item.date} · {item.location.name}</p>
                </div>
                {/* Region badge */}
                {item.location.region && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                    {item.location.region}
                  </span>
                )}
              </div>

              {/* Photo */}
              {item.photos.length > 0 && (
                <div className="px-4 pt-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.photos[0]} alt={`${item.species} catch`} className="w-full h-48 object-cover rounded-xl" />
                </div>
              )}

              {/* Catch info */}
              <div className="px-4 pt-3 pb-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🐟</span>
                  <div>
                    <p className="text-base font-bold text-slate-900 dark:text-white">
                      {item.species}
                      <span className="text-sm font-normal text-primary ml-1.5">{item.count}{locale === 'ko' ? '마리' : ' fish'}</span>
                    </p>
                    {item.sizeCm && <p className="text-xs text-slate-500">📏 {item.sizeCm}cm</p>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {item.weather && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 font-medium">
                      🌤️ {item.weather.condition} {item.weather.tempC}°C
                    </span>
                  )}
                  {item.tide && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium">
                      🌊 {item.tide.stationName}
                    </span>
                  )}
                </div>
              </div>

              {/* Action bar */}
              <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-2 flex items-center gap-4">
                <button onClick={() => handleLike(item.id)} className={`flex items-center gap-1.5 text-sm font-medium transition-all ${isLiked ? 'text-red-500 scale-110' : 'text-slate-400 hover:text-red-400'}`}>
                  <span className="material-symbols-outlined text-xl" style={isLiked ? { fontVariationSettings: "'FILL' 1", color: '#ef4444' } : undefined}>favorite</span>
                  <span>{item.likeCount > 0 ? item.likeCount : ''}</span>
                </button>
                <button onClick={() => setCommentInputId(showComments ? null : item.id)} className="flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-primary transition-colors">
                  <span className="material-symbols-outlined text-xl">chat_bubble_outline</span>
                  <span>{item.commentCount > 0 ? item.commentCount : ''}</span>
                </button>
              </div>

              {/* Comments section */}
              {(showComments || (item.comments && item.comments.length > 0)) && (
                <div className="px-4 pb-3 space-y-2">
                  {item.comments?.map((c) => (
                    <div key={c.id} className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 mt-0.5">{c.userDisplayName.charAt(0)}</div>
                      <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-3 py-2">
                        <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">{c.userDisplayName}</p>
                        <p className="text-xs text-slate-700 dark:text-slate-200">{c.content}</p>
                      </div>
                    </div>
                  ))}
                  {showComments && (
                    <div className="flex items-center gap-2 mt-1">
                      <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleComment(item)} placeholder={locale === 'ko' ? '댓글을 입력하세요...' : 'Add a comment...'} className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full px-4 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/30" />
                      <button onClick={() => handleComment(item)} disabled={!commentText.trim()} className="w-8 h-8 rounded-full bg-primary flex items-center justify-center disabled:opacity-40">
                        <span className="material-symbols-outlined text-white text-base">send</span>
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
