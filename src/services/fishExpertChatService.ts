// Fish Expert Chat Service
// Gemini 2.0 Flash — Korean fishing specialist with conversation history
// Short, direct answers (< 3 bullets). Anti-hallucination guardrails built in.

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

const SYSTEM_INSTRUCTION = `당신은 "바이트로그 AI 낚시 마스터"입니다. 20년 경력의 한국 낚시 전문가로서 낚시인들에게 실용적인 조언을 제공합니다.

## 역할 원칙
1. 답변은 반드시 **3줄 이내** (핵심만, 군더더기 없이)
2. 한국어로 답변. 낚시 용어는 한국 현지 용어 사용
3. 모르는 정보는 모른다고 솔직하게 말하기 (절대 지어내지 않음)
4. 낚시와 관련 없는 질문엔 "낚시 관련 질문만 답변드릴 수 있어요 🎣" 라고만 답변
5. 숫자(사이즈, 시즌, 수심)는 구체적으로

## 전문 영역
- 어종별 시즌 / 포인트 / 채비
- 미끼 및 루어 선택
- 조황 정보 / 물때 활용법
- 입문자 가이드 (장비, 면허, 안전)`;

const QUICK_REPLIES_BY_SPECIES: Record<string, string[]> = {
  '광어': ['광어 시즌이 언제야?', '광어 루어 채비 추천', '광어 수심은?', '광어 포인트 유형'],
  '우럭': ['우럭 낚시 시즌?', '우럭 생미끼 vs 루어', '우럭 배 낚시 채비', '우럭 야간 낚시 팁'],
  '주꾸미': ['주꾸미 시즌은?', '에기 색상 선택', '주꾸미 포인트 찾기', '주꾸미 선상 vs 갯바위'],
  '참돔': ['참돔 타이라바 채비', '참돔 시즌', '참돔 수심과 조류', '참돔 릴링 속도'],
  '볼락': ['볼락 야간 낚시 채비', '볼락 루어 추천', '볼락 입문 장비', '볼락 포인트'],
  '고등어': ['고등어 낚시 시즌', '고등어 사비키 채비', '고등어 포인트', '고등어 맛있게 손질법'],
  '전갱이': ['전갱이 낚시법', '전갱이 사비키 채비', '전갱이 입질 시간대'],
  '삼치': ['삼치 시즌', '삼치 루어 선택', '삼치 릴링 속도', '삼치 포인트'],
  '방어': ['방어 시즌', '방어 GT 채비', '방어 포인트', '방어 vs 부시리'],
};

const DEFAULT_QUICK_REPLIES = [
  '지금 시즌 조황 알려줘',
  '입문자 장비 추천',
  '물때 활용법',
  '선상 낚시 vs 갯바위',
];

export function getQuickReplies(species: string | null): string[] {
  if (species && QUICK_REPLIES_BY_SPECIES[species]) {
    return QUICK_REPLIES_BY_SPECIES[species];
  }
  return DEFAULT_QUICK_REPLIES;
}

export const CHAT_SPECIES = Object.keys(QUICK_REPLIES_BY_SPECIES);

export async function chatWithExpert(
  history: ChatMessage[],
  userMessage: string,
  selectedSpecies: string | null
): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  // Build context hint for selected species
  const contextHint = selectedSpecies
    ? `[현재 선택한 어종: ${selectedSpecies}] 이 어종에 대한 질문일 가능성이 높습니다.\n질문: `
    : '';

  if (!apiKey) {
    await new Promise(r => setTimeout(r, 800));
    return getMockAnswer(selectedSpecies, userMessage);
  }

  try {
    // Keep only last 10 turns to manage context window
    const recentHistory = history.slice(-10);

    const contents = [
      ...recentHistory.map(m => ({
        role: m.role,
        parts: [{ text: m.text }],
      })),
      {
        role: 'user',
        parts: [{ text: contextHint + userMessage }],
      },
    ];

    const requestBody = {
      contents,
      systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 200,
        topK: 40,
        topP: 0.9,
      },
    };

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      }
    );

    if (!res.ok) {
      console.error('Gemini Chat API error:', res.status);
      return `[API 오류 ${res.status}] 잠시 후 다시 시도해주세요.`;
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text || '죄송합니다, 답변을 생성할 수 없었습니다.';
  } catch (err) {
    console.error('Chat failed:', err);
    return '네트워크 오류가 발생했습니다. 다시 시도해주세요.';
  }
}

function getMockAnswer(species: string | null, question: string): string {
  const q = question.toLowerCase();
  if (q.includes('시즌') || q.includes('언제')) {
    return species
      ? `🗓️ **${species} 시즌**: 봄(4~6월)과 가을(9~11월)이 최성수기입니다.\n가을이 씨알이 굵고 조과도 풍성해 추천해요!`
      : `🗓️ 봄·가을이 전반적인 낚시 성수기입니다.\n현재(${new Date().getMonth() + 1}월)는 ${new Date().getMonth() >= 3 && new Date().getMonth() <= 5 ? '봄 시즌 — 광어, 우럭 추천!' : new Date().getMonth() >= 8 && new Date().getMonth() <= 10 ? '가을 시즌 — 주꾸미, 고등어 추천!' : '동절기 — 우럭, 볼락이 주력입니다.'}`;
  }
  if (q.includes('채비') || q.includes('루어')) {
    return species
      ? `🎣 **${species} 채비**: 선상의 경우 지그헤드 20~30g 기준으로 시작하세요.\n색상은 화이트/핑크 계열이 무난하고, 조류가 강하면 무게를 올려야 합니다.`
      : `🎣 범용 루어 채비로는 10~40g 왜건 바이브가 많은 어종에 효과적입니다.`;
  }
  if (q.includes('입문') || q.includes('장비') || q.includes('추천')) {
    return `🏷️ **입문 장비 패키지** (약 10~15만원 예산):\n① 스피닝 릴 + 로드 콤보셋 ② PE 라인 1~1.5호 ③ 워엠 지그헤드\n낚시점 패키지가 가성비 최고!`;
  }
  return `🎣 네, ${species ? species + ' 낚시' : '낚시'}에 대해 더 구체적으로 물어봐 주세요!\n예: "시즌이 언제야?", "채비 추천해줘", "포인트 알려줘" (Demo 모드)`;
}
