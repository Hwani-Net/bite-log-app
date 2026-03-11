'use client';

import Link from 'next/link';

export default function TermsPage() {
  const sectionStyle = { marginBottom: 24 };
  const h2Style = { fontSize: 17, fontWeight: 600 as const, color: 'var(--color-text)', marginBottom: 8 };
  const pStyle = { color: 'var(--color-text-secondary)', fontSize: 14 };
  const ulStyle = { color: 'var(--color-text-secondary)', fontSize: 14, paddingLeft: 20 };

  return (
    <div style={{ padding: '24px 16px', maxWidth: 640, margin: '0 auto', lineHeight: 1.8 }}>
      <Link href="/settings" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontSize: 14 }}>
        ← 설정으로 돌아가기
      </Link>

      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '16px 0 8px', color: 'var(--color-text)' }}>이용약관</h1>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 24 }}>시행일: 2026년 3월 1일</p>

      <section style={sectionStyle}>
        <h2 style={h2Style}>제1조 (목적)</h2>
        <p style={pStyle}>
          이 약관은 BITE Log(이하 &quot;서비스&quot;)의 이용조건 및 절차에 관한 기본적인 사항을 규정함을 목적으로 합니다.
          서비스는 개인 개발자(이하 &quot;운영자&quot;)가 운영하며, 이용자가 서비스를 이용함으로써 본 약관에 동의한 것으로 간주합니다.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>제2조 (용어의 정의)</h2>
        <ul style={ulStyle}>
          <li>&quot;서비스&quot;란 BITE Log 앱(웹/모바일)에서 제공하는 모든 기능을 의미합니다.</li>
          <li>&quot;이용자&quot;란 서비스에 접속하여 본 약관에 따라 서비스를 이용하는 자를 의미합니다.</li>
          <li>&quot;회원&quot;이란 Google 로그인을 통해 계정을 생성한 이용자를 의미합니다.</li>
          <li>&quot;콘텐츠&quot;란 이용자가 서비스 내에서 생성한 텍스트, 사진, 기록 등을 의미합니다.</li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>제3조 (서비스 내용)</h2>
        <p style={pStyle}>서비스는 다음 기능을 무료로 제공합니다:</p>
        <ul style={ulStyle}>
          <li>낚시 조과 기록 및 통계 분석</li>
          <li>AI 어종 인식 (카메라/갤러리 사진 분석)</li>
          <li>입질 시간 예측 및 물때 정보</li>
          <li>날씨·해양 데이터 조회</li>
          <li>커뮤니티 피드 (공개 조과 공유)</li>
          <li>바이럴 장비 트렌드 및 낚시 뉴스</li>
        </ul>
        <p style={pStyle}>
          일부 기능은 외부 API(Open-Meteo, 기상청, 바다누리 등)에 의존하며, 외부 서비스의 장애 시 해당 기능이 제한될 수 있습니다.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>제4조 (이용자의 의무)</h2>
        <ul style={ulStyle}>
          <li>타인의 개인정보를 도용하거나 허위 정보를 등록해서는 안 됩니다.</li>
          <li>서비스의 안정적 운영을 방해하는 행위(해킹, 크롤링, 자동화 접속 등)를 해서는 안 됩니다.</li>
          <li>욕설, 비방, 음란물 등 다른 이용자에게 불쾌감을 주는 콘텐츠를 게시해서는 안 됩니다.</li>
          <li>관련 법령 및 이 약관의 규정을 준수해야 합니다.</li>
          <li>위 의무를 위반한 경우 운영자는 경고 없이 해당 콘텐츠를 삭제하거나 이용을 제한할 수 있습니다.</li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>제5조 (서비스 이용)</h2>
        <p style={pStyle}>
          서비스는 연중무휴 24시간 제공을 원칙으로 합니다. 다만, 다음의 경우 일시적으로 서비스 이용이 제한될 수 있으며,
          가능한 경우 사전 공지합니다:
        </p>
        <ul style={ulStyle}>
          <li>시스템 정기 점검 또는 긴급 유지보수</li>
          <li>서버·네트워크 장애 등 기술적 문제</li>
          <li>천재지변, 전시, 통신 장애 등 불가항력적 상황</li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>제6조 (위치정보 이용)</h2>
        <p style={pStyle}>
          서비스는 이용자의 현재 위치를 기반으로 날씨, 물때, 입질 예측 등의 정보를 제공합니다.
          위치 정보는 이용자의 명시적 동의(브라우저 권한 허용) 시에만 수집되며,
          서버에 별도로 저장하지 않고 실시간 조회 목적으로만 사용됩니다.
          이용자는 언제든지 브라우저 또는 기기 설정을 통해 위치 정보 제공을 중단할 수 있습니다.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>제7조 (콘텐츠의 권리 및 관리)</h2>
        <ul style={ulStyle}>
          <li>이용자가 서비스에 게시한 콘텐츠(사진, 텍스트 등)의 저작권은 해당 이용자에게 귀속됩니다.</li>
          <li>공개 피드에 게시된 콘텐츠는 다른 이용자가 열람할 수 있으며, 이용자는 언제든 비공개 전환 또는 삭제할 수 있습니다.</li>
          <li>운영자는 법령 위반, 타인의 권리 침해, 약관 위반 콘텐츠를 사전 통보 없이 삭제할 수 있습니다.</li>
          <li>서비스의 로고, 디자인, 소프트웨어 등 지적재산권은 운영자에게 귀속됩니다.</li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>제8조 (개인정보 보호)</h2>
        <p style={pStyle}>
          운영자는 이용자의 개인정보를 &quot;개인정보처리방침&quot;에 따라 보호합니다.
          자세한 내용은{' '}
          <Link href="/privacy" style={{ color: 'var(--color-primary)' }}>개인정보처리방침</Link>
          을 확인해 주세요.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>제9조 (서비스 해지 및 탈퇴)</h2>
        <ul style={ulStyle}>
          <li>이용자는 언제든지 서비스 내 설정 메뉴 또는 이메일(hwanizero01@gmail.com)을 통해 회원 탈퇴를 요청할 수 있습니다.</li>
          <li>탈퇴 시 이용자의 개인정보 및 비공개 콘텐츠는 즉시 삭제됩니다.</li>
          <li>공개 피드에 이미 게시된 콘텐츠는 탈퇴 전 이용자가 직접 삭제해야 합니다.</li>
          <li>운영자는 이용자가 본 약관을 위반한 경우 서비스 이용을 제한하거나 계정을 해지할 수 있습니다.</li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>제10조 (면책 조항)</h2>
        <ul style={ulStyle}>
          <li>서비스에서 제공하는 날씨, 물때, 입질 예측, AI 어종 분석 정보는 <strong>참고용</strong>이며, 정확성을 보장하지 않습니다.</li>
          <li>예측 정보에 기반한 낚시 활동에서 발생한 손해(안전사고 등)에 대해 운영자는 책임을 지지 않습니다.</li>
          <li>이용자 간 분쟁에 대해 운영자는 개입하지 않으며 책임을 지지 않습니다.</li>
          <li>천재지변, 기술적 장애 등 불가항력으로 인한 서비스 중단에 대해 책임을 지지 않습니다.</li>
          <li>외부 API(기상청, Open-Meteo 등)의 데이터 오류로 인한 손해에 대해 책임을 지지 않습니다.</li>
        </ul>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>제11조 (손해배상 제한)</h2>
        <p style={pStyle}>
          서비스는 무료로 제공되며, 운영자는 서비스 이용과 관련하여 이용자에게 발생한 어떠한 간접적·부수적·결과적 손해에 대해서도
          배상 책임을 지지 않습니다. 다만, 운영자의 고의 또는 중대한 과실로 인한 손해는 제외합니다.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>제12조 (약관 변경)</h2>
        <p style={pStyle}>
          본 약관은 관련 법령의 변경이나 서비스 정책 변경에 따라 수정될 수 있습니다.
          변경 시 시행일 7일 전부터 서비스 내 공지하며, 이용자의 불리한 변경인 경우 30일 전 공지합니다.
          변경 약관 시행일 이후에도 서비스를 계속 이용하는 경우 변경된 약관에 동의한 것으로 간주합니다.
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={h2Style}>제13조 (분쟁 해결 및 관할 법원)</h2>
        <p style={pStyle}>
          본 약관에 관한 분쟁은 대한민국 법률에 따라 해석되며, 서비스 이용과 관련하여 발생한 분쟁에 대해서는
          민사소송법 상의 관할 법원에 소를 제기할 수 있습니다.
        </p>
      </section>

      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16, marginTop: 32 }}>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>
          문의: hwanizero01@gmail.com
        </p>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 11, marginTop: 4 }}>
          © 2026 BITE Log. All rights reserved.
        </p>
      </div>
    </div>
  );
}
