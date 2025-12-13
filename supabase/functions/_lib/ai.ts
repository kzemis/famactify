// Shared AI provider utility for Supabase Edge Functions (Deno)
// Provides a single fetchChatCompletion that supports Lovable and OpenAI.

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export interface ChatRequest {
  messages: ChatMessage[];
  temperature?: number;
  openAImodel?: string; // optional override
}

export async function fetchChatCompletion(req: ChatRequest): Promise<string> {
  const AI_PROVIDER = (Deno.env.get('AI_PROVIDER') || 'lovable').toLowerCase();
  const temperature = req.temperature ?? 0.7;

  let response: Response;
  if (AI_PROVIDER === 'openai') {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured');
    const OPENAI_MODEL = req.openAImodel || Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini';

    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: req.messages,
        temperature,
      }),
    });
  } else {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: req.messages,
      }),
    });
  }

  if (!response.ok) {
    const status = response.status;
    const errorText = await response.text().catch(() => '');
    if (status === 429) throw new Error('Rate limit exceeded. Please try again later.');
    if (status === 402) throw new Error('AI service requires payment. Please add credits to your workspace.');
    throw new Error(`AI provider error: ${status} ${errorText}`);
  }

  const data = await response.json();
  const aiResponse = data.choices?.[0]?.message?.content ?? data.choices?.[0]?.content;
  if (!aiResponse || typeof aiResponse !== 'string') throw new Error('Empty AI response');
  return aiResponse;
}

export function extractJsonBlock(text: string): string {
  let jsonStr = (text || '').trim();
  if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
  else if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
  if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
  return jsonStr.trim();
}

