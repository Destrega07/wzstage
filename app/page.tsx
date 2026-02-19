"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import ChatInterface from "@/components/ChatInterface";
import StageBackground from "@/components/StageBackground";
import seedWords from "../constants/seedWords.json";
import lifeReminders from "../constants/lifeReminders.json";
import lifeMoments from "../constants/lifeMoments.json";

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full rounded-3xl border border-[color:var(--color-dh-border)] bg-[color:var(--color-dh-card)] p-5 backdrop-blur-sm">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight text-[color:var(--color-dh-ink)]">
          {title}
        </h2>
        {subtitle ? (
          <p className="text-sm leading-6 text-[color:color-mix(in_oklab,var(--color-dh-ink),transparent_35%)]">
            {subtitle}
          </p>
        ) : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0 },
};

type TabKey = "curtain" | "shop" | "lab" | "curation";

type LifeMoment = (typeof lifeMoments.moments)[number];

const lifeReminderPool = lifeReminders.dimensions.flatMap((d) => d.items);
const normalizeFutureMarukoLetter = (text: string) =>
  text.replaceAll("亲爱的自己", "亲爱的丸子").replaceAll("小丸子", "丸子");

const LetterBody = memo(function LetterBody({ content }: { content: string }) {
  if (!content.trim()) {
    return (
      <div className="space-y-2">
        <div className="h-4 w-11/12 rounded bg-[color:color-mix(in_oklab,var(--color-dh-ink),transparent_88%)]" />
        <div className="h-4 w-10/12 rounded bg-[color:color-mix(in_oklab,var(--color-dh-ink),transparent_88%)]" />
        <div className="h-4 w-9/12 rounded bg-[color:color-mix(in_oklab,var(--color-dh-ink),transparent_88%)]" />
        <div className="h-4 w-11/12 rounded bg-[color:color-mix(in_oklab,var(--color-dh-ink),transparent_88%)]" />
        <div className="h-4 w-8/12 rounded bg-[color:color-mix(in_oklab,var(--color-dh-ink),transparent_88%)]" />
      </div>
    );
  }

  return (
    <div className="whitespace-pre-wrap text-[15px] leading-8 text-[color:var(--color-dh-ink)] [font-family:var(--font-hand)]">
      {content}
    </div>
  );
});

const SpaceTimeLetter = memo(function SpaceTimeLetter({
  content,
  ps,
  isLoading,
  isOpen,
  onDownload,
}: {
  content: string;
  ps: string;
  isLoading: boolean;
  isOpen: boolean;
  onDownload: () => void;
}) {
  const showContent = content.trim();
  const showPs = ps.trim();

  return (
    <motion.div
      initial={{
        opacity: 0,
        clipPath: "inset(0 0 100% 0 round 28px)",
      }}
      animate={
        isOpen
          ? { opacity: 1, clipPath: "inset(0 0 0% 0 round 28px)" }
          : { opacity: 1, clipPath: "inset(0 0 100% 0 round 28px)" }
      }
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="relative overflow-hidden rounded-[28px] border border-[color:color-mix(in_oklab,var(--color-dh-gold),transparent_60%)] bg-[linear-gradient(180deg,#fbf2d9_0%,#f8edd1_45%,#f7e9c9_100%)] shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.22] [background-image:repeating-linear-gradient(0deg,rgba(56,35,5,0.18)_0,rgba(56,35,5,0.18)_1px,transparent_1px,transparent_18px)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:radial-gradient(circle_at_20%_30%,rgba(0,0,0,0.65)_0,transparent_55%),radial-gradient(circle_at_85%_65%,rgba(0,0,0,0.55)_0,transparent_60%)]" />
      <div className="relative p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="text-xs font-semibold tracking-[0.18em] text-[color:color-mix(in_oklab,var(--color-dh-ink),transparent_35%)]">
            时空锦书
          </div>
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-[color:color-mix(in_oklab,var(--color-dh-gold),transparent_55%)] bg-white/30">
            <Image
              src="/future-maruko.png"
              alt="未来丸子"
              fill
              sizes="40px"
              className="object-cover"
            />
          </div>
        </div>

        <div className="mt-5">
          <LetterBody
            content={
              showContent
                ? showContent
                : isLoading
                  ? ""
                  : "致 亲爱的丸子：\n输入一个模糊想法或困惑，让五年后的我替你把话织成“非遗故事 + 保险价值”的谈话脚本。"
            }
          />
        </div>

        {showPs && !isLoading ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="mt-5 text-[13px] leading-7 text-[color:color-mix(in_oklab,var(--color-dh-ink),transparent_42%)] [font-family:var(--font-hand)]"
          >
            P.S. {showPs} ♡
          </motion.div>
        ) : null}

        <div className="mt-6 flex items-end justify-between gap-4">
          <div className="text-[13px] text-[color:color-mix(in_oklab,var(--color-dh-ink),transparent_18%)] [font-family:var(--font-hand)]">
            爱你的，五年后的丸子
          </div>
          <button
            type="button"
            onClick={onDownload}
            disabled={!showContent}
            className="grid h-10 w-10 place-items-center rounded-2xl border border-[color:color-mix(in_oklab,var(--color-dh-gold),transparent_55%)] bg-white/30 text-[color:var(--color-dh-ink)] shadow-sm disabled:opacity-40"
            aria-label="下载信函"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 3v10m0 0l4-4m-4 4L8 9"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M5 14v4a3 3 0 003 3h8a3 3 0 003-3v-4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </motion.div>
  );
});

