"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Anchor,
  ArrowLeft,
  Fish,
  Users,
  Calendar,
  MapPin,
  CheckSquare,
  ChevronRight,
  Star,
} from "lucide-react";

// @mock-data — 월별 추천 낚시 포인트 (계절 어종 기반)
const MONTHLY_SPOTS: Record<
  number,
  { species: string; location: string; region: string; tip: string }
> = {
  1: {
    species: "볼락",
    location: "포항 구룡포",
    region: "동해",
    tip: "야간 선상낚시 최적기. 수온 낮아 대형급 출현.",
  },
  2: {
    species: "우럭",
    location: "인천 굴업도",
    region: "서해",
    tip: "서해 최대 우럭 포인트. 2월 조황 최상급.",
  },
  3: {
    species: "삼치",
    location: "여수 거문도",
    region: "남해",
    tip: "봄 삼치 시즌 개막. 루어낚시 입질 폭발.",
  },
  4: {
    species: "감성돔",
    location: "통영 한산도",
    region: "남해",
    tip: "4월 수온 상승으로 감성돔 갯바위 입질 활발.",
  },
  5: {
    species: "참돔",
    location: "제주 우도",
    region: "제주",
    tip: "참돔 선상낚시 최성기. 타이라바 효과적.",
  },
  6: {
    species: "광어",
    location: "강릉 주문진",
    region: "동해",
    tip: "여름 광어 시즌 시작. 선상 생미끼 추천.",
  },
  7: {
    species: "방어",
    location: "울릉도",
    region: "동해",
    tip: "여름 방어 떼낚시. 대형 지깅 준비 필수.",
  },
  8: {
    species: "농어",
    location: "서천 무창포",
    region: "서해",
    tip: "방파제·갯바위 농어 최성기. 야간 입질 집중.",
  },
  9: {
    species: "전어",
    location: "군산 선유도",
    region: "서해",
    tip: "9월 전어 씨알 최대. 망 낚시·훌치기 효과적.",
  },
  10: {
    species: "갈치",
    location: "제주 모슬포",
    region: "제주",
    tip: "제주 갈치 선상 최성기. 야간 집어등 필수.",
  },
  11: {
    species: "대구",
    location: "진해만",
    region: "남해",
    tip: "11월 대구 시즌 개막. 저수온 포인트 집중.",
  },
  12: {
    species: "도루묵",
    location: "속초 청초호",
    region: "동해",
    tip: "겨울 도루묵 산란기. 방파제 손쉽게 마릿수.",
  },
};

const SPECIES_OPTIONS = [
  "감성돔",
  "참돔",
  "광어",
  "우럭",
  "볼락",
  "농어",
  "방어",
  "삼치",
  "갈치",
  "기타",
];

const CHECKLIST_BASE = [
  "낚시 라이선스 / 신분증",
  "멀미약 (출항 30분 전 복용)",
  "구명조끼",
  "방수 의류 / 장갑",
  "아이스박스 (어획물 보관)",
  "간식 및 음료",
  "자외선 차단제",
];

const SPECIES_CHECKLIST: Record<string, string[]> = {
  감성돔: ["갯바위화 또는 안전화", "밑밥 (크릴)", "찌낚시 채비"],
  참돔: ["타이라바 채비 (80-150g)", "PE라인 0.8-1.5호", "전동릴 권장"],
  광어: ["생미끼 (우럭·도다리)", "50-80g 봉돌", "목줄 형광 0.5m"],
  우럭: ["지그헤드 / 웜", "스피닝릴", "형광 집어제"],
  볼락: ["소형 루어 (2-3인치 웜)", "라이트 로드", "헤드랜턴 (야간)"],
  농어: ["미노우·팝퍼 루어", "PE라인 1-1.5호", "리더 30-40lb"],
  방어: ["고중량 지그 (150-250g)", "전동릴 또는 파워릴", "대형 훅"],
  삼치: ["메탈지그 40-80g", "빠른 리트리브용 릴", "와이어 리더"],
  갈치: ["선상 갈치 전용 채비", "집어등 (야간)", "야광 가짜미끼"],
  기타: ["범용 스피닝 또는 베이트릴", "다목적 루어 세트"],
};

interface BookingPlatform {
  id: string;
  name: string;
  description: string;
  url: string;
  regions: string[];
  features: string[];
  accent: string;
}

