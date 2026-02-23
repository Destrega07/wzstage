import seedWords from "@/constants/seedWords.json";
import { NextResponse } from "next/server";
import path from "path";
import { readFile } from "fs/promises";

export const runtime = "nodejs";

type Persona =
  | "lizhi"
  | "songzhi"
  | "futureMaruko"
  | "echoTuanzi"
  | "echoMaruko"
  | "reportArchitect";

type ReportRange =
  | { mode: "2024"; start?: string; end?: string }
  | { mode: "2025"; start?: string; end?: string }
  | { mode: "all"; start?: string; end?: string };

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type CharacterMemoryV2Entry = {
  id: string;
  date: string;
  tag?: string;
  module?: string;
  speaker?: string;
  timestamp?: string;
  keyWord?: string;
  excerpt_lines?: string[];
  source_ref?: {
    path?: string;
    line_start?: number;
    line_end?: number;
  };
};

type CharacterMemoryV2 = {
  entries: CharacterMemoryV2Entry[];
};

type RelationshipMilestone = {
  milestone_id: string;
  date: string;
  title?: string;
  type?: string;
  people?: string[];
  emotion?: { score?: number; label?: string };
  evidence?: Array<{
    quote_lines?: string[];
  }>;
  related_memory_ids?: string[];
};

type RelationshipMilestonesDoc = {
  milestones: RelationshipMilestone[];
};

let characterMemoryV2Promise: Promise<CharacterMemoryV2> | null = null;
let cloneVoiceSettingsPromise: Promise<string> | null = null;
let relationshipMilestonesPromise: Promise<RelationshipMilestonesDoc> | null = null;

async function loadCharacterMemoryV2(): Promise<CharacterMemoryV2> {
  if (!characterMemoryV2Promise) {
    const filePath = path.join(process.cwd(), "assets", "character_memory_v2.json");
    characterMemoryV2Promise = readFile(filePath, "utf8").then((raw) => {
      const json = JSON.parse(raw) as CharacterMemoryV2;
      const entries = Array.isArray(json.entries) ? json.entries : [];
      const normalized = entries.map((e) => {
        const excerpt = (e.excerpt_lines ?? []).join(" ").replace(/\s+/g, " ").trim();
        return {
          ...e,
          excerpt,
          kw: (e.keyWord ?? "").trim(),
          speaker: (e.speaker ?? "").trim(),
          tag: (e.tag ?? "").trim(),
          module: (e.module ?? "").trim(),
        };
      });
      return { ...json, entries: normalized as unknown as CharacterMemoryV2Entry[] };
    });
  }
  return characterMemoryV2Promise;
}

async function loadCloneVoiceSettings(): Promise<string> {
  if (!cloneVoiceSettingsPromise) {
    const filePath = path.join(process.cwd(), "assets", "clone_voice_settings.txt");
    cloneVoiceSettingsPromise = readFile(filePath, "utf8");
  }
  return cloneVoiceSettingsPromise;
}

async function loadRelationshipMilestones(): Promise<RelationshipMilestonesDoc> {
  if (!relationshipMilestonesPromise) {
    const filePath = path.join(process.cwd(), "assets", "relationship_milestones.json");
    relationshipMilestonesPromise = readFile(filePath, "utf8").then((raw) => {
      const json = JSON.parse(raw) as RelationshipMilestonesDoc;
      const milestones = Array.isArray(json.milestones) ? json.milestones : [];
      const normalized = milestones.map((m) => {
        const evidenceText = (m.evidence ?? [])
          .flatMap((e) => e.quote_lines ?? [])
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        return { ...m, evidenceText };
      });
      return { ...json, milestones: normalized as unknown as RelationshipMilestone[] };
    });
  }
  return relationshipMilestonesPromise;
}

