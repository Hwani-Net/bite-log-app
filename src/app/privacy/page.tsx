'use client';

import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div style={{ padding: '24px 16px', maxWidth: 640, margin: '0 auto', lineHeight: 1.8 }}>
      <Link href="/settings" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontSize: 14 }}>
        ← 설정으로 돌아가기
      </Link>

      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '16px 0 8px', color: 'var(--color-text)' }}>개인정보처리방침</h1>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 24 }}>시행일: 2026년 3월 1일</p>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--color-text)', marginBottom: 8 }}>1. 수집하는 개인정보 항목</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: 'var(--color-text-secondary)' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
              <th style={{ padding: 8, textAlign: 'left', color: 'var(--color-text)' }}>항목</th>
              <th style={{ padding: 8, textAlign: 'left', color: 'var(--color-text)' }}>수집 목적</th>
              <th style={{ padding: 8, textAlign: 'left', color: 'var(--color-text)' }}>수집 방법</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td style={{ padding: 8 }}>이메일, 이름, 프로필 사진</td>
              <td style={{ padding: 8 }}>회원 식별, 로그인</td>
              <td style={{ padding: 8 }}>Google 로그인(Firebase Auth)</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td style={{ padding: 8 }}>GPS 위치 정보</td>
              <td style={{ padding: 8 }}>낚시 위치 기록, 날씨/물때 조회</td>
              <td style={{ padding: 8 }}>브라우저 Geolocation API (사용자 동의)</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td style={{ padding: 8 }}>사진</td>
              <td style={{ padding: 8 }}>조과 기록, AI 어종 분석</td>
              <td style={{ padding: 8 }}>카메라/갤러리 업로드 (사용자 선택)</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td style={{ padding: 8 }}>조과 기록 데이터</td>
              <td style={{ padding: 8 }}>통계 분석, 커뮤니티 피드</td>
              <td style={{ padding: 8 }}>직접 입력</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--color-text)', marginBottom: 8 }}>2. 개인정보 보유 및 이용 기간</h2>
        <ul style={{ color: 'var(--color-text-secondary)', fontSize: 14, paddingLeft: 20 }}>
          <li>회원 탈퇴 시까지 보유하며, 탈퇴 즉시 삭제됩니다.</li>
          <li>관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--color-text)', marginBottom: 8 }}>3. 개인정보의 제3자 제공</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
          서비스는 이용자의 개인정보를 원칙적으로 제3자에게 제공하지 않습니다. 
          다만, 아래의 경우에는 예외로 합니다:
        </p>
        <ul style={{ color: 'var(--color-text-secondary)', fontSize: 14, paddingLeft: 20 }}>
          <li>이용자가 사전에 동의한 경우</li>
          <li>법령에 따른 요청이 있는 경우</li>
        </ul>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--color-text)', marginBottom: 8 }}>4. 개인정보 처리 위탁</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: 'var(--color-text-secondary)' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
              <th style={{ padding: 8, textAlign: 'left', color: 'var(--color-text)' }}>수탁자</th>
              <th style={{ padding: 8, textAlign: 'left', color: 'var(--color-text)' }}>위탁 업무</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td style={{ padding: 8 }}>Google LLC (Firebase)</td>
              <td style={{ padding: 8 }}>인증, 데이터 저장, 호스팅</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td style={{ padding: 8 }}>Google LLC (Gemini API)</td>
              <td style={{ padding: 8 }}>AI 어종 분석 (사진 전송)</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--color-text)', marginBottom: 8 }}>5. 이용자의 권리</h2>
        <ul style={{ color: 'var(--color-text-secondary)', fontSize: 14, paddingLeft: 20 }}>
          <li>개인정보 열람, 정정, 삭제를 요청할 수 있습니다.</li>
          <li>위치 정보 수집에 대한 동의를 언제든 철회할 수 있습니다 (브라우저 설정).</li>
          <li>공개 피드에 게시한 기록을 비공개로 전환하거나 삭제할 수 있습니다.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--color-text)', marginBottom: 8 }}>6. 개인정보 보호 조치</h2>
        <ul style={{ color: 'var(--color-text-secondary)', fontSize: 14, paddingLeft: 20 }}>
          <li>Firebase의 보안 규칙(Firestore Security Rules)을 적용하여 인가된 사용자만 데이터에 접근 가능합니다.</li>
          <li>모든 통신은 HTTPS(SSL/TLS) 프로토콜을 통해 암호화됩니다.</li>
          <li>GPS 위치 정보는 이용자의 명시적 동의가 있을 때만 수집합니다.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--color-text)', marginBottom: 8 }}>7. 개인정보 보호 책임자</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
          이메일: hwanizero01@gmail.com
        </p>
      </section>

      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16, marginTop: 32 }}>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>
          본 개인정보처리방침은 관련 법령 또는 서비스 정책 변경에 따라 수정될 수 있습니다.
        </p>
      </div>
    </div>
  );
}