const PLATFORMS: BookingPlatform[] = [
  {
    id: "sunsang24",
    name: "선상24",
    description: "전국 실시간 선상낚시 예약 플랫폼",
    url: "https://www.sunsang24.com/",
    regions: ["전국", "동해", "서해", "남해", "제주"],
    features: ["실시간 예약", "조황 정보", "낚싯배 비교"],
    accent: "bg-blue-500/15 border-blue-500/30 text-blue-400",
  },
  {
    id: "thefishing",
    name: "더피싱",
    description: "배낚시·선상낚시 실시간 예약",
    url: "https://thefishing.kr/",
    regions: ["전국", "동해", "서해", "남해"],
    features: ["긴급모집", "출조버스", "낚시대회"],
    accent: "bg-orange-500/15 border-orange-500/30 text-orange-400",
  },
  {
    id: "naksiga",
    name: "낚시가",
    description: "방파제·갯바위·선상 종합 예약",
    url: "https://www.naksiga.com/",
    regions: ["전국", "서해", "남해"],
    features: ["포인트 리뷰", "가격 비교", "초보 가이드"],
    accent: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
  },
  {
    id: "fishingcamp",
    name: "피싱캠프",
    description: "낚시 패키지·체험·캠핑 예약",
    url: "https://www.fishingcamp.co.kr/",
    regions: ["전국", "남해", "제주"],
    features: ["패키지 상품", "가족 체험", "장비 렌탈"],
    accent: "bg-violet-500/15 border-violet-500/30 text-violet-400",
  },
];