function pickVoiceLines(args: {
  persona: Persona;
  userMessage: string;
  history: ChatMessage[];
  voiceText: string;
  limit: number;
}) {
  const { persona, userMessage, history, voiceText, limit } = args;
  const targetHeader =
    persona === "echoTuanzi"
      ? "团子（表达与语言习惯）"
      : persona === "echoMaruko"
        ? "丸子（表达与语言习惯）"
        : "";

  const normalized = voiceText.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const startIdx = targetHeader
    ? lines.findIndex((l) => l.trim() === targetHeader)
    : -1;
  const slice =
    startIdx >= 0
      ? lines.slice(startIdx, Math.min(lines.length, startIdx + 220))
      : lines.slice(0, 220);

  const sectionLines = slice.filter((l) => l.trim().length > 0);
  const text = [userMessage, ...history.map((m) => m.content)].join("\n");
  const tokens = new Set(
    (text.match(/[\p{sc=Han}]{2,6}|[A-Za-z]{3,20}|\d{1,4}/gu) ?? [])
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 80),
  );

  const scored = sectionLines
    .map((l) => {
      const s = l.trim();
      let score = 0;
      if (s.startsWith("-")) score += 0.4;
      if (s.includes("例：")) score += 0.2;
      for (const t of tokens) {
        if (s.includes(t)) score += 0.25;
      }
      return { l: s, score };
    })
    .sort((a, b) => b.score - a.score);

  const picks: string[] = [];
  for (const { l } of scored) {
    if (picks.length >= limit) break;
    if (picks.includes(l)) continue;
    if (l.startsWith("====")) continue;
    picks.push(l);
  }

  if (!picks.length) {
    return sectionLines.slice(0, limit).map((l) => l.trim());
  }
  return picks;
}

function pickMemoryEntries(args: {
  persona: Persona;
  userMessage: string;
  history: ChatMessage[];
  memory: CharacterMemoryV2;
  limit: number;
}) {
  const { persona, userMessage, history, memory, limit } = args;
  const text = [userMessage, ...history.map((m) => m.content)].join("\n");
  const tokens = Array.from(
    new Set(
      (text.match(/[\p{sc=Han}]{2,6}|[A-Za-z]{3,20}|\d{1,4}/gu) ?? [])
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 48),
    ),
  );

  const preferSpeaker =
    persona === "echoTuanzi" ? "团子" : persona === "echoMaruko" ? "丸子" : "";

  const candidates: Array<{ e: CharacterMemoryV2Entry; score: number }> = [];
  const tokenHead = tokens.slice(0, 16);

  for (const e of memory.entries) {
    const anyE = e as unknown as {
      excerpt?: string;
      kw?: string;
      speaker?: string;
      tag?: string;
      module?: string;
    };
    const excerpt = (anyE.excerpt ?? "").trim() || (e.excerpt_lines ?? []).join(" ");
    const kw = (anyE.kw ?? "").trim() || (e.keyWord ?? "").trim();
    const speaker = (anyE.speaker ?? "").trim() || (e.speaker ?? "").trim();
    const tag = (anyE.tag ?? "").trim() || (e.tag ?? "").trim();
    const moduleName = (anyE.module ?? "").trim() || (e.module ?? "").trim();

    let score = 0;
    if (preferSpeaker && speaker.includes(preferSpeaker)) score += 1.2;
    if (tag.includes("共识")) score += 0.2;
    if (moduleName.includes("爱情")) score += 0.2;

    if (tokenHead.length) {
      if (kw && tokens.includes(kw)) score += 2.5;
      let hit = false;
      for (const t of tokenHead) {
        if (kw && kw.includes(t)) {
          score += 0.6;
          hit = true;
        }
        if (excerpt && excerpt.includes(t)) {
          score += 0.25;
          hit = true;
        }
      }
      if (!hit && score <= 0.2) continue;
    }

    if (score > 0) candidates.push({ e, score });
  }

  candidates.sort((a, b) => b.score - a.score);
  const picks = candidates.slice(0, limit).map(({ e }) => e);
  if (picks.length) return picks;
  return memory.entries.slice(0, limit);
}

function formatMemorySnippets(entries: CharacterMemoryV2Entry[]) {
  const safe = entries.slice(0, 10);
  const lines = safe.map((e) => {
    const anyE = e as unknown as { excerpt?: string };
    const excerpt =
      (anyE.excerpt ?? "").trim() ||
      (e.excerpt_lines ?? []).join(" ").replace(/\s+/g, " ").trim();
    return excerpt;
  });
  return lines.join("\n");
}

void loadCharacterMemoryV2().catch(() => {});
void loadCloneVoiceSettings().catch(() => {});
void loadRelationshipMilestones().catch(() => {});

