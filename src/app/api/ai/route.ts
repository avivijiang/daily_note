/**
 * /api/ai — Vercel AI SDK + OpenRouter 服务端代理
 * 统一接入 OpenRouter，通过 AI SDK streamText 流式返回
 */
import { NextRequest } from 'next/server';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

export async function POST(req: NextRequest) {
  const apiKey  = req.headers.get('x-api-key')   ?? '';
  const modelId = req.headers.get('x-model-id')  ?? '';

  if (!apiKey)  return new Response(JSON.stringify({ error: 'Missing API key'  }), { status: 400 });
  if (!modelId) return new Response(JSON.stringify({ error: 'Missing model ID' }), { status: 400 });

  const body = await req.json();
  const { system } = body;
  // Support both single-turn { userMessage } and multi-turn { messages }
  const messages: { role: 'user' | 'assistant'; content: string }[] =
    body.messages ?? [{ role: 'user', content: body.userMessage ?? '' }];

  const openrouter = createOpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
  });

  try {
    const result = streamText({
      model: openrouter(modelId),
      system,
      messages,
      maxOutputTokens: 2000,
    });

    return result.toTextStreamResponse();
  } catch (e) {
    return new Response(
      JSON.stringify({ error: `代理连接失败: ${String(e)}` }),
      { status: 502 }
    );
  }
}
