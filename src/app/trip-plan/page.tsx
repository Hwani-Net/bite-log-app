'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TripPlan, TripBriefing, generateTripBriefing, getBriefingAlertTime } from '@/services/preTripBriefingService';
import { sendLocalNotification, requestNotificationPermission } from '@/services/pushNotificationService';

// 어종 목록
const SPECIES_LIST = ['볼락', '감성돔', '농어', '우럭', '방어', '주꾸미', '갈치', '광어', '참돔'];

// 지역 → 좌표 매핑
const LOCATION_COORDS: Record<string, { lat: number; lng: number }> = {
  '인천': { lat: 37.4563, lng: 126.7052 },
  '태안': { lat: 36.7485, lng: 126.2982 },
  '보령': { lat: 36.3325, lng: 126.6127 },
  '군산': { lat: 35.9675, lng: 126.7368 },
  '목포': { lat: 34.8118, lng: 126.3922 },
  '통영': { lat: 34.854, lng: 128.433 },
  '거제': { lat: 34.8802, lng: 128.6217 },
  '여수': { lat: 34.7604, lng: 127.6622 },
  '부산': { lat: 35.1796, lng: 129.0756 },
  '제주': { lat: 33.4996, lng: 126.5312 },
  '서귀포': { lat: 33.2541, lng: 126.5601 },
  '속초': { lat: 38.2048, lng: 128.5912 },
  '포항': { lat: 36.019, lng: 129.3435 },
};

const FISHING_TYPES = [
  { value: 'breakwater', label: '방파제' },
  { value: 'boat', label: '선상낚시' },
  { value: 'shore', label: '갯바위/연안' },
  { value: 'reef', label: '방죽/갯벌' },
] as const;