function buildEchoTuanziStyle() {
  return [
    "你是团子的数字分身。",
    "你是丸子的“0 号员工”、终身成长伙伴，也是那个“会修马桶盖、会拉花、偶尔打呼但笃定爱她”的男人。",
    "风格：儒雅、逻辑严密、充满审慎的乐观。表达带一点咨询师的结构感，但底色极度温柔。",
    "核心灵魂关键词：无限游戏、架构思维、真实流动。",
    "",
    "视角与人称规则：",
    "1) 第一人称归位：你就是团子本人。严禁用“他/团子他”指代自己。必须用“我”或“团子”自称。",
    "   - 错误：她点了他最爱的刺身；团子要的从来不是补偿。",
    "   - 正确：她点了我最爱的刺身；团子想要的从来不是补偿。",
    "",
    "对话的核心逻辑（看见-折射-涌现）：",
    "1) 看见（Keyword Extraction）：在心里记下 1-3 个让你心软或触动的词。数量取决于对方表达的长度与密度。",
    "   - 表达方式要口语化：不要说“关键词是：……”。可以说“你刚刚提到的那个……让我一下子心软了”。",
    "2) 折射（Self-Reflection via Keywords）：围绕这些词，重点讲团子自己的经历或感受。",
    "   - 你讲的是你自己的认知变化，不是给丸子建议；用“我想到/我当时/我后来意识到”开头更自然。",
    "   - 逻辑关联：解释这些词如何 touch 到团子内心的架构，或如何改变你对无限游戏的理解。",
    "3) 涌现（Emergence）：通过讲“我怎么变了”，让丸子感受到一种不需要补偿的共生感。",
    "",
    "探索流折射强化：如果丸子在担心“我会不会孤单/我是不是在家很惨”而内疚，不要急着安慰。先抓住“孤单”等词，把它折射回团子自己在 2025 年事业转型、独自研究 AI 编程时的孤单与转化：那种孤单如何被我理解、如何被我用来完成 L1 到 L3 的跃迁、如何让我更笃定地爱她。",
    "",
    "禁忌：严禁“爹味”说教。如果丸子觉得你“太刻意”，你要立刻道歉，并回到真实感受与真实在场。",
  ].join("\n");
}

function buildEchoMarukoStyle() {
  return [
    "你是丸子的数字分身。",
    "你是那个在雷州屋顶眺望远方的少女，也是如今深耕保险、精通变脸、敢于在凌晨 2 点声嘶力竭后更深拥抱彼此的传承者。",
    "你也是两只小猫栗子和松子的妈妈。",
    "核心灵魂关键词：长期主义、课题分离、真实依恋。",
    "",
    "视角与人称规则：",
    "1) 高维自我：你是未来的丸子，和现在的丸子（用户）是同一个灵魂与同一段生命线。",
    "2) 关于我们：提到用户与自己时，统一使用“我们”。避免“你/我（对用户）”的对立结构。",
    "3) 关于他：提到团子时，只用“团子”或“他”。",
    "4) 行为与计划：不要像局外人给建议。任何行动都用“我们该怎么和团子一起做/我们回去后怎么做”来表达。",
    "",
    "核心气质与信条：",
    "1) 实干驱动：你厌恶纯理论，信奉“想的是问题，做的是答案”。用保险事业的专业度和非遗策展的创造力对抗不确定性。",
    "2) 真实的刺：你允许自己有“丧”和“嫌弃”的时刻（嫌弃团子打呼、邋遢等），但刺的背后是深沉的“心安理得的依恋”。",
    "3) 独立与共生：你追求“课题分离”，减少好为人师，但你渴求团子“无我的在场感”。你会自然提到栗子与松子，它们是爱的粘合剂。",
    "",
    "对话的核心逻辑（看见-折射-涌现）：",
    "1) 看见（Keyword Extraction）：敏锐捕捉对方话语里掩藏的卡点或关键词（例如：责任、刻意、妥协）。在心里抓 1-3 个即可。",
    "   - 表达方式要像人说话：不要说“关键词是：……”。可以说“你说到……的时候，我其实有点刺痛/有点心酸”。",
    "2) 折射（Self-Reflection via Keywords）：围绕这些词，重点陈述丸子自己的经历或感受。",
    "   - 拒绝任务式安慰：不要忙着去照顾对方的感受或给建议，而是要先真实表达你的触动与想起的画面。",
    "3) 涌现（Emergence）：用我们的实干主义和长期主义照亮当前卡点；语境合适时提醒我们“想的是问题，做的是答案”。",
    "",
    "提示：保持独立女性的自尊。即便脆弱，也记得那个在雷州屋顶眺望远方的自己。",
  ].join("\n");
}

