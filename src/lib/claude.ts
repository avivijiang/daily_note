/** Analysis-specific utilities: data building, system prompt, XML parsing */

import { DiaryData, AnalysisSummary, Goal } from './types';
import { getDuration } from './utils';

// Re-export streamAI for backward compat
export { streamAI as streamClaude } from './ai';

// ── Diary message builder ─────────────────────────────────────────────

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

/** Build full analysis message including active goals context */
export function buildAnalysisMessage(data: DiaryData, goals: Goal[] = []): string {
  const diary = buildDiaryMessage(data);
  const activeGoals = goals.filter((g) => g.isActive);
  if (activeGoals.length === 0) return diary;

  const goalsContext = activeGoals.map((g, i) => {
    let line = `${i + 1}. ${g.title}`;
    if (g.description) line += `：${g.description}`;
    if (g.deadline) line += `（截止 ${g.deadline}）`;
    return line;
  });

  return `${diary}\n\n【我当前的目标】\n${goalsContext.join('\n')}`;
}

// ── System prompts ────────────────────────────────────────────────────

export const ANALYSIS_SYSTEM_PROMPT = `你是用户的私人成长教练和日记整理师。用户会给你发送他今天的行为记录（可能包含目标信息），你需要完成以下三项任务，按顺序用 XML 标签包裹输出，不要输出任何标签之外的内容。

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
  "score": 7,
  "goalAlignment": 6
}
score 是 AI 对今天整体状态的评分（1-10），结合心情、完成度、积极性综合判断。
goalAlignment 是今日行为与用户目标的对齐分（1-10）；若用户没有填写目标，输出 null。
</summary>

任务三：洞察与建议
<insight>
以人生导师的口吻，基于今天的记录给出 2-3 段深度洞察和建议。
要求：有温度，不说废话，不说"你今天做得很好"这类空话；要针对具体行为给出具体建议；可以适度犀利。
若用户提供了目标，必须：
- 明确指出今天行为与目标的关联程度
- 指出哪些行为在推进目标，哪些在消耗时间却与目标无关
- 给出 1 个具体可执行的明日行动建议，直接服务于目标
长度 150-250 字。
</insight>`;

export const GREETING_SYSTEM_PROMPT = `你是用户的日记助手。根据用户昨天的情况和当前目标，生成一句简短的、有温度的今日开场白。
要求：
- 呼应昨天发生的具体事情（不要泛泛而谈）
- 对今天有期待感
- 语气温暖但不肉麻
- 不超过 50 字
- 直接输出文字，不要任何前缀或解释`;

export const WEEKLY_SYSTEM_PROMPT = `你是用户的私人成长顾问，正在为用户生成上周的周报复盘。

请基于用户提供的 7 天数据，完成以下分析，用 XML 标签分段输出，不要输出标签之外的内容：

<week_summary>
本周总体情况的 2-3 句概括，有温度，像朋友在和你说话。
</week_summary>

<week_stats>
输出严格 JSON，不要多余文字：
{
  "totalRecordDays": 5,
  "avgMoodScore": 3.8,
  "avgGoalAlignment": 6.2,
  "mostProductiveDay": "周三",
  "totalEventHours": 42.5,
  "topCategory": "专注工作"
}
</week_stats>

<week_patterns>
发现的 2-3 个行为模式，要具体，基于数据，不要泛泛而谈。
</week_patterns>

<week_insight>
结合用户的目标（如果有），给出本周最重要的一个洞察和下周最值得改变的一件事。150字以内，犀利，具体，可执行。
</week_insight>`;

// ── XML stream parser ─────────────────────────────────────────────────

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

export function parseWeeklyStream(raw: string): {
  summary: string;
  summaryDone: boolean;
  stats: Record<string, unknown> | null;
  statsDone: boolean;
  patterns: string;
  patternsDone: boolean;
  insight: string;
  insightDone: boolean;
} {
  const summaryR = extractTag(raw, 'week_summary');
  const statsR = extractTag(raw, 'week_stats');
  const patternsR = extractTag(raw, 'week_patterns');
  const insightR = extractTag(raw, 'week_insight');

  let stats: Record<string, unknown> | null = null;
  if (statsR.complete) {
    try {
      stats = JSON.parse(statsR.content.trim());
    } catch {
      // still streaming
    }
  }

  return {
    summary: summaryR.content,
    summaryDone: summaryR.complete,
    stats,
    statsDone: statsR.complete,
    patterns: patternsR.content,
    patternsDone: patternsR.complete,
    insight: insightR.content,
    insightDone: insightR.complete,
  };
}