const SpaceTimeComposer = memo(function SpaceTimeComposer({
  value,
  onChange,
  onSend,
  isLoading,
}: {
  value: string;
  onChange: (next: string) => void;
  onSend: () => void;
  isLoading: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  const syncHeight = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    const next = Math.min(220, Math.max(64, el.scrollHeight));
    el.style.height = `${next}px`;
  }, []);

  useEffect(() => {
    syncHeight();
  }, [value, syncHeight]);

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/20 bg-white/10 shadow-[0_16px_60px_rgba(0,0,0,0.22)] backdrop-blur-md">
      <div className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:radial-gradient(700px_circle_at_20%_-10%,color-mix(in_oklab,var(--color-dh-gold),transparent_55%),transparent_70%),radial-gradient(700px_circle_at_90%_110%,color-mix(in_oklab,var(--color-dh-azure),transparent_70%),transparent_70%)]" />
      <div className="relative p-4">
        <div className="absolute left-4 top-4 z-10">
          <div className="relative h-9 w-9 overflow-hidden rounded-full border border-white/25 bg-white/10">
            <Image
              src="/maruko-avatar.png"
              alt="丸子"
              fill
              sizes="36px"
              className="object-cover"
            />
          </div>
        </div>

        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder="输入模糊想法或困惑，让未来丸子出主意"
          className="min-h-16 w-full resize-none rounded-2xl border border-white/10 bg-transparent px-4 pb-12 pt-12 text-sm leading-7 text-[color:var(--color-dh-ink)] outline-none placeholder:text-[color:color-mix(in_oklab,var(--color-dh-ink),transparent_55%)]"
        />

        <motion.button
          type="button"
          disabled={!value.trim() || isLoading}
          onClick={onSend}
          whileTap={{ scale: 0.96 }}
          className="absolute bottom-4 right-4 grid h-11 w-11 place-items-center overflow-hidden rounded-2xl border border-[color:color-mix(in_oklab,var(--color-dh-gold),transparent_35%)] bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-dh-gold),transparent_10%),color-mix(in_oklab,var(--color-dh-gold),transparent_55%))] text-[color:var(--color-dh-ink)] shadow-sm disabled:opacity-60"
          aria-label="发送"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="relative z-10"
          >
            <path
              d="M3.4 11.2l17.8-7.6-7.6 17.8-3.2-7.1-7-3.1z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path
              d="M10.4 14.4L21.2 3.6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          {isLoading ? (
            <motion.span
              aria-hidden="true"
              initial={{ x: "-70%" }}
              animate={{ x: "170%" }}
              transition={{ duration: 1.05, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-y-0 left-0 w-1/2 bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--color-dh-paper),transparent_25%),transparent)] blur-[1px]"
            />
          ) : null}
        </motion.button>
      </div>
    </div>
  );
});

