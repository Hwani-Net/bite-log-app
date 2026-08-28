// 4차 GOAL-6 — A2HS(홈 화면 추가). beforeinstallprompt는 페이지 로드
// 직후 한 번 발생하므로 앱 초기화 시점에 붙잡아 두고, 설정 페이지가
// useSyncExternalStore로 구독한다(설정 prefs와 같은 패턴). 이벤트가 없는
// 환경(iOS Safari, 이미 설치됨, 미지원)에선 버튼 자체가 안 보인다.

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let initialized = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((cb) => cb());
}

/** AppInitializer에서 1회 호출 — 이벤트를 붙잡아 둔다. */
export function initInstallPrompt(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // 브라우저 기본 미니바 대신 우리 버튼으로
    deferredPrompt = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notify();
  });
}

export function subscribeInstallPrompt(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function canInstallSnapshot(): boolean {
  return deferredPrompt !== null;
}

/** 설치 프롬프트 표시. 사용자가 응답하면 이벤트는 소진된다. */
export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  const evt = deferredPrompt;
  // 소진을 먼저 — prompt()가 뜬 동안 버튼 연타로 이벤트를 두 번 쓰면
  // 스펙상 rejection이 난다(교차검수 지적). UI도 즉시 내려간다.
  deferredPrompt = null;
  notify();
  await evt.prompt();
  const choice = await evt.userChoice;
  return choice.outcome === "accepted";
}

// beforeinstallprompt는 hydration보다 먼저 올 수 있다 — effect 시점
// 등록만으로는 유실 레이스가 있어, 모듈이 클라이언트 번들에 평가되는
// 즉시 리스너를 건다(AppInitializer의 initInstallPrompt 호출은 가드로
// 무해한 중복이 된다).
if (typeof window !== "undefined") {
  initInstallPrompt();
}
