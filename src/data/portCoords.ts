// 더피싱 areaPath 마지막 세그먼트 표기 그대로의 출항지 좌표 테이블.
// 2026-08-28 더피싱 목록 4개 권역 페이지에서 실제로 나온 항구를 수집해
// OSM Nominatim으로 지오코딩(항구 지물 우선, 안 잡히는 6곳은 소재지 리
// 단위 근사 — 거리순 정렬 용도라 ±1km 오차는 무해). 거리 계산·정렬
// 및 인근 조석예보 지점 선택 용도이며 항해용 정밀 좌표가 아니다.
// regionCode는 더피싱 권역 코드. 검색 캐시가 비어도 알려진 항구를 선택할 수 있다.
// 테이블에 없는 항구의 배는
// portDistance.ts가 정렬 끝으로 보낼 뿐 숨기지 않으므로, 새 항구가
// 등장하면 여기 한 줄 추가하면 된다.
// 좌표 출처: © OpenStreetMap contributors (ODbL), Nominatim 2026-08-28.
//
// `within`: 전국에 동명 항구가 있는 이름의 오인 방지 — areaPath에 이
// 문자열이 없으면 매칭하지 않는다(미등록과 같은 취급 = 정렬 끝, 엉뚱한
// 거리보다 안전). 이름이 사실상 유일한 항구엔 붙이지 않는다.

export const PORT_COORDS: Record<
  string,
  { lat: number; lng: number; regionCode: "1" | "2" | "3" | "130"; within?: string }
> = {
  // 서해권 — 경기·인천
  "영흥도 진두항": { lat: 37.2521, lng: 126.4985, regionCode: "1" },
  거잠포: { lat: 37.4226, lng: 126.4244, regionCode: "1" },
  연안부두: { lat: 37.4527, lng: 126.6292, regionCode: "1" },
  오이도: { lat: 37.3619, lng: 126.7385, regionCode: "1" },
  인천남항: { lat: 37.4534, lng: 126.6158, regionCode: "1" },
  평택항: { lat: 36.9701, lng: 126.8474, regionCode: "1" },
  전곡항: { lat: 37.1877, lng: 126.6508, regionCode: "1" },
  탄도항: { lat: 37.1921, lng: 126.6431, regionCode: "1" },
  // 서해권 — 충남
  왜목항: { lat: 37.0487, lng: 126.5286, regionCode: "1" },
  장고항: { lat: 37.0213, lng: 126.5547, regionCode: "1" },
  삼길포: { lat: 37.0043, lng: 126.4533, regionCode: "1" },
  대천항: { lat: 36.3304, lng: 126.5104, regionCode: "1" },
  무창포항: { lat: 36.2489, lng: 126.5371, regionCode: "1" },
  오천항: { lat: 36.4396, lng: 126.5194, regionCode: "1" },
  회변항: { lat: 36.4326, lng: 126.5008, regionCode: "1" },
  홍원항: { lat: 36.157, lng: 126.5238, regionCode: "1", within: "서천" }, // 도둔리 근사
  대야도항: { lat: 36.4741, lng: 126.3804, regionCode: "1" }, // 중장리 근사
  마검포항: { lat: 36.6215, lng: 126.2843, regionCode: "1" },
  백사장항: { lat: 36.5854, lng: 126.348, regionCode: "1" }, // 창기리 근사
  방포항: { lat: 36.505, lng: 126.3368, regionCode: "1" },
  영목항: { lat: 36.3988, lng: 126.4269, regionCode: "1" },
  // 부안 모항 등 동명이 흔한 이름 — 태안 경로에서만 매칭.
  모항: { lat: 36.773, lng: 126.1384, regionCode: "1", within: "태안" }, // 태안 모항리 근사
  신진도항: { lat: 36.6772, lng: 126.1447, regionCode: "1" },
  안흥항: { lat: 36.6919, lng: 126.1675, regionCode: "1" }, // 정죽리 근사
  // 서해권 — 전북
  비응항: { lat: 35.9355, lng: 126.5262, regionCode: "1" },
  // 남해권
  서망항: { lat: 34.3655, lng: 126.1358, regionCode: "3", within: "진도" },
  삼천포항: { lat: 34.9355, lng: 128.0825, regionCode: "3" },
  팔포항: { lat: 34.9282, lng: 128.0785, regionCode: "3" },
  회진항: { lat: 34.4822, lng: 126.9296, regionCode: "3", within: "장흥" }, // 회진리 근사
  녹동항: { lat: 34.5257, lng: 127.135, regionCode: "3" },
  외나로도: { lat: 34.4441, lng: 127.5086, regionCode: "3" },
  여수항: { lat: 34.7391, lng: 127.7512, regionCode: "3" },
  // 제주
  제주항: { lat: 33.5245, lng: 126.5449, regionCode: "130" },
  제주신창항: { lat: 33.3485, lng: 126.1787, regionCode: "130" },
};
