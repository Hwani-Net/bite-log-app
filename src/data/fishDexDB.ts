// FishDex — Korean Fishing Species Dialect Dictionary
// Sources: NIFS 국립수산과학원 어류도감, 두산백과, 낚시춘추
// dialect entries marked dialects_verified: false are community-submitted and unverified

export interface DialectEntry {
  region: string;
  name: string;
  verified: boolean; // false = community-submitted, show warning badge
}

export interface FishDexEntry {
  id: string;
  name: string; // 표준국어대사전 표준명
  nameEn: string; // English common name
  nameScientific: string; // 학명
  dialects: DialectEntry[];
  category: "saltwater" | "freshwater" | "both";
  habitat: string; // 서식지
  season: string; // 제철 (낚시)
  size: string; // 평균 크기
  methods: string[]; // 낚시 방법
  characteristics: string; // 특징
  emoji: string;
  image?: string; // 대표 이미지 URL (빈 문자열 = 없음)
}

export const FISH_DEX_DB: FishDexEntry[] = [
  {
    id: "gamseong-dom",
    name: "감성돔",
    nameEn: "Black Sea Bream",
    nameScientific: "Acanthopagrus schlegelii",
    dialects: [
      { region: "제주", name: "흑돔", verified: true },
      { region: "전남", name: "감성이", verified: true },
      { region: "경남", name: "깜돔", verified: true },
      { region: "충남", name: "깜정돔", verified: false },
    ],
    category: "saltwater",
    habitat: "연안 암초대, 항만, 방파제",
    season: "3~5월, 10~12월",
    size: "20~50cm (최대 60cm)",
    methods: ["찌낚시", "원투낚시", "루어낚시"],
    characteristics:
      "낚시인이 가장 선호하는 어종. 경계심 강하고 입질이 예민해 기술이 필요. 한겨울에도 낚이는 연중 타겟.",
    emoji: "🐟",
  },
  {
    id: "uruck",
    name: "우럭",
    nameEn: "Korean Rockfish",
    nameScientific: "Sebastes schlegelii",
    dialects: [
      { region: "전남", name: "조피볼락", verified: true },
      { region: "경남", name: "볼락우럭", verified: false },
      { region: "서해", name: "쏨뱅이", verified: false },
      { region: "제주", name: "쏨베기", verified: false },
    ],
    category: "saltwater",
    habitat: "연안 암초, 방파제, 테트라포드",
    season: "연중 (봄·가을 피크)",
    size: "25~45cm",
    methods: ["루어낚시", "원투낚시", "선상낚시"],
    characteristics:
      "국민 낚시 어종. 방파제 루어낚시의 대표 타겟. 입질이 강렬하고 마릿수 조과가 좋음.",
    emoji: "🐟",
  },
  {
    id: "doomi",
    name: "돔",
    nameEn: "Sea Bream (general)",
    nameScientific: "Sparidae spp.",
    dialects: [
      { region: "제주", name: "참돔·적돔", verified: true },
      { region: "동해", name: "도미", verified: true },
    ],
    category: "saltwater",
    habitat: "연안·근해 암초",
    season: "4~6월, 9~11월",
    size: "30~60cm",
    methods: ["선상낚시", "찌낚시"],
    characteristics: "제사상에도 올라가는 최고급 어종. 빨간 몸통이 특징.",
    emoji: "🐟",
  },
  {
    id: "norae-mi",
    name: "노래미",
    nameEn: "Fat Greenling",
    nameScientific: "Hexagrammos otakii",
    dialects: [
      { region: "동해", name: "놀래미", verified: true },
      { region: "제주", name: "독가시치", verified: false },
      { region: "경남", name: "노레미", verified: false },
      { region: "강원", name: "늘어미", verified: false },
    ],
    category: "saltwater",
    habitat: "암초, 해조류 지대",
    season: "10~2월 (겨울 호황)",
    size: "20~40cm",
    methods: ["루어낚시", "찌낚시", "원투낚시"],
    characteristics:
      "겨울 방파제 루어낚시 대표 어종. 육식성 강해 루어 반응 좋음.",
    emoji: "🐟",
  },
  {
    id: "bolrak",
    name: "볼락",
    nameEn: "Korean Rockfish (Small)",
    nameScientific: "Sebastes inermis",
    dialects: [
      { region: "제주", name: "베라", verified: false },
      { region: "경남", name: "뽈라기", verified: true },
      { region: "전남", name: "볼라기", verified: true },
      { region: "부산", name: "볼라기", verified: true },
    ],
    category: "saltwater",
    habitat: "방파제, 암초, 해조류 지대",
    season: "연중 (겨울~봄 최고)",
    size: "10~25cm",
    methods: ["라이트루어", "아지싱", "낙시"],
    characteristics:
      "야행성. 야간 방파제 라이트루어에서 마릿수 최고. 입질이 다양한 깊이에서 발생.",
    emoji: "🐟",
  },
  {
    id: "jjukkumi",
    name: "주꾸미",
    nameEn: "Webfoot Octopus",
    nameScientific: "Amphioctopus fangsiao",
    dialects: [
      { region: "전남", name: "쭈꾸미", verified: true },
      { region: "충남", name: "쭉꾸미", verified: false },
      { region: "경남", name: "죽쿠미", verified: false },
    ],
    category: "saltwater",
    habitat: "서·남해 모래바닥",
    season: "9~10월 (금어기 해제 후)",
    size: "몸통 5~10cm",
    methods: ["에기낚시", "선상낚시"],
    characteristics:
      "서해 대표 봄·가을 어종. 에기 색상은 주황·빨강이 효과적. 금어기(5~8월) 주의.",
    emoji: "🦑",
  },
  {
    id: "nakji",
    name: "낙지",
    nameEn: "Long-arm Octopus",
    nameScientific: "Octopus minor",
    dialects: [
      { region: "전남", name: "나꾸지", verified: false },
      { region: "충남", name: "낙찌", verified: false },
      { region: "제주", name: "낙찌", verified: false },
    ],
    category: "saltwater",
    habitat: "갯벌, 모래진흙 바닥",
    season: "3~5월, 9~11월",
    size: "팔 포함 20~50cm",
    methods: ["떡낚시", "루어낚시"],
    characteristics:
      "펄 갯벌에서 구멍 속에 서식. 손낚시와 갈고리 사용 전통 방식도 유명.",
    emoji: "🐙",
  },
  {
    id: "galchii",
    name: "갈치",
    nameEn: "Hairtail / Beltfish",
    nameScientific: "Trichiurus lepturus",
    dialects: [
      { region: "제주", name: "칼치", verified: true },
      { region: "전남", name: "갈치", verified: true },
      { region: "경남", name: "갈치이", verified: false },
    ],
    category: "saltwater",
    habitat: "중·근해 수심층",
    season: "8~10월",
    size: "60~120cm",
    methods: ["야간 선상낚시", "갈치채비"],
    characteristics:
      "야행성 어종. 은빛 날카로운 이빨이 특징. 제주 은갈치가 최고 품질로 유명.",
    emoji: "🐟",
  },
  {
    id: "gogi",
    name: "고등어",
    nameEn: "Pacific Chub Mackerel",
    nameScientific: "Scomber japonicus",
    dialects: [
      { region: "제주", name: "고등에", verified: false },
      { region: "경남", name: "고도리 (소형)", verified: true },
      { region: "전남", name: "고도리", verified: true },
    ],
    category: "saltwater",
    habitat: "근·원해 표층",
    season: "9~11월",
    size: "25~40cm",
    methods: ["사비키낚시", "루어낚시", "선상낚시"],
    characteristics:
      "회유성 어종. 가을 마릿수 낚시의 대명사. 사비키채비로 대량 조과 가능.",
    emoji: "🐟",
  },
  {
    id: "sungeoni",
    name: "숭어",
    nameEn: "Flathead Grey Mullet",
    nameScientific: "Mugil cephalus",
    dialects: [
      { region: "제주", name: "수어", verified: false },
      { region: "전남", name: "가숭어 (소형)", verified: true },
      { region: "경남", name: "모치 (어린것)", verified: true },
      { region: "동해", name: "밀치", verified: false },
    ],
    category: "both",
    habitat: "연안, 하구, 방파제",
    season: "10~2월",
    size: "40~70cm",
    methods: ["찌낚시", "원투낚시"],
    characteristics:
      "초식성 강해 낚기 까다롭지만 대형급 손맛이 짜릿. 겨울 방파제 인기 어종.",
    emoji: "🐟",
  },
  {
    id: "bbongjangu",
    name: "뽀나리",
    nameEn: "Japanese Amberjack (Young)",
    nameScientific: "Seriola quinqueradiata",
    dialects: [
      { region: "제주", name: "방어", verified: true },
      { region: "경남", name: "부리 (대형)", verified: true },
      { region: "전남", name: "부리", verified: false },
    ],
    category: "saltwater",
    habitat: "근·원해 표층~중층",
    season: "11~2월 (겨울 방어)",
    size: "40~100cm+ (방어 기준)",
    methods: ["지깅", "캐스팅", "선상낚시"],
    characteristics:
      "겨울 제주 방어낚시로 유명. 강한 파이팅이 매력. 지깅 루어에 공격적 반응.",
    emoji: "🐟",
  },
  {
    id: "chamdom",
    name: "참돔",
    nameEn: "Red Sea Bream",
    nameScientific: "Pagrus major",
    dialects: [
      { region: "제주", name: "적돔", verified: true },
      { region: "경남", name: "도미", verified: true },
      { region: "전남", name: "도미·참도미", verified: true },
    ],
    category: "saltwater",
    habitat: "근해 암초, 모래자갈 바닥",
    season: "4~6월, 9~11월",
    size: "30~60cm",
    methods: ["타이라바", "선상찌낚시", "지깅"],
    characteristics:
      "최고급 낚시 타겟. 타이라바 루어로 공략하는 것이 현대적 방법. 붉은 몸통과 파란 반점이 특징.",
    emoji: "🐟",
  },
  {
    id: "luju-gurami",
    name: "쥐치",
    nameEn: "Filefish",
    nameScientific: "Stephanolepis cirrhifer",
    dialects: [
      { region: "제주", name: "객주리", verified: true },
      { region: "경남", name: "쥐포어 (건조품)", verified: false },
      { region: "전남", name: "쥐포 (건조품)", verified: false },
    ],
    category: "saltwater",
    habitat: "연안, 해조류 지대",
    season: "9~11월",
    size: "20~35cm",
    methods: ["찌낚시", "원투낚시"],
    characteristics:
      "쥐포의 원재료. 껍질이 거칠어 줄칼 같은 느낌. 채비를 자주 끊어 낚시인들에게 악명 높음.",
    emoji: "🐟",
  },
  {
    id: "jangeou",
    name: "장어",
    nameEn: "Japanese Eel",
    nameScientific: "Anguilla japonica",
    dialects: [
      { region: "전남", name: "뱀장어", verified: true },
      { region: "제주", name: "구들장어", verified: false },
      { region: "경남", name: "민장어", verified: false },
    ],
    category: "both",
    habitat: "강 하류, 하구, 강어귀",
    season: "5~9월",
    size: "40~80cm",
    methods: ["원투낚시", "야간낚시"],
    characteristics:
      "야행성 어종. 강과 바다를 오가는 회유어. 낚시 후 반드시 물기 없는 장갑 착용 필요.",
    emoji: "🐍",
  },
  {
    id: "gopchang-eo",
    name: "붕어",
    nameEn: "Crucian Carp",
    nameScientific: "Carassius auratus",
    dialects: [
      { region: "경남", name: "붕에", verified: false },
      { region: "경북", name: "붕장어 (혼용 주의)", verified: false },
      { region: "충청", name: "뻔대", verified: false },
    ],
    category: "freshwater",
    habitat: "저수지, 하천, 호수",
    season: "봄(3~5월), 가을(9~11월)",
    size: "15~35cm",
    methods: ["찌낚시"],
    characteristics:
      "민물낚시의 대명사. 예민한 입질과 기다림의 미학. 보리떡, 글루텐 미끼가 효과적.",
    emoji: "🐟",
  },
  {
    id: "bagsuri",
    name: "배스",
    nameEn: "Largemouth Bass",
    nameScientific: "Micropterus salmoides",
    dialects: [{ region: "전국", name: "큰입우럭 (표준명)", verified: true }],
    category: "freshwater",
    habitat: "저수지, 댐, 강",
    season: "봄 산란기(4~6월), 가을",
    size: "25~50cm",
    methods: ["루어낚시 (지그헤드, 웜, 크랭크베이트)"],
    characteristics:
      "루어낚시의 최고 인기 어종. 공격적 포식자로 다양한 루어에 반응. 외래종으로 도입된 이후 전국 확산.",
    emoji: "🐟",
  },
  {
    id: "ssogari",
    name: "쏘가리",
    nameEn: "Mandarin Fish",
    nameScientific: "Siniperca scherzeri",
    dialects: [
      { region: "경북", name: "궐어", verified: true },
      { region: "충청", name: "쏘갱이", verified: false },
      { region: "강원", name: "쏘가리", verified: true },
    ],
    category: "freshwater",
    habitat: "맑은 강, 여울",
    season: "5~7월",
    size: "25~50cm",
    methods: ["루어낚시 (미노우, 지그)", "견지낚시"],
    characteristics:
      "민물루어낚시 최고급 타겟. 맑고 빠른 물에서 서식. 표범 무늬 몸통이 아름다움.",
    emoji: "🐟",
  },
  {
    id: "nongeo",
    name: "농어",
    nameEn: "Japanese Sea Bass",
    nameScientific: "Lateolabrax japonicus",
    dialects: [
      { region: "전남", name: "깔다구 (소형)", verified: false },
      { region: "경남", name: "까지배미 (소형)", verified: false },
      { region: "제주", name: "놀래기", verified: false },
      { region: "부산", name: "꺼먹이", verified: false },
    ],
    category: "both",
    habitat: "연안, 하구, 방파제",
    season: "6~9월 (여름)",
    size: "40~80cm",
    methods: ["루어낚시", "찌낚시", "원투낚시"],
    characteristics:
      "서핑낚시의 대명사. 파도치는 서핑 포인트에서 미노우 루어로 공략. 강한 파이팅 일품.",
    emoji: "🐟",
  },
  {
    id: "gajami",
    name: "가자미",
    nameEn: "Flatfish / Flounder",
    nameScientific: "Limanda yokohamae",
    dialects: [
      { region: "동해", name: "문치가자미", verified: true },
      { region: "경남", name: "도다리", verified: true },
      { region: "전남", name: "참가자미", verified: true },
      { region: "서해", name: "넙치가자미", verified: false },
    ],
    category: "saltwater",
    habitat: "모래·진흙 바닥",
    season: "봄(3~5월), 가을(9~11월)",
    size: "20~40cm",
    methods: ["원투낚시", "선상낚시"],
    characteristics:
      "도다리쑥국으로 유명한 봄 식재료. 납작한 몸체가 특징. 원투낚시로 모래바닥 공략.",
    emoji: "🐟",
  },
  {
    id: "gwangeo",
    name: "광어",
    nameEn: "Olive Flounder",
    nameScientific: "Paralichthys olivaceus",
    dialects: [
      { region: "제주", name: "광어 (표준화 됨)", verified: true },
      { region: "일부 남해", name: "넙치", verified: true },
    ],
    category: "saltwater",
    habitat: "모래·자갈 바닥, 근해",
    season: "10~3월 (겨울)",
    size: "40~80cm",
    methods: ["루어낚시", "선상낚시"],
    characteristics:
      "양식이 대중화된 고급 어종. 자연산은 낚시 마니아의 꿈의 타겟. 지깅·루어 채비에 반응.",
    emoji: "🐟",
  },
  {
    id: "godeungo",
    name: "삼치",
    nameEn: "Japanese Spanish Mackerel",
    nameScientific: "Scomberomorus niphonius",
    dialects: [
      { region: "경남", name: "삼칫이", verified: false },
      { region: "전남", name: "삼채", verified: false },
      { region: "제주", name: "삼치", verified: true },
    ],
    category: "saltwater",
    habitat: "표층~중층 근해",
    season: "10~12월",
    size: "50~100cm",
    methods: ["트롤링", "캐스팅 루어", "선상낚시"],
    characteristics:
      "날카로운 이빨과 엄청난 스피드. 메탈지그·미노우에 맹렬 공격. 가을 루어낚시 최고 흥미 어종.",
    emoji: "🐟",
  },
  {
    id: "ojingoe",
    name: "오징어",
    nameEn: "Japanese Flying Squid",
    nameScientific: "Todarodes pacificus",
    dialects: [
      { region: "동해", name: "오징어", verified: true },
      { region: "경남", name: "오지", verified: false },
      { region: "제주", name: "한치 (별종)", verified: true },
    ],
    category: "saltwater",
    habitat: "동해 연·근해 표층",
    season: "6~10월",
    size: "몸통 15~30cm",
    methods: ["에기낚시", "야간 집어등 낚시"],
    characteristics:
      "야간 집어등에 모이는 특성 활용. 에기 (에기=인공미끼) 에 오포적 반응. 동해 여름의 꽃.",
    emoji: "🦑",
  },
  {
    id: "gae-sangeo",
    name: "참게",
    nameEn: "Chinese Mitten Crab",
    nameScientific: "Eriocheir sinensis",
    dialects: [
      { region: "경기", name: "참갱이", verified: false },
      { region: "충남", name: "게", verified: false },
    ],
    category: "both",
    habitat: "강 하류, 하구",
    season: "9~10월",
    size: "갑폭 5~8cm",
    methods: ["통발", "자망"],
    characteristics:
      "특유의 단맛으로 인기. 산란을 위해 바다로 이동하는 가을에 포획 최적.",
    emoji: "🦀",
  },
  {
    id: "jeonbog",
    name: "전복",
    nameEn: "Abalone",
    nameScientific: "Haliotis discus",
    dialects: [
      { region: "제주", name: "전복·복", verified: true },
      { region: "전남", name: "전복이", verified: false },
    ],
    category: "saltwater",
    habitat: "암초, 해조류 지대",
    season: "연중",
    size: "껍데기 길이 8~15cm",
    methods: ["해녀 채취 (낚시 대상 아님)"],
    characteristics:
      "최고급 해산물. 낚시보다는 해녀 채취가 주요 방법. 양식 확대로 가격 안정.",
    emoji: "🐚",
  },
  {
    id: "haeryongeo",
    name: "해룡어",
    nameEn: "Hairtail",
    nameScientific: "Trichiurus japonicus",
    dialects: [{ region: "제주", name: "갈치이", verified: false }],
    category: "saltwater",
    habitat: "중·심층",
    season: "여름~가을",
    size: "50~100cm",
    methods: ["선상낚시"],
    characteristics: "갈치와 유사하지만 별종. 심층 선상낚시 타겟.",
    emoji: "🐟",
  },
  {
    id: "honge",
    name: "홍어",
    nameEn: "Big Skate",
    nameScientific: "Raja pulchra",
    dialects: [
      { region: "전남 목포", name: "홍에", verified: false },
      { region: "충남", name: "홍에", verified: false },
    ],
    category: "saltwater",
    habitat: "모래·진흙 바닥",
    season: "겨울",
    size: "60~120cm (날개폭)",
    methods: ["원투낚시", "선상낚시"],
    characteristics:
      "전남 흑산도 홍어가 최고급. 발효식품으로도 유명. 바닥 긁는 독특한 채비 필요.",
    emoji: "🐟",
  },
  {
    id: "mangdungi",
    name: "망둑어",
    nameEn: "Goby",
    nameScientific: "Acanthogobius flavimanus",
    dialects: [
      { region: "서해", name: "문절망둑", verified: true },
      { region: "전남", name: "망구·망두기", verified: true },
      { region: "경남", name: "문절이", verified: false },
      { region: "충남", name: "망둘", verified: false },
    ],
    category: "both",
    habitat: "갯벌, 강 하구, 연안",
    season: "4~6월, 10~11월",
    size: "10~25cm",
    methods: ["갯벌낚시", "루어낚시"],
    characteristics:
      "갯벌의 불청객이자 입문자 낚시 어종. 갯지렁이 미끼에 잘 낚임. 체험낚시에 적합.",
    emoji: "🐟",
  },
  {
    id: "peorak",
    name: "펄떡이",
    nameEn: "Yellowfin Goby",
    nameScientific: "Acanthogobius hasta",
    dialects: [
      { region: "서해", name: "줄망둑", verified: false },
      { region: "경기", name: "꼬시래기", verified: false },
    ],
    category: "saltwater",
    habitat: "갯벌, 얕은 연안",
    season: "봄·가을",
    size: "15~25cm",
    methods: ["원투낚시", "갯벌낚시"],
    characteristics: "입문자도 쉽게 낚을 수 있는 어종. 갯지렁이 미끼 효과적.",
    emoji: "🐟",
  },
  {
    id: "isong-eo",
    name: "이성어",
    nameEn: "Japanese Amberjack",
    nameScientific: "Seriola lalandi",
    dialects: [
      { region: "제주", name: "잿방어", verified: true },
      { region: "경남", name: "잿방어", verified: true },
    ],
    category: "saltwater",
    habitat: "근·원해 중층",
    season: "11~2월",
    size: "60~120cm",
    methods: ["지깅", "캐스팅", "선상낚시"],
    characteristics:
      "방어와 함께 겨울 제주 지깅의 최고 타겟. 강한 파이팅과 빠른 달림새가 특징.",
    emoji: "🐟",
  },
  {
    id: "jomi",
    name: "조피볼락",
    nameEn: "Korean Rockfish",
    nameScientific: "Sebastes schlegelii",
    dialects: [
      { region: "경남·부산", name: "우럭", verified: true },
      { region: "강원", name: "우럭", verified: true },
      { region: "제주", name: "뽈락", verified: false },
    ],
    category: "saltwater",
    habitat: "암초, 방파제 테트라포드",
    season: "연중",
    size: "25~45cm",
    methods: ["루어낚시", "생미끼 낚시"],
    characteristics:
      "'우럭'이 정식 표준어가 아님. 표준명은 조피볼락. 입질 강하고 다양한 수심에서 낚임.",
    emoji: "🐟",
  },
  {
    id: "jirimi-eo",
    name: "쥐노래미",
    nameEn: "Greenling",
    nameScientific: "Hexagrammos agrammus",
    dialects: [
      { region: "동해", name: "개선장어", verified: false },
      { region: "경북", name: "쥐치 (혼용 주의)", verified: false },
    ],
    category: "saltwater",
    habitat: "암초, 해조류 지대",
    season: "10~2월",
    size: "15~30cm",
    methods: ["루어낚시", "낙시"],
    characteristics: "노래미와 유사하지만 소형. 겨울 라이트루어에 잘 낚임.",
    emoji: "🐟",
  },
];

// Community submission type (for Firestore saving)
export interface DialectSubmission {
  fishId: string;
  fishName: string;
  region: string;
  dialectName: string;
  submitterNote?: string;
  createdAt: number;
  status: "pending" | "verified" | "rejected";
}

export function searchFishDex(query: string): FishDexEntry[] {
  if (!query.trim()) return FISH_DEX_DB;
  const q = query.toLowerCase();
  return FISH_DEX_DB.filter((fish) => {
    if (fish.name.includes(q)) return true;
    if (fish.nameEn.toLowerCase().includes(q)) return true;
    if (fish.dialects.some((d) => d.name.includes(q) || d.region.includes(q)))
      return true;
    if (fish.methods.some((m) => m.includes(q))) return true;
    return false;
  });
}

export function getFishById(id: string): FishDexEntry | undefined {
  return FISH_DEX_DB.find((f) => f.id === id);
}
