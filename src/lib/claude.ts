/** Analysis-specific utilities: data building, system prompt, XML parsing */

import { DiaryData, AnalysisSummary } from './types';
import { getDuration } from './utils';

// Re-export streamAI as the streaming entry point for analysis
export { streamAI as streamClaude } from './ai';

export function buildDiaryMessage(data: DiaryData): string {
  const lines: string[] = [];
  lines.push(`今天是 ${data.date}，以下是我今天的记录：`);

  if (data.events.length > 0) {
    lines.push('\n【时间轴事件】');
    for (const e of data.events) {
      const dur = getDuration(e.startTime, e.endTime);
      let line = `- ${e.startTime} - ${e.endTime}  ${e.emoji} ${e.title}（${dur}）`;
      if (e.note?.trim()) line += ` 备注：${e.note}`;
      lines.push(line);
    }
  }

  if (data.mood) {
    const emojis = ['', '😞', '😔', '😐', '😊', '😄'];
    const note = data.mood.note?.trim() ? `  ${data.mood.note}` : '';
    lines.push(`\n【心情状态】${emojis[data.mood.score]} ${data.mood.score}/5${note}`);
  }

  if (data.inspiration?.trim()) {
    lines.push('\n【灵感与想法】');
    lines.push(data.inspiration.trim());
  }

  const filledGratitude = data.gratitude.filter((g) => g.trim());
  if (filledGratitude.length > 0) {
    lines.push('\n【今天感谢的三件事】');
    data.gratitude.forEach((g, i) => {
      if (g.trim()) lines.push(`${i + 1}. ${g}`);
    });
  }

  const undone = data.todos.filter((t) => !t.done && t.text.trim());
  if (undone.length > 0) {
    lines.push('\n【未完成待办】');
    undone.forEach((t) => lines.push(`- ${t.text}`));
  }

  return lines.join('\n');
}

export const ANALYSIS_SYSTEM_PROMPT = `你是用户的私人成长教练和日记整理师。用户会给你发送他今天的行为记录，你需要完成以下三项任务，按顺序用 XML 标签包裹输出，不要输出任何标签之外的内容。

任务一：整理完整日记
<diary>
将用户碎片化的记录整理为一篇结构清晰、有文学质感的日记。
要求：保留原意，不歪曲事实；提升表达，去除流水账感；第一人称书写；长度 200-400 字。
</diary>

任务二：五维结构化总结
<summary>
输出严格的 JSON 格式，不要有多余文字：
{
  "mood": "一句话描述今天的心情状态",
  "insights": ["灵感要点1", "灵感要点2"],
  "gratitude": ["感谢事项1", "感谢事项2", "感谢事项3"],
  "todos": ["未完成事项1", "未完成事项2"],
  "score": 7
}
score 是 AI 对今天整体状态的评分（1-10），结合心情、完成度、积极性综合判断。
</summary>

任务三：洞察与建议
<insight>
以人生导师的口吻，基于今天的记录给出 2-3 段深度洞察和建议。
要求：有温度，不说废话，不说"你今天做得很好"这类空话；要针对具体行为给出具体建议；可以适度犀利。
长度 150-250 字。
</insight>`;

export function extractTag(
  text: string,
  tag: string
): { content: string; complete: boolean } {
  const open = `<${tag}>`;
  const close = `</${tag}>`;
  const si = text.indexOf(open);
  if (si === -1) return { content: '', complete: false };
  const cs = si + open.length;
  const ei = text.indexOf(close, cs);
  if (ei === -1) return { content: text.slice(cs), complete: false };
  return { content: text.slice(cs, ei), complete: true };
}

export function parseStream(raw: string): {
  diary: string;
  diaryDone: boolean;
  summary: AnalysisSummary | null;
  summaryDone: boolean;
  insight: string;
  insightDone: boolean;
} {
  const diaryResult = extractTag(raw, 'diary');
  const summaryResult = extractTag(raw, 'summary');
  const insightResult = extractTag(raw, 'insight');

  let summary: AnalysisSummary | null = null;
  if (summaryResult.complete) {
    try {
      summary = JSON.parse(summaryResult.content.trim()) as AnalysisSummary;
    } catch {
      // still streaming / malformed
    }
  }

  return {
    diary: diaryResult.content,
    diaryDone: diaryResult.complete,
    summary,
    summaryDone: summaryResult.complete,
    insight: insightResult.content,
    insightDone: insightResult.complete,
  };
}
