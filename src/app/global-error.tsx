"use client";

/**
 * 앱 전역 에러 바운더리.
 *
 * 이게 없으면 클라이언트 예외 하나가 Next.js 기본 화면("Application error:
 * a client-side exception has occurred")으로 앱을 통째로 덮는다. 그 화면은
 * 브랜드도, 복구 수단도, 원인 단서도 없어서 사용자는 콘솔을 열 수 없으면
 * 할 수 있는 게 없다(2026-08-28 사용자가 /booking에서 실제로 마주친 화면).
 *
 * 여기서 하는 일은 셋이다: 다시 시도, 캐시·서비스워커까지 비우는 강제
 * 복구, 그리고 원인 문자열 노출 — 재현이 안 되는 오류를 사용자가 그대로
 * 읽어 전달할 수 있어야 다음 진단이 추측이 아니게 된다.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  async function hardReset() {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      const regs = await navigator.serviceWorker?.getRegistrations();
      await Promise.all((regs ?? []).map((r) => r.unregister()));
    } catch {
      // 캐시 API가 없거나 막힌 환경 — 그래도 새로고침은 해본다
    }
    location.reload();
  }

  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#080d14",
          color: "#e2e8f0",
          fontFamily:
            "Pretendard, 'Noto Sans KR', -apple-system, system-ui, sans-serif",
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🎣</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>
            화면을 불러오지 못했습니다
          </h1>
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.6,
              color: "#94a3b8",
              margin: "0 0 20px",
            }}
          >
            일시적인 오류입니다. 다시 시도해도 같은 화면이면 아래
            &lsquo;캐시 비우고 새로고침&rsquo;을 눌러 주세요.
          </p>

          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button
              onClick={reset}
              style={{
                flex: 1,
                padding: "12px 16px",
                borderRadius: 12,
                border: "none",
                background: "#1392ec",
                color: "#fff",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              다시 시도
            </button>
            <button
              onClick={hardReset}
              style={{
                flex: 1,
                padding: "12px 16px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "transparent",
                color: "#e2e8f0",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              캐시 비우고 새로고침
            </button>
          </div>

          <p
            style={{
              marginTop: 20,
              fontSize: 12,
              color: "#475569",
              wordBreak: "break-word",
            }}
          >
            {error.digest ? `오류 코드 ${error.digest} · ` : ""}
            {error.message || "알 수 없는 오류"}
          </p>
        </div>
      </body>
    </html>
  );
}