function CrossDomainPlanningDesk() {
  const [input, setInput] = useState("");
  const [letter, setLetter] = useState("");
  const [draft, setDraft] = useState("");
  const [ps, setPs] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [errorText, setErrorText] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const draftRafRef = useRef<number | null>(null);
  const draftFullRef = useRef<string>("");

  useEffect(() => {
    const hasContent = (draft || letter).trim().length > 0;
    if (hasContent && !isOpen) setIsOpen(true);
  }, [draft, letter, isOpen]);

  const downloadLetter = useCallback(() => {
    const content = (letter || draft).trim();
    if (!content) return;
    const psLine = ps.trim() ? `\n\nP.S. ${ps.trim()} ♡` : "";
    const payload = `${content}${psLine}\n\n爱你的，五年后的丸子\n`;
    const blob = new Blob([payload], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "跨界策划台-时空锦书.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [draft, letter, ps]);

  const send = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    setErrorText("");
    setLetter("");
    setDraft("");
    setPs("");
    setIsLoading(true);

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    if (draftRafRef.current) cancelAnimationFrame(draftRafRef.current);
    draftRafRef.current = null;
    draftFullRef.current = "";

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ac.signal,
        body: JSON.stringify({
          persona: "futureMaruko",
          message: `客户画像或困惑：${trimmed}\n请以“时空锦书/未来丸子的亲笔信”输出一段可直接复述给客户的谈话脚本。`,
          history: [],
        }),
      });

      if (!res.ok) throw new Error("bad response");
      if (!res.body) throw new Error("missing body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        while (true) {
          const idx = buffer.indexOf("\n\n");
          if (idx === -1) break;

          const frame = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);

          let eventName = "message";
          let dataLine = "";
          for (const line of frame.split("\n")) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith("event:")) {
              eventName = trimmedLine.slice(6).trim();
            } else if (trimmedLine.startsWith("data:")) {
              dataLine += trimmedLine.slice(5).trim();
            }
          }

          if (eventName === "delta") {
            try {
              const parsed = JSON.parse(dataLine) as { delta?: string };
              const delta = parsed.delta ?? "";
              if (delta) {
                draftFullRef.current += delta;
                if (!draftRafRef.current) {
                  draftRafRef.current = requestAnimationFrame(() => {
                    draftRafRef.current = null;
                    setDraft(draftFullRef.current);
                  });
                }
              }
            } catch {}
          } else if (eventName === "done") {
            setDraft("");
            const finalText = normalizeFutureMarukoLetter(
              draftFullRef.current.trim(),
            );
            setLetter(finalText);
            if (lifeReminderPool.length) {
              const picked =
                lifeReminderPool[
                  Math.floor(Math.random() * lifeReminderPool.length)
                ] ?? "";
              setPs(picked);
            }
            setIsLoading(false);
            return;
          }
        }
      }

      setDraft("");
      const finalText = normalizeFutureMarukoLetter(draftFullRef.current.trim());
      setLetter(finalText);
      if (lifeReminderPool.length) {
        const picked =
          lifeReminderPool[Math.floor(Math.random() * lifeReminderPool.length)] ??
          "";
        setPs(picked);
      }
      setIsLoading(false);
    } catch {
      setIsLoading(false);
      setDraft("");
      setErrorText("亲爱的丸子，风声太大了，锦书还没送到。再试一次。");
    }
  }, [input, isLoading]);

  const shown = (draft || letter).trim();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.65)]">
          跨界策划台
        </h2>
        <div className="text-sm leading-6 text-white/85 drop-shadow-[0_2px_4px_rgba(0,0,0,0.55)]">
          让五年后的丸子为今天的你出主意，实现非遗和保险的跨界策展。
        </div>
      </div>

      <SpaceTimeComposer
        value={input}
        onChange={setInput}
        onSend={send}
        isLoading={isLoading}
      />

      {errorText ? (
        <div className="px-1 text-xs text-white/85 drop-shadow-[0_2px_4px_rgba(0,0,0,0.55)]">
          {errorText}
        </div>
      ) : null}

      <SpaceTimeLetter
        content={shown}
        ps={ps}
        isLoading={isLoading}
        isOpen={isOpen}
        onDownload={downloadLetter}
      />
    </div>
  );
}

