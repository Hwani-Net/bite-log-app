'use client';

import Link from 'next/link';

export default function TermsPage() {
  return (
    <div style={{ padding: '24px 16px', maxWidth: 640, margin: '0 auto', lineHeight: 1.8 }}>
      <Link href="/settings" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontSize: 14 }}>
        ← 설정으로 돌아가기
      </Link>

      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '16px 0 8px', color: 'var(--color-text)' }}>이용약관</h1>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 24 }}>시행일: 2026년 3월 1일</p>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--color-text)', marginBottom: 8 }}>제1조 (목적)</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
          이 약관은 BITE Log(이하 &quot;서비스&quot;)의 이용조건 및 절차에 관한 기본적인 사항을 규정함을 목적으로 합니다.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--color-text)', marginBottom: 8 }}>제2조 (서비스 내용)</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
          서비스는 낚시 조과 기록, 통계 분석, 커뮤니티 피드, AI 어종 인식, 입질 예측 등의 기능을 무료로 제공합니다.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--color-text)', marginBottom: 8 }}>제3조 (이용자의 의무)</h2>
        <ul style={{ color: 'var(--color-text-secondary)', fontSize: 14, paddingLeft: 20 }}>
          <li>타인의 개인정보를 도용하거나 허위 정보를 등록해서는 안 됩니다.</li>
          <li>서비스의 안정적 운영을 방해하는 행위를 해서는 안 됩니다.</li>
          <li>다른 이용자에게 불쾌감을 주는 콘텐츠를 게시해서는 안 됩니다.</li>
          <li>관련 법령 및 이 약관의 규정을 준수해야 합니다.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--color-text)', marginBottom: 8 }}>제4조 (서비스 이용)</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
          서비스는 연중무휴 24시간 제공을 원칙으로 합니다. 다만, 시스템 점검이나 기술적 장애가 발생한 경우 일시적으로 
          서비스 이용이 제한될 수 있으며, 이 경우 사전 공지를 원칙으로 합니다.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--color-text)', marginBottom: 8 }}>제5조 (콘텐츠 권리)</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
          이용자가 서비스에 게시한 콘텐츠(사진, 텍스트 등)의 저작권은 해당 이용자에게 귀속됩니다. 
          다만, 서비스 내 공개 피드에 게시된 콘텐츠는 다른 이용자가 열람할 수 있습니다.
        </p>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--color-text)', marginBottom: 8 }}>제6조 (면책 조항)</h2>
        <ul style={{ color: 'var(--color-text-secondary)', fontSize: 14, paddingLeft: 20 }}>
          <li>서비스에서 제공하는 날씨, 물때, 입질 예측 정보는 참고용이며, 정확성을 보장하지 않습니다.</li>
          <li>이용자 간 분쟁에 대해 서비스 제공자는 개입하지 않으며 책임을 지지 않습니다.</li>
          <li>천재지변, 기술적 장애 등 불가항력으로 인한 서비스 중단에 대해 책임을 지지 않습니다.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--color-text)', marginBottom: 8 }}>제7조 (약관 변경)</h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
          본 약관은 관련 법령의 변경이나 서비스 정책 변경에 따라 수정될 수 있으며, 변경 시 서비스 내 공지합니다.
        </p>
      </section>

      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16, marginTop: 32 }}>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>
          문의: fishlog.app@gmail.com
        </p>
      </div>
    </div>
  );
}
