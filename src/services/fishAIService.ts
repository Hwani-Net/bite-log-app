// AI Fish Species Recognition Service
// Uses Gemini 2.0 Flash via REST API (Free Tier: 1,500 req/day)

export interface FishAIResult {
  species: string;
  confidence: number; // 0-100
  description: string;
  koreanName: string;
}

const GEMINI_PROMPT = `당신은 한국의 낚시 전문가이자 어류학자입니다. 
이 사진에 있는 물고기의 종류를 식별해주세요.

반드시 아래 JSON 형식으로만 답변하세요 (다른 텍스트 없이):
{
  "species": "영어 이름",
  "koreanName": "한국어 이름",
  "confidence": 85,
  "description": "한국어로 간단한 설명 (크기, 서식지, 특징 등 1-2문장)"
}

물고기가 아닌 경우:
{
  "species": "unknown",
  "koreanName": "알 수 없음",
  "confidence": 0,
  "description": "물고기를 인식할 수 없습니다. 더 선명한 사진을 촬영해주세요."
}`;

export async function identifyFish(photoBase64: string): Promise<FishAIResult | null> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.warn('Gemini API key not configured. AI fish recognition unavailable.');
    return null;
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
              data: base64Data
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 256,
        responseMimeType: 'application/json'
      }
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
      console.error('Gemini API error:', res.status, errText);
      return null;
    }

    const data = await res.json();
    const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textContent) {
      console.warn('Gemini returned empty response');
      return null;
    }

    // Parse JSON response
    const parsed = JSON.parse(textContent);
    
    return {
      species: parsed.species || 'unknown',
      koreanName: parsed.koreanName || '알 수 없음',
      confidence: Math.min(100, Math.max(0, parsed.confidence || 0)),
      description: parsed.description || '',
    };
  } catch (err) {
    console.error('Fish AI recognition failed:', err);
    return null;
  }
}
