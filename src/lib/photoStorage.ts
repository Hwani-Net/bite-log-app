// 5차 GOAL-3 — 사진 저장. 지금까지 사진은 base64로 Firestore 문서에
// 통째로 들어가서, 3장이면 1MiB 문서 한계를 넘겨 저장이 실패할 수 있는
// 실손실 리스크였다. 로그인 사용자는 압축 후 Storage에 올리고 URL만
// 저장한다. 비로그인·업로드 실패는 기존 base64 경로로 폴백(오프라인 큐
// 포함) — 기록을 잃는 것보다 무거운 사진이 낫다.
import { getFirebaseStorage, getFirebaseAuth } from "@/lib/firebase";

export const MAX_EDGE = 1600;
export const JPEG_QUALITY = 0.8;

/** 이미 원격 URL인가(옛 base64 기록과 섞여도 그대로 렌더되게). */
export function isRemotePhoto(src: string): boolean {
  return /^https?:\/\//.test(src);
}

/**
 * dataURL → 긴 변 MAX_EDGE 이하의 JPEG dataURL. 캔버스가 없는 환경
 * (SSR·테스트)이나 디코드 실패면 원본을 그대로 돌려준다 — 압축은
 * 최적화지 필수 경로가 아니다.
 */
export async function compressDataUrl(
  dataUrl: string,
  maxEdge = MAX_EDGE,
  quality = JPEG_QUALITY,
): Promise<string> {
  if (typeof document === "undefined" || !dataUrl.startsWith("data:")) {
    return dataUrl;
  }
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = dataUrl;
    });
    const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
    if (scale === 1 && dataUrl.startsWith("data:image/jpeg")) return dataUrl;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const out = canvas.toDataURL("image/jpeg", quality);
    // 압축이 되레 커지면(작은 PNG 등) 원본 유지.
    return out.length < dataUrl.length ? out : dataUrl;
  } catch {
    return dataUrl;
  }
}

/** dataURL → Blob (Storage 업로드용). */
export function dataUrlToBlob(dataUrl: string): Blob | null {
  const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
  if (!match) return null;
  const [, mime, b64] = match;
  const bytes = atob(b64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

// 인라인(base64)으로 남는 사진의 총량 예산. Firestore 문서 한계는
// 1MiB이고 나머지 필드·오버헤드가 있으니 여유를 둔다. 실측(2026-08-28):
// 3000×2250 사진 한 장이 원본 5.9MB → 1600px/0.8에서 782KB라, 3장이면
// 여전히 한계를 넘는다. Storage 업로드가 가능해지면 이 경로 자체를 타지
// 않는다(그때는 URL만 저장).
export const INLINE_BUDGET_BYTES = 900 * 1024;
const FALLBACK_STEPS: { edge: number; quality: number }[] = [
  { edge: 1600, quality: 0.8 },
  { edge: 1280, quality: 0.7 },
  { edge: 1024, quality: 0.6 },
  { edge: 800, quality: 0.5 },
];

/**
 * 사진 배열을 저장 가능한 형태로. 로그인 + Storage 사용 가능하면
 * 압축→업로드→URL, 아니면 압축된 base64로 폴백하되 **총량이 예산을
 * 넘으면 단계적으로 더 줄인다** — 사진 화질보다 기록 자체를 지키는 게
 * 우선이다(사진을 조용히 버리지는 않는다).
 * 이미 원격 URL인 항목은 건드리지 않는다(편집 저장 시 재업로드 방지).
 */
export async function preparePhotosForSave(
  photos: string[],
): Promise<string[]> {
  const out: string[] = [];
  const inlineIdx: number[] = [];
  for (const photo of photos) {
    if (isRemotePhoto(photo)) {
      out.push(photo);
      continue;
    }
    const compressed = await compressDataUrl(photo);
    const url = await uploadPhoto(compressed);
    if (url) {
      out.push(url);
    } else {
      inlineIdx.push(out.length);
      out.push(compressed);
    }
  }
  if (inlineIdx.length === 0) return out;

  // 인라인으로 남은 것만 예산 안에 들어오게 단계적으로 더 압축.
  const inlineBytes = () =>
    inlineIdx.reduce((sum, i) => sum + out[i].length, 0);
  for (let step = 1; step < FALLBACK_STEPS.length; step++) {
    if (inlineBytes() <= INLINE_BUDGET_BYTES) break;
    const { edge, quality } = FALLBACK_STEPS[step];
    for (const i of inlineIdx) {
      out[i] = await compressDataUrl(out[i], edge, quality);
    }
  }
  return out;
}

/** 업로드 성공 시 다운로드 URL, 불가·실패면 null(호출측이 폴백). */
async function uploadPhoto(dataUrl: string): Promise<string | null> {
  const uid = getFirebaseAuth()?.currentUser?.uid;
  const storage = await getFirebaseStorage();
  if (!uid || !storage) return null; // 비로그인·미설정 → base64 유지
  const blob = dataUrlToBlob(dataUrl);
  if (!blob) return null;
  try {
    const { ref, uploadBytes, getDownloadURL } = await import(
      "firebase/storage"
    );
    const path = `catchPhotos/${uid}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.jpg`;
    const fileRef = ref(storage, path);
    await uploadBytes(fileRef, blob, { contentType: blob.type });
    return await getDownloadURL(fileRef);
  } catch (err) {
    console.warn("photo upload failed, keeping inline data:", err);
    return null;
  }
}
