import { NextRequest } from 'next/server';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { GREETING_SYSTEM_PROMPT } from '@/lib/claude';

export async function POST(req: NextRequest) {
  const apiKey  = req.headers.get('x-api-key')  ?? '';
  const modelId = req.headers.get('x-model-id') ?? '';

  if (!apiKey || !modelId) {
    return new Response(JSON.stringify({ error: 'Missing headers' }), { status: 400 });
  }

  const { yesterdaySummary, goals } = await req.json();

  const parts: string[] = [];
  if (yesterdaySummary) {
    parts.push(`昨天的情况：心情「${yesterdaySummary.mood || '未知'}」，评分 ${yesterdaySummary.score || '?'}/10。`);
    if (yesterdaySummary.insights?.length) {
      parts.push(`昨天的灵感：${yesterdaySummary.insights.join('、')}。`);
    }
  }
  if (goals?.length) {
    parts.push(`当前目标：${goals.map((g: { title: string }) => g.title).join('、')}。`);
  }

  const userMessage = parts.length > 0
    ? parts.join('\n')
    : '这是新用户，今天是第一天使用日记。';

  try {
    const openrouter = createOpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey,
    });

    const { text } = await generateText({
      model: openrouter(modelId),
      system: GREETING_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
      maxOutputTokens: 100,
    });

    return new Response(JSON.stringify({ greeting: text.trim() }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 502 });
  }
}