const tuanziLongLetter = `亲爱的丸子：

当丸子在“浮生百宝舞台”的深处开启这封信时，我们已经共同写下了许多最美的诗篇。三十而立，这三十个瞬间在卷轴上一一闪过，像是三十颗被打磨得浑圆透明的珍珠。作为你的团子和“呼噜大王”，我边回溯记忆长河，边写下这封《团子眼中的丸子三十年》。

回响——丸子给我力量

在时光长廊中的三十个瞬间里，我看到了一个从雷州乡村屋顶眺望远方的小女孩，一步步成为我眼中那位拥有更宏大世界的大女孩。

丸子给我的第一股力量是“破茧成蝶的韧性”。我永远记得你如何克服心理障碍，在收翻蹬夹之间激起浪花，快速学会了游泳 ；记得你只用了三节课就自学拿下四首古琴曲，让家中从此多了悠扬的琴声 。这种不断突破自我边界的勇气，让我在面对生活的挑战时，总能想起你苦练“孙悟空猴戏”曾挥洒的汗水，感受到“有如橡树种子顶开巨石，然后逐渐生长成的参天大树的顽强生命力”。

丸子给我的第二股力量是“高远纯粹的理想”。从你穿针引线为我缝制那头蕴含真情的小醒狮开始，你就带我走进了一个更有意义的世界 。你立志传承和发扬中华传统文化的理想，像是一束光，照亮了我的愿景，让我从一个职场打工人，成长为一个拥有利他品格的创业者。感谢你，让我获得了更丰富的人生和更宏大的世界。

展望——在 AI 时代共同成长

三十岁是一个崭新的起点，我们将继续在真实与虚拟的交织中，全情续写未来的故事 。

在爱情长河里， 我会继续守护我们那种独特的柔长的归属感 。我会坚持每天早晨为你做一份元气早餐，冲一杯带“大白心”的咖啡，那是爱的陪伴。我期待与你继续每月一次的“探索流”，在“表达-聆听-呼应-涌现”中更新我们的爱情地图，让每一个“眨3次眼睛”的瞬间都成为永恒。

在事业赛道上， 我们的“醒狮精神”将继续共舞 。我会陪你继续深耕非遗文化，利用 AI 的魔法让传统技艺焕发新颜。丸子练就川剧变脸，成功“混迹”非遗圈，而我也在AI应用的赛道上狂奔，融汇AI的创造力和生产力。未来我们将一起经营 薪竹文化和欸艾工作室，让你的非遗策展和我的咨询服务，在数字世界里共同生长，影响更多的人 。

在世界探索中， 我们将一起去实现更多个“见证日出”之约。华山之巅的携手观日，青海湖之畔的相拥静听，赛里木湖之滨的并肩冥想，丹寨微雨中的齐步晨跑，每一次并肩前行，都是我们对抗时间、丰富人生的见证 。

承诺——未来七十年相伴相依

可曾记得团子发起的【2022 年至 2100 年人生之约】？ 三十岁只是开始的一小段，后面还有七十年：）

在这段说不上无忧无虑、但必然甘苦与共的时光里 ，我承诺将所有的爱情专属行为都只留给你 。将以的坚定来应对无限的不确定性 ，持续优化我那份“张弛有道的关怀”：在你需要倾听时第一时间出现，在你闹情绪时给你温柔的缓冲 。

我会持续在我们的真实生活中投入爱与耐心，也会在虚拟空间里不断丰富这个【丸子的浮生百宝舞台】。它是丸子过去三十年的浓缩，也将记录我们未来七十年的华彩。

愿你依然是那个敢于向未来发问、会变脸、懂古琴的奇女子。而我，永远是你最安稳恬静又热情洋溢的港湾 。

鹊桥仙 · 珍珠华年

变脸瞬息，琴音悠远，珍珠而立华年。 晨光拉花大白心，共探索流深情款。
雄狮伴舞，AI指路，七十长路并肩。 两心若在久长时，又岂在朝朝暮暮。

深爱你的团子 乙巳蛇年十二月廿五`;