export default function TripPlanPage() {
  const router = useRouter();
  const [form, setForm] = useState<Partial<TripPlan>>({
    date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    species: '볼락',
    location: '태안',
    fishingType: 'breakwater',
    alertHour: 14,
  });
  const [briefing, setBriefing] = useState<TripBriefing | null>(null);
  const [loading, setLoading] = useState(false);
  const [alertSet, setAlertSet] = useState(false);

  const handleGenerate = async () => {
    if (!form.species || !form.location || !form.date) return;
    setLoading(true);
    setBriefing(null);

    const coords = LOCATION_COORDS[form.location] || { lat: 37.5665, lng: 126.9780 };
    const plan: TripPlan = {
      date: form.date,
      species: form.species,
      location: form.location,
      lat: coords.lat,
      lng: coords.lng,
      fishingType: form.fishingType || 'breakwater',
      charterName: form.charterName,
      alertHour: form.alertHour ?? 14,
    };

    try {
      const result = await generateTripBriefing(plan);
      setBriefing(result);
    } catch (e) {
      console.error('Briefing generation failed', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSetAlert = async () => {
    if (!briefing) return;
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      alert('알림 권한이 필요합니다. 브라우저 설정에서 허용해주세요.');
      return;
    }
    const alertTime = getBriefingAlertTime(briefing.tripPlan.date, briefing.tripPlan.alertHour);
    const now = new Date();
    const delay = alertTime.getTime() - now.getTime();
    
    // 권한 허용 시 즉시 버튼 UI 상태 변경 피드백
    setAlertSet(true);
    
    const notificationPayload = [
      `🎣 ${briefing.tripPlan.species} 출조 브리핑`,
      `내일 ${briefing.tripPlan.location} 출조 준비하세요! 🚢`,
      '/icons/icon-192x192.png',
      'trip-briefing'
    ] as const;

    if (delay > 0) {
      setTimeout(() => {
        sendLocalNotification(...notificationPayload);
      }, delay);
    } else {
      // 지난 시간 클릭 시 즉시 안내 (데모/테스트 효과)
      sendLocalNotification(...notificationPayload);
    }
  };

  const priorityColor = (p: string) => {
    if (p === 'essential') return 'text-red-600 dark:text-red-400';
    if (p === 'recommended') return 'text-amber-600 dark:text-amber-400';
    return 'text-slate-600 dark:text-slate-400';
  };

  return (
    <div className="relative flex min-h-dvh w-full flex-col overflow-x-hidden pb-24 page-enter">
      {/* Header — concierge 패턴 그대로 */}
      <header className="flex items-center gap-3 px-5 pt-6 pb-3 sticky top-0 z-30 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-100 dark:border-white/5">
        <button
          onClick={() => router.back()}
          className="size-9 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <span className="material-symbols-outlined text-slate-600 dark:text-slate-400 text-xl">arrow_back</span>
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">출조 전 브리핑</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">AI가 날씨·물때·커뮤니티 조황을 종합합니다</p>
        </div>
      </header>

      <main className="flex-1 px-5 mt-4 space-y-4">

        {/* ── 출조 계획 입력 ── */}
        <section className="rounded-2xl bg-white dark:bg-slate-900 shadow-md border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">edit_note</span>
            출조 계획 입력
          </h2>

          {/* 날짜 */}
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">출조 날짜</label>
            <input
              type="date"
              value={form.date}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              style={{ colorScheme: 'inherit' }}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
            />
          </div>

          {/* 어종 */}
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">대상 어종</label>
            <div className="flex flex-wrap gap-2">
              {SPECIES_LIST.map(sp => (
                <button
                  key={sp}
                  onClick={() => setForm(f => ({ ...f, species: sp }))}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    form.species === sp
                      ? 'bg-primary text-white shadow-md shadow-primary/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {sp}
                </button>
              ))}
            </div>
          </div>

          {/* 지역 */}
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">출조 지역</label>
            <select
              value={form.location}
              onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              style={{ colorScheme: 'inherit' }}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary transition-all"
            >
              {Object.keys(LOCATION_COORDS).map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          {/* 낚시 유형 */}
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">낚시 유형</label>
            <div className="grid grid-cols-4 gap-2">
              {FISHING_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setForm(f => ({ ...f, fishingType: t.value }))}
                  className={`py-2 rounded-xl text-[11px] font-semibold transition-all ${
                    form.fishingType === t.value
                      ? 'bg-primary text-white shadow-md shadow-primary/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* 선사명 */}
          {form.fishingType === 'boat' && (
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">선사명 (선택)</label>
              <input
                type="text"
                placeholder="예: 홍길동 낚시배"
                value={form.charterName || ''}
                onChange={e => setForm(f => ({ ...f, charterName: e.target.value }))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-primary transition-all"
              />
            </div>
          )}

          {/* 알림 시간 */}
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
              🛒 브리핑 발송 시간
              <span className="text-primary text-[10px]">(쿠팡 당일배송 주문 가능)</span>
            </label>
            <div className="flex gap-2">
              {[10, 12, 14, 16].map(h => (
                <button
                  key={h}
                  onClick={() => setForm(f => ({ ...f, alertHour: h }))}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                    form.alertHour === h
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {h < 12 ? `오전 ${h}시` : `오후 ${h - 12}시`}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-primary/30"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                브리핑 생성 중...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">auto_awesome</span>
                AI 브리핑 생성
              </>
            )}
          </button>
        </section>

        {/* ── 브리핑 결과 ── */}
        {briefing && (
          <>
            {/* AI 총평 — gradient border (concierge 스타일) */}
            <section className="rounded-2xl p-[1px] bg-gradient-to-br from-primary to-cyan-400">
              <div className="rounded-2xl bg-white dark:bg-slate-900 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-primary/10 p-2 rounded-xl">
                    <span className="material-symbols-outlined text-primary text-xl">auto_awesome</span>
                  </div>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">AI 출조 총평</span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{briefing.aiSummary}</p>
                <p className="text-[11px] text-slate-400 mt-3 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">waves</span>
                  물때: {briefing.tideInfo}
                </p>
              </div>
            </section>

            {/* 채비 추천 */}
            {briefing.tackleAdvice && (
              <section className="rounded-2xl bg-white dark:bg-slate-900 shadow-md border border-slate-200 dark:border-slate-800 p-5">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-500 text-xl">manage_search</span>
                  채비 추천 — {briefing.tackleAdvice.tide}
                </h2>
                <div className="space-y-3">
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3.5">
                    <p className="text-[11px] text-slate-400 font-medium">봉돌 (텅스텐)</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{briefing.tackleAdvice.sinkerGuide.tungsten || '—'}</p>
                    <p className="text-[11px] text-slate-400 font-medium mt-2">봉돌 (납)</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{briefing.tackleAdvice.sinkerGuide.lead || '—'}</p>
                    <p className="text-[10px] text-primary mt-2">{briefing.tackleAdvice.sinkerGuide.note}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3.5">
                    <p className="text-[11px] text-slate-400 font-medium">라인</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{briefing.tackleAdvice.lineGuide.mainLine}</p>
                    {briefing.tackleAdvice.lineGuide.leader && (
                      <p className="text-xs text-slate-500 mt-1">리더: {briefing.tackleAdvice.lineGuide.leader}</p>
                    )}
                    {briefing.tackleAdvice.lineGuide.length && (
                      <p className="text-xs font-semibold text-orange-500 dark:text-orange-400 mt-0.5">최소 {briefing.tackleAdvice.lineGuide.length}</p>
                    )}
                  </div>
                  {briefing.tackleAdvice.lureGuide && (
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3.5">
                      <p className="text-[11px] text-slate-400 font-medium">루어/미끼</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                        {briefing.tackleAdvice.lureGuide.type} {briefing.tackleAdvice.lureGuide.size}
                      </p>
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {briefing.tackleAdvice.lureGuide.colors.map(c => (
                          <span key={c} className="px-2 py-0.5 bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 text-[10px] rounded-full font-medium">{c}</span>
                        ))}
                      </div>
                      <p className="text-[10px] text-primary mt-2">{briefing.tackleAdvice.lureGuide.note}</p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* 커뮤니티 조황 */}
            {briefing.communityInsights.length > 0 && (
              <section className="rounded-2xl bg-white dark:bg-slate-900 shadow-md border border-slate-200 dark:border-slate-800 p-5">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-500 text-xl">forum</span>
                  커뮤니티 조황 인사이트
                </h2>
                <div className="space-y-2">
                  {briefing.communityInsights.map((ins, i) => (
                    <a
                      key={i}
                      href={ins.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-slate-50 dark:bg-slate-800 rounded-xl p-3 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-[10px] px-2 py-0.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-full shrink-0 mt-0.5 font-semibold">{ins.source}</span>
                        <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2">{ins.title}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* 날씨 체크리스트 */}
            <section className="rounded-2xl bg-white dark:bg-slate-900 shadow-md border border-slate-200 dark:border-slate-800 p-5">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-orange-500 text-xl">checklist</span>
                날씨 체크리스트
              </h2>
              <div className="space-y-3">
                {briefing.weatherChecklist.slice(0, 8).map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-base shrink-0 mt-0.5">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold ${priorityColor(item.priority)}`}>{item.item}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{item.reason}</p>
                    </div>
                    {item.coupangQuery && (
                      <a
                        href={`https://www.coupang.com/np/search?q=${encodeURIComponent(item.coupangQuery)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 size-7 flex items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-500/20 hover:bg-orange-200 dark:hover:bg-orange-500/30 transition-colors"
                      >
                        <span className="text-sm">🛒</span>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* 기본 준비물 */}
            <section className="rounded-2xl bg-white dark:bg-slate-900 shadow-md border border-slate-200 dark:border-slate-800 p-5">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-500 text-xl">backpack</span>
                기본 준비물
              </h2>
              <div className="space-y-2.5">
                {briefing.basicChecklist.map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="size-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl shrink-0">
                      <span className="text-base">{item.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200">{item.item}</p>
                      <p className="text-[10px] text-slate-400">{item.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 장비 추천 (쿠팡) */}
            {briefing.gearSuggestions.length > 0 && (
              <section className="rounded-2xl bg-white dark:bg-slate-900 shadow-md border border-slate-200 dark:border-slate-800 p-5">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-pink-500 text-xl">shopping_bag</span>
                  추천 장비 (당일배송)
                </h2>
                <div className="space-y-2">
                  {briefing.gearSuggestions.map((g, i) => (
                    <a
                      key={i}
                      href={g.affiliateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 rounded-xl p-3 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <div className="size-10 flex items-center justify-center bg-white dark:bg-slate-700 rounded-xl shadow-sm shrink-0">
                        <span className="text-xl">{g.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{g.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{g.reason}</p>
                      </div>
                      <div className="size-8 flex items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-500/20 shrink-0">
                        <span className="material-symbols-outlined text-orange-500 dark:text-orange-400 text-base">open_in_new</span>
                      </div>
                    </a>
                  ))}
                </div>
                <p className="text-[9px] text-slate-400 text-center mt-3">
                  ※ 이 포스팅은 쿠팡 파트너스 활동의 일환으로 수수료를 제공받습니다
                </p>
              </section>
            )}

            {/* 알림 설정 */}
            <section className="rounded-2xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-500/20 p-5">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-orange-500 text-xl">notifications</span>
                브리핑 알림 설정
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
                출조 전날 {(briefing.tripPlan.alertHour ?? 14) < 12
                  ? `오전 ${briefing.tripPlan.alertHour ?? 14}시`
                  : `오후 ${(briefing.tripPlan.alertHour ?? 14) - 12}시`}에 이 브리핑을 알림으로 받습니다.
                쿠팡 당일배송 주문 가능 시간입니다.
              </p>
              <button
                onClick={handleSetAlert}
                disabled={alertSet}
                className={`w-full py-3 rounded-xl text-sm font-bold transition-all shadow-md ${
                  alertSet
                    ? 'bg-emerald-500 text-white cursor-default shadow-emerald-500/20'
                    : 'bg-orange-500 hover:bg-orange-400 text-white shadow-orange-500/20'
                }`}
              >
                {alertSet ? '✅ 알림이 설정되었습니다' : '🔔 출조 전날 알림 받기'}
              </button>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