export default function BookingPage() {
  const currentMonth = new Date().getMonth() + 1;
  const spotOfMonth = MONTHLY_SPOTS[currentMonth];

  const [selectedSpecies, setSelectedSpecies] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedParty, setSelectedParty] = useState<number>(2);
  const [showResult, setShowResult] = useState(false);

  const checklist = selectedSpecies
    ? [
        ...CHECKLIST_BASE,
        ...(SPECIES_CHECKLIST[selectedSpecies] ?? SPECIES_CHECKLIST["기타"]),
      ]
    : CHECKLIST_BASE;

  const handleGenerate = () => {
    if (!selectedSpecies) return;
    setShowResult(true);
  };

  const handleReset = () => {
    setShowResult(false);
    setSelectedSpecies("");
    setSelectedDate("");
    setSelectedParty(2);
  };

  return (
    <div className="bg-[#080d14] text-white min-h-dvh min-h-screen page-enter">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-white/40 mb-4 hover:text-white/70 transition-colors"
        >
          <ArrowLeft size={14} />
          홈으로
        </Link>
        <h1 className="text-2xl font-bold text-white mb-1">낚시 예약</h1>
        <p className="text-sm text-white/40">
          어시스턴트로 준비물을 확인하고 플랫폼으로 예약하세요
        </p>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-6 pb-24">
        {/* Monthly Highlight */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#c9a84c]/20 via-[#0f141b] to-[#7dd3fc]/10 border border-[#c9a84c]/30 p-5">
          <div className="absolute -right-4 -top-4 opacity-10">
            <Star size={80} className="text-[#c9a84c]" />
          </div>
          <p className="text-[10px] font-semibold text-[#c9a84c]/70 uppercase tracking-[0.2em] mb-1">
            {currentMonth}월 추천 포인트
          </p>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-[#c9a84c] mb-0.5">
                {spotOfMonth.species}
              </h2>
              <div className="flex items-center gap-1 text-xs text-white/70 mb-2">
                <MapPin size={12} className="text-[#c9a84c]" />
                {spotOfMonth.location}
                <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-white/50 text-[10px] ml-1">
                  {spotOfMonth.region}
                </span>
              </div>
              <p className="text-xs text-white/60 leading-relaxed max-w-[220px]">
                {spotOfMonth.tip}
              </p>
            </div>
            <div className="shrink-0 size-14 rounded-xl bg-[#c9a84c]/10 border border-[#c9a84c]/20 flex items-center justify-center">
              <Fish size={28} className="text-[#c9a84c]" />
            </div>
          </div>
        </section>

        {/* Assistant */}
        <section className="glass-morphism border border-white/5 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white/70 uppercase tracking-[0.15em] mb-4 flex items-center gap-2">
            <CheckSquare size={15} className="text-[#c9a84c]" />
            낚시 예약 어시스턴트
          </h3>

          {!showResult ? (
            <div className="space-y-4">
              {/* Species */}
              <div>
                <label className="block text-xs text-white/50 mb-2 font-medium">
                  목표 어종
                </label>
                <div className="flex flex-wrap gap-2">
                  {SPECIES_OPTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedSpecies(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        selectedSpecies === s
                          ? "bg-[#c9a84c] text-[#080d14] border-[#c9a84c]"
                          : "bg-white/5 text-white/60 border-white/10 hover:border-white/30"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs text-white/50 mb-2 font-medium">
                  <Calendar size={12} className="inline mr-1 text-[#c9a84c]" />
                  예정 날짜
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#c9a84c]/50 transition-colors"
                  min={new Date().toISOString().slice(0, 10)}
                />
              </div>

              {/* Party size */}
              <div>
                <label className="block text-xs text-white/50 mb-2 font-medium">
                  <Users size={12} className="inline mr-1 text-[#c9a84c]" />
                  인원
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedParty((p) => Math.max(1, p - 1))}
                    className="size-9 rounded-lg bg-white/5 border border-white/10 text-white/60 font-bold flex items-center justify-center hover:bg-white/10 transition-colors"
                  >
                    -
                  </button>
                  <span className="text-lg font-bold text-white w-8 text-center">
                    {selectedParty}
                  </span>
                  <button
                    onClick={() => setSelectedParty((p) => Math.min(20, p + 1))}
                    className="size-9 rounded-lg bg-white/5 border border-white/10 text-white/60 font-bold flex items-center justify-center hover:bg-white/10 transition-colors"
                  >
                    +
                  </button>
                  <span className="text-xs text-white/40 ml-1">명</span>
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={!selectedSpecies}
                className="w-full py-3 rounded-xl bg-[#c9a84c] text-[#080d14] font-bold text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-110 transition-all"
              >
                준비물 체크리스트 생성
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex items-center gap-3 p-3 bg-[#c9a84c]/10 border border-[#c9a84c]/20 rounded-xl">
                <Fish size={18} className="text-[#c9a84c] shrink-0" />
                <div className="text-sm text-white font-semibold">
                  {selectedSpecies} 낚시
                  {selectedDate && (
                    <span className="ml-2 text-white/50 font-normal text-xs">
                      {selectedDate}
                    </span>
                  )}
                  <span className="ml-2 text-white/50 font-normal text-xs">
                    {selectedParty}명
                  </span>
                </div>
              </div>

              {/* Checklist */}
              <div className="space-y-2">
                <p className="text-xs text-white/40 font-medium uppercase tracking-[0.15em]">
                  준비물 체크리스트
                </p>
                {checklist.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-white/3 border border-white/5"
                  >
                    <div
                      className={`size-4 rounded flex items-center justify-center shrink-0 ${
                        i < CHECKLIST_BASE.length
                          ? "bg-white/10"
                          : "bg-[#c9a84c]/20 border border-[#c9a84c]/30"
                      }`}
                    />
                    <span className="text-xs text-white/70">{item}</span>
                    {i >= CHECKLIST_BASE.length && (
                      <span className="ml-auto text-[10px] text-[#c9a84c] font-semibold shrink-0">
                        {selectedSpecies}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Tip: recommended spot */}
              {spotOfMonth.species === selectedSpecies && (
                <div className="p-3 bg-[#7dd3fc]/10 border border-[#7dd3fc]/20 rounded-xl">
                  <p className="text-xs font-semibold text-[#7dd3fc] mb-0.5">
                    이달의 추천 포인트
                  </p>
                  <p className="text-xs text-white/60">
                    {spotOfMonth.location} — {spotOfMonth.tip}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 text-sm font-semibold hover:bg-white/5 transition-colors"
                >
                  다시 선택
                </button>
                <a
                  href={PLATFORMS[0].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 rounded-xl bg-[#c9a84c] text-[#080d14] text-sm font-bold text-center hover:brightness-110 transition-all"
                >
                  예약하러 가기
                </a>
              </div>
            </div>
          )}
        </section>

        {/* Platform Cards */}
        <div className="space-y-3">
          <h3 className="text-xs text-white/40 font-semibold uppercase tracking-[0.15em] px-1">
            검증된 예약 플랫폼
          </h3>
          {PLATFORMS.map((platform, i) => (
            <a
              key={platform.id}
              href={platform.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 bg-white/3 border border-white/8 rounded-2xl p-4 hover:bg-white/6 hover:border-white/15 transition-all group"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div
                className={`size-11 rounded-xl border flex items-center justify-center shrink-0 ${platform.accent}`}
              >
                <Anchor size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-white mb-0.5">
                  {platform.name}
                </h4>
                <p className="text-xs text-white/50 truncate mb-1.5">
                  {platform.description}
                </p>
                <div className="flex gap-1 flex-wrap">
                  {platform.features.map((f) => (
                    <span
                      key={f}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/40 border border-white/8"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
              <ChevronRight
                size={16}
                className="text-white/20 group-hover:text-white/50 transition-colors shrink-0"
              />
            </a>
          ))}
        </div>

        {/* Coming Soon */}
        <div className="border border-white/8 rounded-2xl p-5 text-center bg-white/2">
          <Anchor size={28} className="mx-auto mb-2 text-white/20" />
          <h3 className="text-xs font-bold text-white/40 mb-1">
            BITE Log 자체 예약 시스템 준비 중
          </h3>
          <p className="text-[10px] text-white/20">
            곧 BITE Log 안에서 바로 예약할 수 있습니다
          </p>
        </div>
      </div>
    </div>
  );
}
