// AI Fish Species Recognition Service
// Uses Gemini 2.0 Flash via REST API (Free Tier: 1,500 req/day)

export interface FishAIResult {
  species: string;         // English name
  koreanName: string;      // 한국어 이름
  confidence: number;      // 0-100
  description: string;     // 한국어 간단 설명
  estimatedSizeCm?: number; // AI estimated size (optional)
  estimatedWeightKg?: number; // AI estimated weight (optional)
  fishingTip?: string;     // 어종별 낚시 팁
}

const GEMINI_PROMPT = `당신은 한국 연안 낚시 40년 경력의 어류 전문가입니다.
이 사진에 있는 물고기의 종류를 식별해주세요.

## 식별 규칙
1. 한국 연안/민물에서 잡히는 어종 중심으로 판별하세요.
2. 사진의 물고기 크기를 주변 물체(손, 줄자, 바닥 등)와 비교하여 추정하세요.
3. 확신이 70% 미만이면 가장 유사한 종으로 답하되 confidence를 낮게 주세요.
4. 물고기가 아닌 경우 species를 "unknown"으로 하세요.

## 주요 대상어종 (우선 검토)
감성돔, 참돔, 우럭, 볼락, 광어, 농어, 쥐노래미, 고등어, 학공치,
방어, 부시리, 돌돔, 벵에돔, 숭어, 주꾸미, 갑오징어, 문어, 쭈꾸미,
붕어, 배스, 송어, 산천어, 쏘가리, 장어

반드시 아래 JSON 형식으로만 답변하세요 (다른 텍스트 없이):
{
  "species": "영어 이름",
  "koreanName": "한국어 이름",
  "confidence": 85,
  "estimatedSizeCm": 35,
  "estimatedWeightKg": 0.8,
  "description": "한국어로 간단한 설명 (특징, 서식지 1-2문장)",
  "fishingTip": "이 어종을 잡기 위한 핵심 팁 1문장"
}`;

// Mock data for development (when API key not set)
const MOCK_RESULTS: FishAIResult[] = [
  {
    species: 'Red Sea Bream', koreanName: '참돔', confidence: 92,
    estimatedSizeCm: 42, estimatedWeightKg: 1.8,
    description: '한국 연안에서 흔히 볼 수 있는 고급 어종입니다. 체장 30~50cm가 일반적이며, 봄~가을 시즌이 최적입니다.',
    fishingTip: '바닥채비로 새우 미끼를 사용하면 효과적입니다.',
  },
  {
    species: 'Black Rockfish', koreanName: '우럭', confidence: 88,
    estimatedSizeCm: 30, estimatedWeightKg: 0.7,
    description: '바위 지대에 서식하는 대표적인 선상 낚시 대상어입니다. 연중 낚이며, 특히 겨울철 조과가 좋습니다.',
    fishingTip: '웜 리그로 바위틈을 공략하세요.',
  },
  {
    species: 'Flatfish', koreanName: '광어', confidence: 85,
    estimatedSizeCm: 45, estimatedWeightKg: 1.2,
    description: '모래 바닥에 서식하는 저서어류로, 루어 낚시의 인기 대상어입니다.',
    fishingTip: '바닥을 긁듯이 느린 리트리브가 핵심입니다.',
  },
  {
    species: 'Korean Rockfish', koreanName: '볼락', confidence: 90,
    estimatedSizeCm: 20, estimatedWeightKg: 0.15,
    description: '야간 낚시의 대표 어종으로, 라이트게임에 적합합니다.',
    fishingTip: '1~2g 지그헤드 + 웜으로 슬로우 폴링하세요.',
  },
  {
    species: 'Webfoot Octopus', koreanName: '주꾸미', confidence: 95,
    estimatedSizeCm: 15, estimatedWeightKg: 0.1,
    description: '가을 시즌의 대표 대상종으로, 에기 낚시로 많이 잡힙니다.',
    fishingTip: '빨간색 에기로 바닥을 톡톡 쳐주세요.',
  },
];

export async function identifyFish(photoBase64: string): Promise<FishAIResult | null> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  
  // If no API key, use mock data for development
  if (!apiKey) {
    console.warn('[FishAI] No API key → Mock mode');
    await new Promise(r => setTimeout(r, 1500));
    return MOCK_RESULTS[Math.floor(Math.random() * MOCK_RESULTS.length)];
  }

  try {
    // Strip data URL prefix if present
    const base64Data = photoBase64.includes(',') 
      ? photoBase64.split(',')[1] 
      : photoBase64;
    
    // Determine mime type
    let mimeType = 'image/jpeg';
    if (photoBase64.startsWith('data:image/png')) mimeType = 'image/png';
    else if (photoBase64.startsWith('data:image/webp')) mimeType = 'image/webp';

    const requestBody = {
      contents: [{
        parts: [
          { text: GEMINI_PROMPT },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Data,
            },
          },
        ],
      }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 512,
        responseMimeType: 'application/json',
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
      const errText = await res.text();
      console.error('[FishAI] Gemini API error:', res.status, errText);
      // Graceful fallback to mock on API error
      return getFallbackResult();
    }

    const data = await res.json();
    const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textContent) {
      console.warn('[FishAI] Gemini returned empty response');
      return getFallbackResult();
    }

    // Parse JSON response (handle potential markdown wrapping)
    let jsonStr = textContent.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    
    const parsed = JSON.parse(jsonStr);
    
    return {
      species: parsed.species || 'unknown',
      koreanName: parsed.koreanName || '알 수 없음',
      confidence: Math.min(100, Math.max(0, parsed.confidence || 0)),
      description: parsed.description || '',
      estimatedSizeCm: parsed.estimatedSizeCm || undefined,
      estimatedWeightKg: parsed.estimatedWeightKg || undefined,
      fishingTip: parsed.fishingTip || undefined,
    };
  } catch (err) {
    console.error('[FishAI] Recognition failed:', err);
    // Return fallback instead of null for better UX
    return getFallbackResult();
  }
}

// Graceful fallback when API fails — returns null with logged warning
// instead of crashing the entire flow
function getFallbackResult(): FishAIResult | null {
  console.warn('[FishAI] Using null fallback — user will need to select species manually');
  return null;
}
