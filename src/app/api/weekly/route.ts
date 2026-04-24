import { NextRequest } from 'next/server';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { WEEKLY_SYSTEM_PROMPT } from '@/lib/claude';

export async function POST(req: NextRequest) {
  const apiKey  = req.headers.get('x-api-key')  ?? '';
  const modelId = req.headers.get('x-model-id') ?? '';

  if (!apiKey || !modelId) {
    return new Response(JSON.stringify({ error: 'Missing headers' }), { status: 400 });
  }

  const { weekData, goals } = await req.json();

  // Build concise week summary to control token usage
  const weekLines = (weekData as Array<{
    date: string;
    eventCount: number;
    totalHours: number;
    moodScore: number | null;
    topCategory: string;
    analysisSummary: { mood: string; score: number; goalAlignment?: number } | null;
  }>).map((day) => {
    const parts = [`${day.date}（${['周日','周一','周二','周三','周四','周五','周六'][new Date(day.date + 'T00:00:00').getDay()]}）`];
    parts.push(`记录事件 ${day.eventCount} 条，约 ${day.totalHours.toFixed(1)} 小时`);
    if (day.moodScore) parts.push(`心情 ${day.moodScore}/5`);
    if (day.topCategory) parts.push(`主要分类：${day.topCategory}`);
    if (day.analysisSummary) {
      parts.push(`AI评分 ${day.analysisSummary.score}/10`);
      if (day.analysisSummary.goalAlignment != null) {
        parts.push(`目标对齐 ${day.analysisSummary.goalAlignment}/10`);
      }
    }
    return parts.join('，');
  });

  const goalsLines = goals?.length
    ? `\n\n当前目标：${(goals as Array<{ title: string }>).map((g) => g.title).join('、')}`
    : '';

  const userMessage = `以下是本周 7 天的数据：\n${weekLines.join('\n')}${goalsLines}`;

  try {
    const openrouter = createOpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey,
    });

    const result = streamText({
      model: openrouter(modelId),
      system: WEEKLY_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
      maxOutputTokens: 1200,
    });

    return result.toTextStreamResponse();
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 502 });
  }
}