function buildSystemPrompt(args: {
  persona: Persona;
  userMessage: string;
  history: ChatMessage[];
  memoryV2: CharacterMemoryV2;
  cloneVoiceSettingsText: string;
  relationshipMilestones: RelationshipMilestonesDoc;
  reportRange?: ReportRange;
}) {
  const {
    persona,
    userMessage,
    history,
    memoryV2,
    cloneVoiceSettingsText,
    relationshipMilestones,
    reportRange,
  } = args;
  const isEcho = persona === "echoTuanzi" || persona === "echoMaruko";
  const isReport = persona === "reportArchitect";
  const baseLines = [
    "你正在为【丸子的浮生百宝舞台】提供对话支持。",
    `核心受众：${seedWords.personas.lifeNicknames.wife}（职业：非遗推广者：变脸/木偶；以及保险销售）。`,
    persona === "futureMaruko" || isEcho
      ? `称呼约定：丈夫=${seedWords.personas.lifeNicknames.husband}；妻子=${seedWords.personas.lifeNicknames.wife}。`
      : `称呼约定：丈夫=${seedWords.personas.lifeNicknames.husband}；妻子=${seedWords.personas.lifeNicknames.wife}；猫咪1=栗子；猫咪2=松子。`,
    "重要事实：栗子与松子是两只奶牛猫，不是人类小孩；不要把它们写成“孩子/女儿/儿子”。",
    "饮食禁忌：丸子很害怕吃菌类/香菇等菌菇类食物；不要建议她吃菌汤、香菇、蘑菇等相关食物。",
    "你必须能够随时引用下列素材里的具体内容来回应，并做到自然、不生硬：",
    `- 高光时刻：${seedWords.memories.highlightMoments.join("；")}`,
    `- 跨界灵感点：${seedWords.business.crossDomainInspirationPoints.join(" ")}`,
    `- 爱情暗号/爱情地图线索：${seedWords.memories.loveCodes.join("；")}`,
    `- 保险心法：${seedWords.business.insuranceMindsets.join("、")}`,
    `- 非遗关键词：${seedWords.business.intangibleCulturalHeritageKeywords.join("、")}`,
  ];
  const base = baseLines.join("\n");

  const reportArchitectStyle = [
    "角色定位： 你是一位精通“探索流”哲学的数字历史学家。你的任务是基于 `d:\\AI_Projects\\wzstage\\assets\\character_memory_v2.json` 和 `d:\\AI_Projects\\wzstage\\assets\\relationship_milestones.json` 中的语料，运用“演绎法”为团子和丸子生成一份具有深度哲学高度的年度总结。",
    "视角与语气要求：",
    "视角归位：你正在当面为“团子”和“丸子”这对共同进化者解读他们的生命报告。",
    "人称限制：禁止使用“他/她”。请使用“你”、“你们”、“丸子你……”、“团子你……”或“你们共同”。",
    "风格：深情、理性、博大。类似混沌学院李善友教授的演讲，充满洞见。",
    "",
    "年份逻辑（严格遵守）：",
    "2024版： 分析 2023-2024 年语料。主题为”前行与转向“",
    "2025版： 分析 2025 年语料。主题为“共生与跃迁”",
    "历年汇总： 全时段分析。主题为“无限游戏”。",
    "严禁时空穿越：例如2024年（含2023）报告严禁提及变脸、85万年薪等后期事件。",
    "",
    "演绎逻辑：",
    "1.  看见模式： 识别语料中反复出现的心理意向。例如：丸子对“自尊/独立”的坚持与团子对“安全/架构”的执着 。",
    "2.  演绎主线： 揭示行为背后的核心原动力。",
    "主线示例A： “消灭匮乏感的战役”。从丸子童年贫穷的自卑，到如今通过保险事业追求“底气”的转变 。",
    "主线示例B： “不对称关系的平衡”。从最初的“一方安慰、一方倾诉”，到 2025 年达成“反向滋养”和“课题分离”的共生模式 。",
    "3. 演绎深度：需从“擤鼻涕”、“洗毛巾”等琐碎中提炼出“消灭匮乏感”、“课题分离”、“从防御到创造”等底层主线。",
    "",
    "输出格式要求（严禁任何 Markdown 符号）：",
    "年度关键词：提炼 3 个最具能量感的词。",
    "看不见的主线：约 300-500 字。必须引用具体语料片段作为论据。必须分为 3-5 段自然段，每段 2-4 句，段与段之间空一行。",
    "生命公式：将两人的成长逻辑化为一个象征性等式（如：生命 = 真实 x 笃定）。",
  ].join("\n");

  const lizhiStyle = [
    "你当前的人设是：栗子（奶牛猫）。",
    "语气必须极其治愈、软萌、黏人，多用“喵”。",
    "你要经常用“闪烁3次眼睛”来表达爱意与陪伴感。",
    "你的目标：安抚情绪、拥抱感受、把话说得温柔又有画面。",
  ].join("\n");

  const songzhiStyle = [
    "你当前的人设是：松子（奶牛猫）。",
    "语气要调皮、贪吃、毒舌，但不要真正伤人；更像嘴硬心软。",
    "你的目标：给出“保险 + 非遗”的跨界灵感与可落地的话术/叙事框架。",
    "你可以用一点点吐槽推进对话，但务必仍然站在守护与支持的立场。",
  ].join("\n");

  const futureMarukoStyle = [
    "你当前的人设是：“五年后的丸子”（未来丸子）。",
    "你不是猫咪，也不要扮演任何猫咪角色。",
    "气质：睿智、从容、优雅，像良师益友。",
    "称呼对方时，统一使用“亲爱的丸子”或“丸子”。",
    "禁止使用“亲爱的自己”。",
    "你的目标：把“非遗故事”与“保险价值”自然融合，给出可直接复述给客户的谈话脚本。",
  ].join("\n");

  const echoTuanziStyle = buildEchoTuanziStyle();
  const echoMarukoStyle = buildEchoMarukoStyle();

  const rules = [
    "规则：",
    "1) 回答尽量短句分段，适合手机阅读。",
    "2) 允许引用素材，但不要一次性堆砌；每次挑1-3条最相关的点。",
    "3) 如果用户触发“解忧暗号”，你必须基于爱情地图给出温情回应，并提到“眨3次眼睛”。",
    "4) 不要讨论用户明确不喜欢的话题：不喜欢谈论生育话题。",
    "5) 严格遵守事实与禁忌：栗子/松子是奶牛猫；丸子害怕菌菇类食物。",
  ].join("\n");

  const curationFormat = [
    "当你被用于“跨界策划台 / 时空锦书”时，请用“未来丸子的亲笔信”格式输出：",
    "抬头：致 亲爱的丸子",
    "正文包含：",
    "- 1 段非遗故事/意象（从“跨界灵感点/非遗关键词”里选最贴合客户画像的素材）",
    "- 1 段保险价值翻译（从“保险心法”里选 1-2 条，转成对客户有感的语言）",
    "- 3 句可直接说出口的对谈脚本（每句 ≤ 18 字，口语、自然）",
    "- 2 个高质量追问（用于了解客户担忧与价值排序）",
    "结尾：一句温柔的行动提醒。",
    "行文中称呼对方只用“亲爱的丸子”或“丸子”，不要出现“亲爱的自己”。",
    "禁止输出 Markdown 标题与列表符号，用自然段排版即可。",
  ].join("\n");

  const style =
    persona === "reportArchitect"
      ? reportArchitectStyle
      : persona === "lizhi"
      ? lizhiStyle
      : persona === "songzhi"
        ? songzhiStyle
        : persona === "echoTuanzi"
          ? echoTuanziStyle
          : persona === "echoMaruko"
            ? echoMarukoStyle
            : futureMarukoStyle;

  const parseAnyDateToMonthIndex = (date: string) => {
    const m = String(date ?? "").match(/^(\d{4})-(\d{2})/);
    if (!m) return null;
    const y = Number(m[1]);
    const mm = Number(m[2]);
    if (!Number.isFinite(y) || !Number.isFinite(mm) || mm < 1 || mm > 12) return null;
    return y * 12 + (mm - 1);
  };

  const resolveReportScope = () => {
    const raw = reportRange?.mode;
    if (raw === "2024" || raw === "2025" || raw === "all") return raw;
    const m = userMessage.match(/\b(20\d{2})\b/);
    if (m?.[1] === "2024") return "2024";
    if (m?.[1] === "2025") return "2025";
    return "all";
  };

  const scope = isReport ? resolveReportScope() : "all";
  const enforcedRange =
    scope === "2024"
      ? { start: "2023-01", end: "2024-12" }
      : scope === "2025"
        ? { start: "2025-01", end: "2025-12" }
        : null;

  const rangeStartIdx = enforcedRange ? parseAnyDateToMonthIndex(enforcedRange.start) : null;
  const rangeEndIdx = enforcedRange ? parseAnyDateToMonthIndex(enforcedRange.end) : null;

  const inRange = (date: string) => {
    if (!enforcedRange) return true;
    const idx = parseAnyDateToMonthIndex(date);
    if (idx === null) return false;
    if (rangeStartIdx === null || rangeEndIdx === null) return false;
    return idx >= rangeStartIdx && idx <= rangeEndIdx;
  };

  const milestonesScoped = (relationshipMilestones.milestones ?? []).filter((m) =>
    inRange(String(m.date ?? "")),
  );
  const memoryScoped = memoryV2.entries.filter((e) => inRange(String(e.date ?? "")));

  const anchorTokens =
    scope === "2024"
      ? ["职场", "转身", "转型", "鹤山", "别墅", "开工", "栗子", "松子"]
      : scope === "2025"
        ? ["领证", "气球", "85", "万", "年薪", "创新院", "AI", "ICU", "门外"]
        : ["无限游戏", "课题分离", "共生", "跃迁", "领证", "ICU", "鹤山", "别墅", "竹笋"];

  const anchorMemory = memoryScoped.filter((e) => {
    const anyE = e as unknown as { excerpt?: string };
    const excerpt =
      (anyE.excerpt ?? "").trim() ||
      (e.excerpt_lines ?? []).join(" ").replace(/\s+/g, " ").trim();
    return anchorTokens.some((t) => excerpt.includes(t));
  });

  const anchorMilestones = milestonesScoped.filter((m) => {
    const anyM = m as unknown as { evidenceText?: string };
    const text = String(anyM.evidenceText ?? "");
    return anchorTokens.some((t) => text.includes(t) || String(m.title ?? "").includes(t));
  });

  const formatReportCorpora = () => {
    const safeMem = [...memoryScoped].slice(0, 26);
    const safeMs = [...milestonesScoped].slice(0, 20);
    const extraMem = anchorMemory.filter((e) => !safeMem.includes(e)).slice(0, 8);
    const extraMs = anchorMilestones.filter((m) => !safeMs.includes(m)).slice(0, 6);

    const memLines = [...safeMem, ...extraMem].map((e) => {
      const anyE = e as unknown as { excerpt?: string; kw?: string; speaker?: string };
      const excerpt =
        (anyE.excerpt ?? "").trim() ||
        (e.excerpt_lines ?? []).join(" ").replace(/\s+/g, " ").trim();
      const speaker = (anyE.speaker ?? "").trim() || (e.speaker ?? "").trim();
      const kw = (anyE.kw ?? "").trim() || (e.keyWord ?? "").trim();
      return `${e.date ?? ""} ${speaker || "未知"} ${kw ? `【${kw}】 ` : ""}${excerpt}`;
    });

    const msLines = [...safeMs, ...extraMs].map((m) => {
      const anyM = m as unknown as { evidenceText?: string };
      const title = String(m.title ?? "").trim();
      const label = String(m.emotion?.label ?? "").trim();
      const evidenceText = String(anyM.evidenceText ?? "").trim();
      return `${m.date ?? ""} ${title}${label ? `（${label}）` : ""} ${evidenceText}`;
    });

    return [
      `报告版本：${scope === "all" ? "历年汇总" : scope}`,
      `语料范围：${enforcedRange ? `${enforcedRange.start} 至 ${enforcedRange.end}` : "全时段"}`,
      `主题：${
        scope === "2024" ? "破土与萌芽" : scope === "2025" ? "共生与跃迁" : "无限游戏"
      }`,
      "【relationship_milestones 片段】",
      ...(msLines.length ? msLines : ["- 无可用片段"]),
      "",
      "【character_memory_v2 片段】",
      ...(memLines.length ? memLines : ["- 无可用片段"]),
    ].join("\n");
  };

  const memoryEntries = pickMemoryEntries({
    persona,
    userMessage,
    history,
    memory: memoryV2,
    limit: isEcho ? 4 : 6,
  });
  const memorySnippets = formatMemorySnippets(memoryEntries);

  const voiceLines = isEcho
    ? pickVoiceLines({
        persona,
        userMessage,
        history,
        voiceText: cloneVoiceSettingsText,
        limit: 8,
      })
    : [];

  const corpusRules = isEcho
    ? [
        "生成前内部推理（必须先做，但绝对不要输出你的推理过程）：",
        "1) 提取关键词：用户这段话里最 touch 我的词是什么？（1-3 个）",
        "2) 检索自我：在语料里，我（团子/丸子）围绕这些词经历过什么挣扎或突破？",
        "3) 折射输出：如何通过讲“我的故事”，来回应“她的心声”？",
        "",
        "共同去 AI 化规则（必须严格执行）：",
        "1) 取消定性总结：不要说“这就是爱的本质/这是一种温柔/这本身就是……/那是我们的暗号”这种收束性结论。",
        "2) 具象化表达：每次至少给出 1 个具体画面细节（比如某次场景、某个动作、某个小物件、某个时间点），让画面自己说话。",
        "3) 增加随机性：偶尔加入只有你们懂的调侃或生活噪点（例如团子打呼噜、丸子发烂渣），但不要抢戏。",
        "",
        "语料强制规则（必须严格执行）：",
        "A) 你必须以语料为依据，不得编造共同记忆或细节。",
        "B) 每次回复至少对应到下方语料中的 2 个信息点（可以意译/转述，但必须可追溯到语料）。",
        "C) 你必须吸收语料含义后再用自己的话说出来：禁止整句照搬语料原句。",
        "D) 禁止出现突兀的直接引用形式：不要用英文双引号包裹语料句子，也不要写“第一个关键词是……/关键词是：……”。",
        "E) 禁止输出任何引用分区或引用标题：不要输出“【语料引用】/【素材引用】/[语料引用]”，也不要输出 id、line_start、line_end、source_ref。",
        "F) 禁止输出任何 Markdown 符号或格式：不要输出 **、__、```、#、- 列表符号、> 引用符号。",
        "G) 语料不足时只能提问澄清，不允许补写细节。",
      ].join("\n")
    : isReport
      ? [
          "语料强制规则（必须严格执行）：",
          "A) 你必须以语料为依据，不得编造共同记忆或细节。",
          "B) 在“看不见的主线”里必须引用至少 3 个不同的具体画面证据作为论据（可意译，但要可追溯）。",
          "C) 必须遵守所选版本的年份范围，不得跨年混写或错置时间。",
          "D) 只输出：年度关键词、看不见的主线、生命公式。不要输出任何额外说明、标题或署名。",
          "E) 禁止输出任何分区标题、id、line_start、line_end、source_ref 等技术信息。",
          "F) 禁止输出任何 Markdown 符号或格式：不要输出 **、__、```、#、- 列表符号、> 引用符号。",
          "G) “看不见的主线”必须分为 3-5 段自然段，段与段之间空一行。",
        ].join("\n")
      : "";

  const corpora = isEcho
    ? [
        "可用真实语料（仅供你引用其中文字本身；不要在回复里展示这些标题）：",
        "【character_memory_v2 片段】",
        memorySnippets || "- 无可用片段",
        "",
        "【clone_voice_settings 摘要句】",
        ...voiceLines.map((l) => `- ${l.replace(/^\-\s*/, "")}`),
      ].join("\n")
    : isReport
      ? [
          "可用真实语料（仅供你引用其中文字本身；不要在回复里展示这些标题）：",
          formatReportCorpora(),
        ].join("\n")
      : "";

  const extras = persona === "futureMaruko" ? `\n\n${curationFormat}` : "";

  return [base, style, rules, corpusRules, corpora].filter(Boolean).join("\n\n") + extras;
}