function TimeArtExhibition() {
  const moments = lifeMoments.moments as LifeMoment[];
  const visibleMoments = moments;
  const [eggOpen, setEggOpen] = useState(false);
  const pressTimerRef = useRef<number | null>(null);
  const clickResetTimerRef = useRef<number | null>(null);
  const clickCountRef = useRef(0);

  const openEgg = useCallback(() => {
    setEggOpen(true);
    clickCountRef.current = 0;
    if (clickResetTimerRef.current) {
      window.clearTimeout(clickResetTimerRef.current);
      clickResetTimerRef.current = null;
    }
  }, []);

  const closeEgg = useCallback(() => {
    setEggOpen(false);
  }, []);

  const stopPress = useCallback(() => {
    if (pressTimerRef.current) {
      window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }, []);

  const startPress = useCallback(() => {
    stopPress();
    pressTimerRef.current = window.setTimeout(() => {
      pressTimerRef.current = null;
      openEgg();
    }, 3000);
  }, [openEgg, stopPress]);

  const onEggClick = useCallback(() => {
    clickCountRef.current += 1;
    if (clickCountRef.current >= 3) {
      openEgg();
      return;
    }
    if (clickResetTimerRef.current) window.clearTimeout(clickResetTimerRef.current);
    clickResetTimerRef.current = window.setTimeout(() => {
      clickResetTimerRef.current = null;
      clickCountRef.current = 0;
    }, 800);
  }, [openEgg]);

  useEffect(() => {
    return () => {
      stopPress();
      if (clickResetTimerRef.current) window.clearTimeout(clickResetTimerRef.current);
    };
  }, [stopPress]);

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-1 px-1">
        <h2 className="text-xl font-semibold tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.65)]">
          时光艺术展
        </h2>
        <div className="text-sm leading-6 text-white/85 drop-shadow-[0_2px_4px_rgba(0,0,0,0.55)]">
          纵向滑动的数字叙事长卷
        </div>
      </div>

      <div className="flex flex-col gap-16">
        {visibleMoments.map((m, idx) => {
          const cat =
            m.guidePersona === "lizhi"
              ? { name: "栗子", avatar: "/lizhi-avatar.png" }
              : { name: "松子", avatar: "/songzhi-avatar.png" };

          return (
            <div
              key={m.id}
              className="flex min-h-[calc(100dvh-240px)] flex-col justify-center gap-5 py-8"
            >
              <motion.div
                initial={{ opacity: 0, y: 26, scale: 0.985 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                viewport={{ once: true, amount: 0.55 }}
                className="w-full"
              >
                <div className="relative mx-auto aspect-[4/5] w-full max-w-[560px] overflow-hidden bg-black/10 shadow-[0_18px_70px_rgba(0,0,0,0.30)]">
                  <Image
                    src={m.imageSrc}
                    alt={`${m.id} ${m.shortName}`}
                    fill
                    sizes="(max-width: 768px) 92vw, 560px"
                    className="object-cover"
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.50))]" />
                </div>
              </motion.div>

              <div className="mx-auto w-full max-w-[560px] px-1">
                <div className="text-sm font-semibold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
                  {m.id} · {m.shortName}
                </div>
                <div className="mt-1 text-sm leading-6 text-white/85 drop-shadow-[0_2px_4px_rgba(0,0,0,0.55)]">
                  {m.description}
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                viewport={{ amount: 0.7, margin: "-35% 0px -35% 0px" }}
                className="mx-auto flex w-full max-w-[560px] items-end gap-2 px-1"
              >
                <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-white/20 bg-white/10">
                  <Image
                    src={cat.avatar}
                    alt={cat.name}
                    fill
                    sizes="36px"
                    className="object-cover"
                  />
                </div>
                <div className="max-w-[82%] whitespace-pre-wrap bg-[color:color-mix(in_oklab,var(--color-dh-paper),transparent_35%)] px-3 py-2 text-sm leading-6 text-[color:var(--color-dh-ink)] shadow-[0_10px_40px_rgba(0,0,0,0.18)]">
                  {m.guideText}
                </div>
              </motion.div>

              {idx === visibleMoments.length - 1 ? (
                <div className="mx-auto mt-8 w-full max-w-[560px] px-1 pb-8">
                  <div className="flex justify-end">
                    <motion.button
                      type="button"
                      onClick={onEggClick}
                      onPointerDown={startPress}
                      onPointerUp={stopPress}
                      onPointerCancel={stopPress}
                      onPointerLeave={stopPress}
                      whileTap={{ scale: 0.96 }}
                      className="relative grid h-10 w-10 place-items-center text-[color:var(--color-dh-red)]"
                      aria-label="隐藏的 0.1"
                    >
                      <motion.span
                        aria-hidden="true"
                        initial={{ opacity: 0.4 }}
                        animate={{ opacity: [0.35, 0.85, 0.35] }}
                        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute inset-0 rounded-full bg-white/10"
                      />
                      <motion.span
                        aria-hidden="true"
                        initial={{ scale: 1 }}
                        animate={{ scale: [1, 1.12, 1] }}
                        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                        className="relative text-[18px] leading-none"
                      >
                        ♥
                      </motion.span>
                    </motion.button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {eggOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50"
          >
            <div
              className="absolute inset-0 bg-black/55 backdrop-blur-sm"
              onClick={closeEgg}
            />
            <motion.div
              initial={{ opacity: 0, y: 18, clipPath: "inset(0 0 100% 0)" }}
              animate={{ opacity: 1, y: 0, clipPath: "inset(0 0 0% 0)" }}
              exit={{ opacity: 0, y: 18, clipPath: "inset(0 0 100% 0)" }}
              transition={{ duration: 0.65, ease: "easeOut" }}
              className="absolute inset-x-0 top-0 mx-auto h-dvh w-full max-w-3xl overflow-hidden bg-[linear-gradient(180deg,#fbf2d9_0%,#f8edd1_45%,#f7e9c9_100%)] shadow-[0_30px_120px_rgba(0,0,0,0.55)]"
            >
              <div className="pointer-events-none absolute inset-0 opacity-[0.22] [background-image:repeating-linear-gradient(0deg,rgba(56,35,5,0.18)_0,rgba(56,35,5,0.18)_1px,transparent_1px,transparent_18px)]" />
              <div className="relative flex h-full flex-col">
                <div className="flex items-center justify-between gap-3 px-5 pt-[calc(16px+env(safe-area-inset-top))]">
                  <div className="text-xs font-semibold tracking-[0.18em] text-[color:color-mix(in_oklab,var(--color-dh-ink),transparent_35%)]">
                    团子致丸子
                  </div>
                  <button
                    type="button"
                    onClick={closeEgg}
                    className="grid h-10 w-10 place-items-center rounded-2xl border border-[color:color-mix(in_oklab,var(--color-dh-gold),transparent_55%)] bg-white/30 text-[color:var(--color-dh-ink)]"
                    aria-label="关闭"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M6 6l12 12M18 6L6 18"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>
                <div className="mt-4 flex-1 overflow-y-auto px-6 pb-[calc(28px+env(safe-area-inset-bottom))]">
                  <div className="whitespace-pre-wrap text-[15px] leading-8 text-[color:var(--color-dh-ink)] [font-family:var(--font-hand)]">
                    {tuanziLongLetter}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default function Home() {
  const [tab, setTab] = useState<TabKey>("curtain");

  const backgroundSrc = useMemo(() => {
    if (tab === "curtain") return "/bg-curtain.png";
    if (tab === "shop") return "/bg-shop.png";
    if (tab === "lab") return "/bg-lab.png";
    return "/bg-curation.png";
  }, [tab]);

  const tabLabel = useMemo(() => {
    if (tab === "curtain") return "时光艺术展";
    if (tab === "shop") return "解忧杂货铺";
    if (tab === "lab") return "探索实验室";
    return "跨界策划台";
  }, [tab]);

  return (
    <StageBackground backgroundSrc={backgroundSrc}>
      <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col">
        <motion.header
          variants={fadeUp}
          initial="hidden"
          animate="show"
          transition={{ duration: 0.5 }}
          className="px-5 pt-6"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-1">
              <h1 className="truncate text-2xl font-semibold tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                丸子的浮生百宝舞台
              </h1>
              {tab !== "curation" && tab !== "shop" && tab !== "curtain" ? (
                <p className="text-sm leading-6 text-[color:color-mix(in_oklab,var(--color-dh-ink),transparent_35%)]">
                  {tabLabel} · 敦煌五彩 · 盲盒治愈感
                </p>
              ) : null}
            </div>
            {tab !== "curation" && tab !== "shop" && tab !== "curtain" ? (
              <div className="shrink-0 text-right">
                <div className="text-xs font-medium text-[color:color-mix(in_oklab,var(--color-dh-ink),transparent_40%)]">
                  {seedWords.personas.lifeNicknames.wife} · 30 岁
                </div>
                <div className="mt-1 text-[10px] leading-4 text-[color:color-mix(in_oklab,var(--color-dh-ink),transparent_50%)]">
                  {seedWords.personas.lifeNicknames.cat1} /{" "}
                  {seedWords.personas.lifeNicknames.cat2}
                </div>
              </div>
            ) : null}
          </div>
        </motion.header>

        <div className="flex-1 overflow-y-auto px-5 pb-[calc(96px+env(safe-area-inset-bottom))] pt-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col gap-4"
            >
              {tab === "curtain" ? (
                <TimeArtExhibition />
              ) : null}

              {tab === "shop" ? (
                <div className="flex flex-col gap-3 px-1">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-stretch justify-between gap-3">
                      <h2 className="text-xl font-semibold leading-7 tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.65)]">
                        解忧杂货铺
                      </h2>
                      <div className="relative h-7 w-[140px] opacity-85">
                        <Image
                          src="/cat-steps.png"
                          alt=""
                          fill
                          sizes="140px"
                          className="object-contain"
                        />
                      </div>
                    </div>
                    <p className="text-sm leading-6 text-white/85 drop-shadow-[0_2px_4px_rgba(0,0,0,0.55)]">
                      栗子和松子随时待命，点击面具图标切换哥俩吧
                    </p>
                  </div>

                  <ChatInterface />
                </div>
              ) : null}

              {tab === "lab" ? (
                <SectionCard
                  title="探索实验室"
                  subtitle="记录“探索流”深度沟通档案（占位）。"
                >
                  <div className="grid gap-2">
                    {seedWords.memories.loveCodes.map((t) => (
                      <div
                        key={t}
                        className="rounded-3xl border border-[color:var(--color-dh-border)] bg-[color:color-mix(in_oklab,var(--color-dh-purple),transparent_86%)] px-4 py-3 text-sm leading-6"
                      >
                        {t}
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-3xl border border-[color:var(--color-dh-border)] bg-[color:color-mix(in_oklab,var(--color-dh-paper),transparent_25%)] p-4">
                    <div className="text-sm font-medium">实验室入口</div>
                    <div className="mt-1 text-xs leading-5 text-[color:color-mix(in_oklab,var(--color-dh-ink),transparent_45%)]">
                      下一步：把每次探索流的“主题-表达-聆听-呼应-涌现”写入结构化档案。
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {seedWords.personas.thirtyKeywords.map((k) => (
                        <span
                          key={k}
                          className="inline-flex items-center rounded-full border border-[color:var(--color-dh-border)] bg-[color:color-mix(in_oklab,var(--color-dh-sand),transparent_50%)] px-3 py-1 text-xs"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                </SectionCard>
              ) : null}

              {tab === "curation" ? (
                <div className="flex flex-col gap-4 px-1">
                  <CrossDomainPlanningDesk />
                </div>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20">
          <div className="pointer-events-auto mx-auto w-full max-w-3xl px-4 pb-[calc(12px+env(safe-area-inset-bottom))]">
            <div className="rounded-3xl border border-[color:var(--color-dh-border)] bg-[color:color-mix(in_oklab,var(--color-dh-card),transparent_10%)] p-2 backdrop-blur-md">
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ["curtain", "时光艺术展"],
                    ["shop", "解忧杂货铺"],
                    ["curation", "跨界策划台"],
                  ] as const
                ).map(([key, label]) => {
                  const active = tab === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTab(key)}
                      className={`h-11 rounded-2xl px-2 text-xs font-medium transition-colors ${
                        active
                          ? "bg-[color:var(--color-dh-ink)] text-[color:var(--color-dh-paper)]"
                          : "bg-transparent text-[color:color-mix(in_oklab,var(--color-dh-ink),transparent_25%)] hover:bg-[color:color-mix(in_oklab,var(--color-dh-paper),transparent_35%)]"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </StageBackground>
  );
}
