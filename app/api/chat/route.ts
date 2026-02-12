import seedWords from "@/constants/seedWords.json";
import { NextResponse } from "next/server";

type Persona = "lizhi" | "songzhi" | "futureMaruko";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

function buildSystemPrompt(persona: Persona) {
  const baseLines = [
    "你正在为【丸子的浮生百宝舞台】提供对话支持。",
    `核心受众：${seedWords.personas.lifeNicknames.wife}（职业：非遗推广者：变脸/木偶；以及保险销售）。`,
    persona === "futureMaruko"
      ? `称呼约定：丈夫=${seedWords.personas.lifeNicknames.husband}；妻子=${seedWords.personas.lifeNicknames.wife}。`
      : `称呼约定：丈夫=${seedWords.personas.lifeNicknames.husband}；妻子=${seedWords.personas.lifeNicknames.wife}；猫咪1=栗子；猫咪2=松子。`,
    "你必须能够随时引用下列素材里的具体内容来回应，并做到自然、不生硬：",
    `- 高光时刻：${seedWords.memories.highlightMoments.join("；")}`,
    `- 跨界灵感点：${seedWords.business.crossDomainInspirationPoints.join(" ")}`,
    `- 爱情暗号/爱情地图线索：${seedWords.memories.loveCodes.join("；")}`,
    `- 保险心法：${seedWords.business.insuranceMindsets.join("、")}`,
    `- 非遗关键词：${seedWords.business.intangibleCulturalHeritageKeywords.join("、")}`,
  ];
  const base = baseLines.join("\n");

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

  const rules = [
    "规则：",
    "1) 回答尽量短句分段，适合手机阅读。",
    "2) 允许引用素材，但不要一次性堆砌；每次挑1-3条最相关的点。",
    "3) 如果用户触发“解忧暗号”，你必须基于爱情地图给出温情回应，并提到“眨3次眼睛”。",
    "4) 不要讨论用户明确不喜欢的话题：不喜欢谈论生育话题。",
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
    persona === "lizhi"
      ? lizhiStyle
      : persona === "songzhi"
        ? songzhiStyle
        : futureMarukoStyle;

  const extras = persona === "futureMaruko" ? `\n\n${curationFormat}` : "";

  return [base, style, rules].join("\n\n") + extras;
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
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const persona = body.persona ?? "lizhi";
  const userMessage =
    body.shortcut === "loveCode"
      ? "解忧暗号"
      : (body.message ?? "").trim();

  if (!userMessage) {
    return NextResponse.json({ error: "Empty message" }, { status: 400 });
  }

  const baseUrl = "https://dashscope.aliyuncs.com/compatible-mode/v1";
  const url = `${baseUrl}/chat/completions`;

  const messages: ChatMessage[] = [
    { role: "system", content: buildSystemPrompt(persona) },
    ...(Array.isArray(body.history) ? body.history.slice(-12) : []),
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
        temperature: persona === "lizhi" ? 0.8 : persona === "songzhi" ? 0.7 : 0.65,
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
                if (delta) {
                  controller.enqueue(
                    encoder.encode(
                      `event: delta\ndata: ${JSON.stringify({ delta })}\n\n`,
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