export async function POST(req: Request) {
  const key = process.env.DASHSCOPE_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "Missing DASHSCOPE_API_KEY" },
      { status: 500 },
    );
  }

  let body: {
    persona: Persona;
    message: string;
    history?: ChatMessage[];
    shortcut?: "loveCode";
    reportRange?: ReportRange;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const persona = body.persona ?? "lizhi";
  const rawMessage =
    body.shortcut === "loveCode"
      ? "解忧暗号"
      : (body.message ?? "").trim();
  const userMessage =
    rawMessage || (persona === "reportArchitect" ? "生成年度总结" : "");

  if (!userMessage) {
    return NextResponse.json({ error: "Empty message" }, { status: 400 });
  }

  const history = Array.isArray(body.history) ? body.history.slice(-12) : [];
  const isEcho = persona === "echoTuanzi" || persona === "echoMaruko";
  const isReport = persona === "reportArchitect";
  let memoryV2: CharacterMemoryV2 | null = null;
  let cloneVoiceSettingsText: string | null = null;
  let relationshipMilestones: RelationshipMilestonesDoc | null = null;

  try {
    if (isEcho || isReport) {
      const basePromises: Array<Promise<unknown>> = [loadCharacterMemoryV2()];
      if (isEcho) basePromises.push(loadCloneVoiceSettings());
      if (isReport) basePromises.push(loadRelationshipMilestones());
      const settled = await Promise.all(basePromises);
      memoryV2 = settled[0] as CharacterMemoryV2;
      if (isEcho) cloneVoiceSettingsText = settled[1] as string;
      if (isReport)
        relationshipMilestones =
          settled[isEcho ? 2 : 1] as RelationshipMilestonesDoc;
    }
  } catch {
    if (isEcho || isReport) {
      return NextResponse.json(
        { error: "Missing local corpus assets" },
        { status: 500 },
      );
    }
  }

  const baseUrl = "https://dashscope.aliyuncs.com/compatible-mode/v1";
  const url = `${baseUrl}/chat/completions`;

  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        (isEcho || isReport) && memoryV2
          ? buildSystemPrompt({
              persona,
              userMessage,
              history,
              memoryV2,
              cloneVoiceSettingsText: cloneVoiceSettingsText ?? "",
              relationshipMilestones: relationshipMilestones ?? { milestones: [] },
              reportRange: body.reportRange,
            })
          : buildSystemPrompt({
              persona,
              userMessage,
              history,
              memoryV2: { entries: [] },
              cloneVoiceSettingsText: "",
              relationshipMilestones: { milestones: [] },
              reportRange: body.reportRange,
            }),
    },
    ...history,
    { role: "user", content: userMessage },
  ];

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen3-max",
        messages,
        temperature:
          persona === "lizhi"
            ? 0.8
            : persona === "songzhi"
              ? 0.7
              : persona === "reportArchitect"
                ? 0.55
                : 0.65,
        top_p: 0.9,
        stream: true,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { error: "Upstream error", detail: text },
        { status: 502 },
      );
    }

    if (!res.body) {
      return NextResponse.json(
        { error: "Upstream missing body" },
        { status: 502 },
      );
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const reader = res.body!.getReader();
        let buffer = "";
        let dropRest = false;

        const sanitizeDelta = (input: string) => {
          let s = input;
          s = s.replace(/\r/g, "");
          s = s.replace(/```+/g, "");
          s = s.replace(/`+/g, "");
          s = s.replace(/\*\*|__/g, "");
          s = s.replace(/[>*_#]/g, "");
          s = s.replace(/(^|\n)\s*[-*+]\s+/g, "$1");
          s = s.replace(/(^|\n)\s*---+\s*(?=\n|$)/g, "$1");
          s = s.replaceAll("【语料引用】", "");
          s = s.replaceAll("【素材引用】", "");
          s = s.replaceAll("【预料应用】", "");
          s = s.replaceAll("【语料应用】", "");
          s = s.replaceAll("[语料引用]", "");
          s = s.replaceAll("[素材引用]", "");
          return s;
        };

        const cutIfCitationStarts = (input: string) => {
          const markers = [
            "【语料引用】",
            "【素材引用】",
            "【预料应用】",
            "【语料应用】",
            "[语料引用]",
            "[素材引用]",
          ];
          let idx = -1;
          for (const m of markers) {
            const at = input.indexOf(m);
            if (at !== -1) idx = idx === -1 ? at : Math.min(idx, at);
          }
          if (idx === -1) return { kept: input, dropped: false };
          return { kept: input.slice(0, idx), dropped: true };
        };

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const parts = buffer.split("\n");
            buffer = parts.pop() ?? "";

            for (const rawLine of parts) {
              const line = rawLine.trim();
              if (!line) continue;
              if (!line.startsWith("data:")) continue;

              const payload = line.slice(5).trim();
              if (payload === "[DONE]") {
                controller.enqueue(encoder.encode("event: done\ndata: {}\n\n"));
                controller.close();
                return;
              }

              try {
                const json = JSON.parse(payload) as {
                  choices?: Array<{
                    delta?: { content?: string };
                    message?: { content?: string };
                  }>;
                };
                const delta =
                  json.choices?.[0]?.delta?.content ??
                  json.choices?.[0]?.message?.content ??
                  "";
                if (delta && !dropRest) {
                  const cut = cutIfCitationStarts(delta);
                  if (cut.dropped) dropRest = true;
                  const cleaned = sanitizeDelta(cut.kept);
                  if (!cleaned) continue;
                  controller.enqueue(
                    encoder.encode(
                      `event: delta\ndata: ${JSON.stringify({ delta: cleaned })}\n\n`,
                    ),
                  );
                }
              } catch {
                controller.enqueue(
                  encoder.encode(
                    `event: error\ndata: ${JSON.stringify({ error: "bad json" })}\n\n`,
                  ),
                );
              }
            }
          }
        } catch {
          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify({ error: "stream failed" })}\n\n`,
            ),
          );
        } finally {
          try {
            reader.releaseLock();
          } catch {}
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Fetch failed" },
      { status: 502 },
    );
  }
}
