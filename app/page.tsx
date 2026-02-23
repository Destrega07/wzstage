"use client";

import { AnimatePresence, motion } from "framer-motion";
import Lottie from "lottie-react";
import Image from "next/image";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import ChatInterface from "@/components/ChatInterface";
import StageBackground from "@/components/StageBackground";
import seedWords from "../constants/seedWords.json";
import lifeReminders from "../constants/lifeReminders.json";
import lifeMoments from "../constants/lifeMoments.json";

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0 },
};

type TabKey = "curtain" | "shop" | "lab" | "curation";

type LifeMoment = (typeof lifeMoments.moments)[number];

const lifeReminderPool = lifeReminders.dimensions.flatMap((d) => d.items);
const normalizeFutureMarukoLetter = (text: string) =>
  text.replaceAll("亲爱的自己", "亲爱的丸子").replaceAll("小丸子", "丸子");

type ExploreSubTab = "starmap" | "lifetree" | "echo" | "spark";

type CharacterMemoryEntry = {
  id: string;
  date: string;
  tag: string;
  module: string;
  speaker: string;
  timestamp?: string;
  keyWord?: string;
  excerpt_lines: string[];
  source_ref?: {
    path: string;
    line_start: number;
    line_end: number;
  };
};

type RelationshipMilestone = {
  milestone_id: string;
  date: string;
  title: string;
  type: string;
  people: string[];
  emotion: { score: number; label: string };
  related_memory_ids?: string[];
};

type SkillEvolutionMap = {
  people: Record<
    string,
    {
      stage_ladder: Array<{
        stage_id: string;
        time: { start: string; end?: string; confidence: string };
        role_label: string;
        skills: Array<{
          name: string;
          evidence?: Array<{
            source_ref?: {
              path: string;
              line_start: number;
              line_end: number;
            };
            quote_lines?: string[];
            memory_ref_ids?: string[];
          }>;
        }>;
      }>;
      skill_threads?: Array<{
        thread_id: string;
        title: string;
        evidence?: Array<{
          source_ref?: {
            path: string;
            line_start: number;
            line_end: number;
          };
          quote_lines?: string[];
          memory_ref_ids?: string[];
        }>;
      }>;
    }
  >;
};

type ExplorationAssets = {
  memories: CharacterMemoryEntry[];
  milestones: RelationshipMilestone[];
  skillMap: SkillEvolutionMap | null;
  cloneVoiceSettingsText: string;
};

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

function hashStringToNumber(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function formatMonthLabel(date: string) {
  const m = date.match(/^(\d{4})-(\d{2})$/);
  if (!m) return date;
  return `${m[1]}-${m[2]}`;
}

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

function SegmentedControl({
  value,
  onChange,
}: {
  value: ExploreSubTab;
  onChange: (next: ExploreSubTab) => void;
}) {
  const items = useMemo(
    () =>
      [
        ["starmap", "时光星图"],
        ["lifetree", "生命之树"],
        ["echo", "分身呼应"],
        ["spark", "岁月回响"],
      ] as const,
    [],
  );

  return (
    <div className="relative w-full">
      <div className="flex gap-2 overflow-x-auto rounded-[22px] border border-white/15 bg-white/10 p-1 backdrop-blur-md [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map(([key, label]) => {
          const active = value === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className="relative shrink-0 px-4 py-2 text-xs font-medium tracking-wide text-white/85"
            >
              {active ? (
                <motion.span
                  layoutId="explore-seg"
                  className="absolute inset-0 rounded-[18px] bg-white/20"
                  transition={{ type: "spring", stiffness: 520, damping: 42 }}
                />
              ) : null}
              <span className="relative z-10">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const StarFieldCanvas = memo(function StarFieldCanvas({
  seed,
  density,
}: {
  seed: number;
  density: number;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const canvasEl = canvas;
    const ctx2 = ctx;

    let raf = 0;
    const rng = mulberry32(seed);
    const stars = Array.from({ length: density }).map(() => ({
      x: rng(),
      y: rng(),
      r: 0.55 + rng() * 1.65,
      a: 0.15 + rng() * 0.85,
      s: 0.15 + rng() * 0.7,
      p: rng() * Math.PI * 2,
    }));

    function resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = canvasEl.getBoundingClientRect();
      canvasEl.width = Math.max(1, Math.floor(rect.width * dpr));
      canvasEl.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvasEl);

    let t = 0;
    const draw = () => {
      t += 1;
      const rect = canvasEl.getBoundingClientRect();
      ctx2.clearRect(0, 0, rect.width, rect.height);
      ctx2.fillStyle = "rgba(255,255,255,1)";

      for (const s of stars) {
        const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 0.02 * s.s + s.p));
        ctx2.globalAlpha = s.a * twinkle;
        const x = s.x * rect.width;
        const y = s.y * rect.height;
        ctx2.beginPath();
        ctx2.arc(x, y, s.r, 0, Math.PI * 2);
        ctx2.fill();
      }

      ctx2.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [seed, density]);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" />;
});

type StarMapMode = "cloud" | "map";

type StarPoint = {
  id: string;
  tag: string;
  keyword: string;
  memory: CharacterMemoryEntry;
  xT: number;
  jx: number;
  jy: number;
  color: string;
  glow: string;
  score: number;
};

function getTagPalette(tag: string) {
  if (tag === "火花") {
    return {
      color: "rgba(255,210,120,0.95)",
      glow: "rgba(255,210,120,0.55)",
    };
  }
  if (tag === "顿悟") {
    return {
      color: "rgba(150,220,255,0.95)",
      glow: "rgba(150,220,255,0.55)",
    };
  }
  if (tag === "共识") {
    return {
      color: "rgba(235,235,255,0.90)",
      glow: "rgba(235,235,255,0.45)",
    };
  }
  return {
    color: "rgba(205,180,255,0.92)",
    glow: "rgba(205,180,255,0.40)",
  };
}

function parseYearMonthToIndex(date: string) {
  const m = date.match(/^(\d{4})-(\d{2})$/);
  if (!m) return 0;
  const y = Number(m[1]);
  const mm = Number(m[2]);
  return y * 12 + (mm - 1);
}

function StarMapCanvas({
  points,
  onSelect,
}: {
  points: StarPoint[];
  onSelect: (m: CharacterMemoryEntry) => void;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const pointsRef = useRef<StarPoint[]>(points);
  const derivedRef = useRef<Array<StarPoint & { x: number; y: number; r: number }>>(
    [],
  );

  useEffect(() => {
    pointsRef.current = points;
  }, [points]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const canvasEl = canvas;
    const ctx2 = ctx;

    let raf = 0;

    function resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = canvasEl.getBoundingClientRect();
      canvasEl.width = Math.max(1, Math.floor(rect.width * dpr));
      canvasEl.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvasEl);

    const drawSmoothCurve = (pts: Array<{ x: number; y: number }>) => {
      if (pts.length < 2) return;

      ctx2.save();
      const rect = canvasEl.getBoundingClientRect();
      const g = ctx2.createLinearGradient(0, 0, rect.width, 0);
      g.addColorStop(0, "rgba(255,210,120,0.08)");
      g.addColorStop(0.45, "rgba(255,210,120,0.65)");
      g.addColorStop(1, "rgba(255,210,120,0.18)");

      ctx2.strokeStyle = g;
      ctx2.lineWidth = 1.6;
      ctx2.shadowColor = "rgba(255,210,120,0.45)";
      ctx2.shadowBlur = 10;
      ctx2.beginPath();
      ctx2.moveTo(pts[0].x, pts[0].y);

      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i - 1] ?? pts[i];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[i + 2] ?? p2;

        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        ctx2.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
      }

      ctx2.stroke();
      ctx2.restore();
    };

    let t = 0;
    const draw = () => {
      t += 1;
      const rect = canvasEl.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      ctx2.clearRect(0, 0, w, h);

      const padding = 44;
      const usableW = Math.max(1, w - padding * 2);
      const centerY = h / 2;
      const amp = h * 0.34;
      const pts = pointsRef.current.map((p) => {
        const x = padding + p.xT * usableW + p.jx * 36;
        const y = centerY - (p.score / 5) * amp + p.jy * 22;
        const r = 2 + Math.abs(p.score);
        return { ...p, x, y, r };
      });
      derivedRef.current = pts;

      drawSmoothCurve(pts.map((p) => ({ x: p.x, y: p.y })));

      const cx = w / 2;
      const forceKeywords = new Set(["紧张", "觉醒"]);
      const forced = pts.filter((p) => forceKeywords.has(p.keyword));
      const labelCandidates = [
        ...forced.map((p) => ({ p, d: 0 })),
        ...pts
          .filter((p) => p.keyword && !forceKeywords.has(p.keyword))
          .map((p) => ({ p, d: Math.abs(p.x - cx) }))
          .filter((x) => x.d < w * 0.24)
          .sort((a, b) => a.d - b.d)
          .slice(0, 64),
      ];

      const labelBoxes: Array<{ x: number; y: number; w: number; h: number }> = [];
      const labelsToDraw: Array<{ p: StarPoint; x: number; y: number }> = [];

      ctx2.save();
      ctx2.font =
        "10px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial";

      for (const item of labelCandidates) {
        const p = item.p;
        const x = p.x + p.r + 5;
        const y = p.y + 3;
        const metrics = ctx2.measureText(p.keyword);
        const bw = metrics.width + 4;
        const bh = 12;
        const box = { x, y: y - 10, w: bw, h: bh };
        if (box.x + box.w > w - 6) continue;
        if (box.y < 6 || box.y + box.h > h - 6) continue;
        let ok = true;
        for (const b of labelBoxes) {
          const overlap =
            box.x < b.x + b.w &&
            box.x + box.w > b.x &&
            box.y < b.y + b.h &&
            box.y + box.h > b.y;
          if (overlap) {
            ok = false;
            break;
          }
        }
        if (!ok && !forceKeywords.has(p.keyword)) continue;
        labelBoxes.push(box);
        labelsToDraw.push({ p, x, y });
        if (labelsToDraw.length >= 28) break;
      }

      ctx2.restore();

      for (const p of pts) {
        const twinkle = 0.55 + 0.45 * Math.sin(t * 0.025 + (p.id.length % 9));
        const alpha = 0.78 + 0.22 * twinkle;
        ctx2.save();
        ctx2.globalAlpha = alpha;
        ctx2.beginPath();
        ctx2.fillStyle = p.color;
        ctx2.shadowColor = p.glow;
        ctx2.shadowBlur = 14;
        ctx2.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx2.fill();
        ctx2.restore();
      }

      ctx2.save();
      ctx2.globalAlpha = 0.7;
      ctx2.fillStyle = "rgba(255,255,255,0.95)";
      ctx2.font =
        "10px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial";
      for (const l of labelsToDraw) {
        ctx2.fillText(l.p.keyword, l.x, l.y);
      }
      ctx2.restore();

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = ref.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const pts = derivedRef.current;

      let picked: StarPoint | null = null;
      let best = Infinity;
      for (const p of pts) {
        const dx = x - p.x;
        const dy = y - p.y;
        const d = Math.hypot(dx, dy);
        const hit = p.r + 6;
        if (d <= hit && d < best) {
          best = d;
          picked = p;
        }
      }
      if (picked) onSelect(picked.memory);
    },
    [onSelect],
  );

  return (
    <canvas
      ref={ref}
      onPointerDown={onPointerDown}
      className="absolute inset-0 h-full w-full"
    />
  );
}

function WordCloud({ memories }: { memories: CharacterMemoryEntry[] }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [layoutTick, setLayoutTick] = useState(0);
  const [placed, setPlaced] = useState<
    Array<{
      word: string;
      count: number;
      size: number;
      color: string;
      x: number;
      y: number;
      rotate: number;
      drift: number;
      delay: number;
    }>
  >([]);

  const palette = useMemo(
    () => [
      "#F2C066",
      "#D95D4A",
      "#4EA5D9",
      "#7A56A1",
      "#6FA96F",
      "#E6D3A7",
    ],
    [],
  );

  const words = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of memories) {
      const k = (m.keyWord || "").trim();
      if (!k) continue;
      map.set(k, (map.get(k) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 84);
  }, [memories]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w < 10 || h < 10) return;

    const max = Math.max(...words.map((x) => x.count), 1);
    const min = Math.min(...words.map((x) => x.count), 1);
    const items = words.map((it) => {
      const t =
        max === min ? 0.5 : (it.count - min) / Math.max(1, max - min);
      const size = Math.round(12 + t * 24);
      const seed = hashStringToNumber(it.word);
      const rng = mulberry32(seed);
      return {
        ...it,
        size,
        color: palette[seed % palette.length],
        rotate: (rng() < 0.86 ? 0 : (rng() * 24 - 12)) | 0,
        drift: 3 + rng() * 7,
        delay: rng() * 1.2,
        rng,
      };
    });

    const placedList: typeof placed = [];
    const boxes: Array<{ x: number; y: number; w: number; h: number }> = [];

    const tryPlace = (it: (typeof items)[number]) => {
      const bw = it.word.length * it.size * 0.62 + 12;
      const bh = it.size + 10;
      const attempts = 220;
      for (let i = 0; i < attempts; i++) {
        const rx = it.rng();
        const ry = it.rng();
        const x = 10 + rx * Math.max(10, w - bw - 20);
        const y = 10 + ry * Math.max(10, h - bh - 20);
        const box = { x, y, w: bw, h: bh };
        let ok = true;
        for (const b of boxes) {
          const overlap =
            box.x < b.x + b.w &&
            box.x + box.w > b.x &&
            box.y < b.y + b.h &&
            box.y + box.h > b.y;
          if (overlap) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;
        boxes.push(box);
        placedList.push({
          word: it.word,
          count: it.count,
          size: it.size,
          color: it.color,
          x,
          y,
          rotate: it.rotate,
          drift: it.drift,
          delay: it.delay,
        });
        return true;
      }
      return false;
    };

    for (const it of items) {
      tryPlace(it);
    }

    const id = requestAnimationFrame(() => {
      setPlaced(placedList);
    });
    return () => cancelAnimationFrame(id);
  }, [layoutTick, palette, words]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setLayoutTick((t) => t + 1);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className="absolute inset-0">
      {placed.map((w) => (
        <motion.span
          key={w.word}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{
            opacity: [0.55, 0.95, 0.55],
            y: [0, -w.drift, 0],
          }}
          transition={{
            duration: 5.6 + (w.size % 7),
            repeat: Infinity,
            ease: "easeInOut",
            delay: w.delay,
          }}
          className="absolute select-none whitespace-nowrap font-semibold tracking-wide"
          style={{
            left: w.x,
            top: w.y,
            fontSize: `${w.size}px`,
            color: w.color,
            transform: `rotate(${w.rotate}deg)`,
            textShadow:
              "0 10px 34px rgba(0,0,0,0.38), 0 0 18px rgba(255,255,255,0.08)",
            opacity: 0.9,
          }}
        >
          {w.word}
        </motion.span>
      ))}
    </div>
  );
}

function StarMapFlow({
  memories,
  milestones,
  mode,
}: {
  memories: CharacterMemoryEntry[];
  milestones: RelationshipMilestone[];
  mode: StarMapMode;
}) {
  const [selected, setSelected] = useState<CharacterMemoryEntry | null>(null);
  const [milestoneIndex, setMilestoneIndex] = useState(0);

  useEffect(() => {
    if (!milestones.length) return;
    const id = window.setInterval(() => {
      setMilestoneIndex((i) => (i + 1) % milestones.length);
    }, 4200);
    return () => window.clearInterval(id);
  }, [milestones.length]);

  const activeMilestone = milestones[milestoneIndex] ?? null;
  const activeScore = Number(activeMilestone?.emotion?.score ?? 0);
  const heatAlpha = useMemo(() => {
    if (!activeMilestone) return 0.5;
    const score = Number(activeMilestone.emotion?.score ?? 0);
    return clamp01((score + 5) / 10);
  }, [activeMilestone]);

  const scoreByMemoryId = useMemo(() => {
    const map = new Map<string, { sum: number; count: number }>();
    for (const ms of milestones) {
      const score = Number(ms.emotion?.score ?? 0);
      const ids = ms.related_memory_ids ?? [];
      for (const id of ids) {
        const curr = map.get(id) ?? { sum: 0, count: 0 };
        curr.sum += score;
        curr.count += 1;
        map.set(id, curr);
      }
    }
    return map;
  }, [milestones]);

  const orderedMemories = useMemo(() => {
    const list = [...memories];
    list.sort((a, b) => {
      const da = parseYearMonthToIndex(a.date);
      const db = parseYearMonthToIndex(b.date);
      if (da !== db) return da - db;
      const la = a.source_ref?.line_start ?? 0;
      const lb = b.source_ref?.line_start ?? 0;
      if (la !== lb) return la - lb;
      return a.id.localeCompare(b.id);
    });
    return list;
  }, [memories]);

  const points = useMemo(() => {
    const n = orderedMemories.length;
    if (!n) return [] as StarPoint[];

    return orderedMemories.map((m, i) => {
      const agg = scoreByMemoryId.get(m.id);
      const score =
        agg && agg.count ? agg.sum / Math.max(1, agg.count) : 0;
      const seed = hashStringToNumber(m.id);
      const rng = mulberry32(seed);
      const xT = n === 1 ? 0.5 : i / (n - 1);
      const jx = rng() - 0.5;
      const jy = rng() - 0.5;
      const palette = getTagPalette(m.tag);
      return {
        id: m.id,
        tag: m.tag,
        keyword: (m.keyWord || "").trim(),
        memory: m,
        xT,
        jx,
        jy,
        color: palette.color,
        glow: palette.glow,
        score,
      };
    });
  }, [orderedMemories, scoreByMemoryId]);

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-[24px] border border-white/15 bg-white/10 p-4 text-white/85 shadow-[0_18px_70px_rgba(0,0,0,0.2)] backdrop-blur-md">
        <div className="text-sm font-semibold tracking-wide">往事流转</div>
        {activeMilestone ? (
          <>
            <div className="mt-2 text-xs text-white/75">
              {formatMonthLabel(activeMilestone.date)}：{activeMilestone.emotion.label}
            </div>
            <div className="mt-1 text-xs leading-5 text-white/80">
              {activeMilestone.title}
            </div>
          </>
        ) : (
          <div className="mt-2 text-xs text-white/70">暂无里程碑事件</div>
        )}
      </div>

      <div className="relative overflow-hidden rounded-[28px] border border-white/15 bg-white/10 shadow-[0_24px_90px_rgba(0,0,0,0.22)] backdrop-blur-md">
        <div className="relative h-[560px] w-full">
          <StarFieldCanvas seed={1337} density={160} />

          <div
            className="pointer-events-none absolute inset-0 mix-blend-screen transition-opacity duration-[1200ms] ease-out"
            style={{
              opacity: 1 - heatAlpha,
              backgroundImage:
                "radial-gradient(900px_circle_at_18%_22%,rgba(120,190,255,0.26),transparent_62%),radial-gradient(850px_circle_at_84%_70%,rgba(80,150,255,0.20),transparent_64%),radial-gradient(700px_circle_at_40%_95%,rgba(160,210,255,0.14),transparent_70%)",
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 mix-blend-screen transition-opacity duration-[1200ms] ease-out"
            style={{
              opacity: heatAlpha,
              backgroundImage:
                "radial-gradient(900px_circle_at_22%_25%,rgba(255,200,120,0.24),transparent_62%),radial-gradient(850px_circle_at_86%_66%,rgba(255,170,90,0.18),transparent_64%),radial-gradient(700px_circle_at_45%_98%,rgba(255,230,170,0.12),transparent_70%)",
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 transition-opacity duration-[1200ms] ease-out"
            style={{
              opacity: 0.18 + 0.12 * (Math.min(5, Math.abs(activeScore)) / 5),
              backgroundImage:
                "radial-gradient(900px_circle_at_22%_18%,rgba(0,0,0,0.55),transparent_62%),radial-gradient(900px_circle_at_88%_78%,rgba(0,0,0,0.5),transparent_62%)",
            }}
          />

          <AnimatePresence mode="wait">
            {mode === "cloud" ? (
              <motion.div
                key="cloud"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                className="absolute inset-0"
              >
                <WordCloud memories={memories} />
              </motion.div>
            ) : (
              <motion.div
                key="map"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                className="absolute inset-0"
              >
                <StarMapCanvas points={points} onSelect={setSelected} />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {selected && mode === "map" ? (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.22 }}
                className="absolute inset-x-4 bottom-4 overflow-hidden rounded-[24px] border border-white/15 bg-[linear-gradient(180deg,rgba(251,242,217,0.22)_0%,rgba(248,237,209,0.14)_50%,rgba(247,233,201,0.10)_100%)] p-4 text-white/90 shadow-[0_18px_80px_rgba(0,0,0,0.35)] backdrop-blur-md"
              >
                <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:repeating-linear-gradient(0deg,rgba(255,255,255,0.22)_0,rgba(255,255,255,0.22)_1px,transparent_1px,transparent_18px)]" />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold [font-family:var(--font-hand)]">
                      {selected.keyWord || selected.tag || "片段"}
                    </div>
                    <div className="mt-1 text-xs text-white/70">
                      {formatMonthLabel(selected.date)}
                      {selected.timestamp ? ` · ${selected.timestamp}` : ""}
                      {selected.speaker ? ` · ${selected.speaker}` : ""}
                      {selected.module ? ` · ${selected.module}` : ""}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="grid h-9 w-9 place-items-center rounded-2xl border border-white/15 bg-white/5 text-white/80"
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
                <div className="relative mt-3 max-h-28 overflow-y-auto whitespace-pre-wrap text-[13px] leading-7 text-white/85 [font-family:var(--font-hand)]">
                  {(selected.excerpt_lines || []).join("\n")}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
      <div className="rounded-[24px] border border-[color:var(--color-dh-border)] bg-[color:color-mix(in_oklab,var(--color-dh-paper),transparent_25%)] p-4 text-xs leading-6 text-[color:var(--color-dh-ink)]">
        <div className="text-sm font-semibold">星图图例</div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[color:var(--color-dh-gold)]" />
            火花
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[color:var(--color-dh-azure)]" />
            顿悟
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-white" />
            共识/情绪/其他
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-white/0 ring-1 ring-white/60" />
            点击星辰查看
          </div>
        </div>
        <div className="mt-3">
          记忆星辰：{memories.length} 条 · 里程碑：{milestones.length} 条
        </div>
        <div className="mt-1 text-[color:color-mix(in_oklab,var(--color-dh-ink),transparent_45%)]">
          金色曲线按时间连接星辰，纵向起伏映射情绪波动（-5~5）。
        </div>
      </div>
    </div>
  );
}

function LifeTree({
  skillMap,
  memories,
  milestones,
}: {
  skillMap: SkillEvolutionMap | null;
  memories: CharacterMemoryEntry[];
  milestones: RelationshipMilestone[];
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [wrapW, setWrapW] = useState(0);
  const [selected, setSelected] = useState<{
    side: "tuanzi" | "maruko";
    title: string;
    lines: string[];
    dateLabel: string;
  } | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setWrapW(el.getBoundingClientRect().width);
    });
    ro.observe(el);
    setWrapW(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  const memoryById = useMemo(() => {
    const map = new Map<string, CharacterMemoryEntry>();
    for (const m of memories) map.set(m.id, m);
    return map;
  }, [memories]);

  const maruStages = useMemo(
    () => skillMap?.people?.["丸子"]?.stage_ladder ?? [],
    [skillMap],
  );
  const tuanStages = useMemo(
    () => skillMap?.people?.["团子"]?.stage_ladder ?? [],
    [skillMap],
  );

  const maruThreads = useMemo(
    () => skillMap?.people?.["丸子"]?.skill_threads ?? [],
    [skillMap],
  );
  const tuanThreads = useMemo(
    () => skillMap?.people?.["团子"]?.skill_threads ?? [],
    [skillMap],
  );

  const maruFruitLabel = useMemo(() => {
    const hit = maruThreads.find((t) => t.title.includes("课题分离"));
    return hit ? "课题分离" : "课题分离";
  }, [maruThreads]);

  const tuanFruitLabel = useMemo(() => {
    const hit = tuanThreads.find((t) => t.title.includes("无限游戏"));
    return hit ? "无限游戏" : "无限游戏";
  }, [tuanThreads]);

  type StageItem = SkillEvolutionMap["people"][string]["stage_ladder"][number];

  const resolveEvidenceLines = useCallback(
    (stage: StageItem) => {
      const lines: string[] = [];
      for (const sk of stage.skills ?? []) {
        for (const ev of sk.evidence ?? []) {
          const q = (ev.quote_lines ?? []).map((s) => s.trim()).filter(Boolean);
          if (q.length) {
            lines.push(...q);
            continue;
          }
          const ids = ev.memory_ref_ids ?? [];
          for (const id of ids) {
            const m = memoryById.get(id);
            if (!m) continue;
            const ex = (m.excerpt_lines ?? []).map((s) => s.trim()).filter(Boolean);
            if (ex.length) lines.push(...ex);
          }
        }
      }
      const uniq: string[] = [];
      const seen = new Set<string>();
      for (const l of lines) {
        const k = l.replace(/\s+/g, " ").trim();
        if (!k) continue;
        if (seen.has(k)) continue;
        seen.add(k);
        uniq.push(l);
        if (uniq.length >= 6) break;
      }
      return uniq;
    },
    [memoryById],
  );

  const yForDate = useCallback((date: string) => {
    const t = parseYearMonthToIndex(date);
    const min = parseYearMonthToIndex("2023-01");
    const max = parseYearMonthToIndex("2026-12");
    const p = (t - min) / Math.max(1, max - min);
    const yTop = 10;
    const yBottom = 92;
    return yBottom - p * (yBottom - yTop);
  }, []);

  const layout = useMemo(() => {
    const budR = wrapW && wrapW < 420 ? 1.8 : 2.05;
    const jitter = wrapW && wrapW < 420 ? 1.2 : 1.8;
    const fan = wrapW && wrapW < 420 ? 2.1 : 2.9;

    const leftColor = "rgba(65,170,140,0.95)";
    const leftGlow = "rgba(65,170,140,0.55)";
    const rightColor = "rgba(220,85,60,0.95)";
    const rightGlow = "rgba(220,85,60,0.55)";

    const trunkX = 50;
    const trunkBottomY = 94;
    const trunkTopY = 10;
    const ySpan = Math.max(1e-6, trunkBottomY - trunkTopY);

    const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
    const bezier1D = (t: number, a: number, b: number, c: number, d: number) => {
      const u = 1 - t;
      return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
    };

    const leftBranchX = (t: number) => {
      const base = bezier1D(t, 46, 34, 15.5, 29.5);
      return base - Math.sin(t * Math.PI) * 1.4 + Math.sin(t * Math.PI * 2) * 0.6;
    };

    const rightBranchX = (t: number) => {
      const base = bezier1D(t, 54, 66, 86, 70.5);
      return base + Math.sin(t * Math.PI) * 1.2 - Math.sin(t * Math.PI * 2) * 0.55;
    };

    const stageIndex = (date: string) => parseYearMonthToIndex(date);

    const closestStageId = (stages: StageItem[], date: string) => {
      const target = stageIndex(date);
      let bestId = stages[0]?.stage_id ?? "";
      let best = Number.POSITIVE_INFINITY;
      for (const s of stages) {
        const d = Math.abs(stageIndex(s.time.start) - target);
        if (d < best) {
          best = d;
          bestId = s.stage_id;
        }
      }
      return bestId;
    };

    const leftBuds = tuanStages.map((s, idx) => {
      const seed = hashStringToNumber(s.stage_id);
      const rng = mulberry32(seed);
      const y = yForDate(s.time.start);
      const t = clamp01((trunkBottomY - y) / ySpan);
      const baseX = leftBranchX(t);
      const branchW = fan * (0.25 + t);
      const offset = ((idx % 3) - 1) * branchW + (rng() - 0.5) * jitter;
      const x = baseX + offset;
      return { side: "tuanzi" as const, stage: s, x, y, r: budR, t };
    });

    const rightBuds = maruStages.map((s, idx) => {
      const seed = hashStringToNumber(s.stage_id);
      const rng = mulberry32(seed);
      const y = yForDate(s.time.start);
      const t = clamp01((trunkBottomY - y) / ySpan);
      const baseX = rightBranchX(t);
      const branchW = fan * (0.22 + t);
      const offset = ((idx % 3) - 1) * branchW + (rng() - 0.5) * jitter;
      const x = baseX + offset;
      return { side: "maruko" as const, stage: s, x, y, r: budR, t };
    });

    const leftByStage = new Map(leftBuds.map((b) => [b.stage.stage_id, b]));
    const rightByStage = new Map(rightBuds.map((b) => [b.stage.stage_id, b]));

    const vines = milestones
      .filter((m) => Number(m.emotion?.score ?? 0) >= 4)
      .filter((m) => m.people?.includes("团子") && m.people?.includes("丸子"))
      .map((m) => {
        const lid = closestStageId(tuanStages, m.date);
        const rid = closestStageId(maruStages, m.date);
        const l = leftByStage.get(lid);
        const r = rightByStage.get(rid);
        if (!l || !r) return null;
        return {
          milestone: m,
          from: { x: l.x, y: l.y, t: l.t },
          to: { x: r.x, y: r.y, t: r.t },
        };
      })
      .filter(Boolean) as Array<{
      milestone: RelationshipMilestone;
      from: { x: number; y: number; t: number };
      to: { x: number; y: number; t: number };
    }>;

    const fruits = [
      { side: "tuanzi" as const, x: 34, y: 10.5, label: tuanFruitLabel },
      { side: "maruko" as const, x: 66, y: 10.5, label: maruFruitLabel },
    ];

    return {
      leftColor,
      leftGlow,
      rightColor,
      rightGlow,
      leftBuds,
      rightBuds,
      vines,
      fruits,
      trunkX,
      trunkBottomY,
      trunkTopY,
    };
  }, [maruFruitLabel, maruStages, milestones, tuanFruitLabel, tuanStages, wrapW, yForDate]);

  const onPickStage = useCallback(
    (side: "tuanzi" | "maruko", stage: StageItem) => {
      const lines = resolveEvidenceLines(stage);
      setSelected({
        side,
        title: stage.role_label,
        lines: lines.length ? lines : ["暂无可引用的原文证据。"],
        dateLabel: `${formatMonthLabel(stage.time.start)}${stage.time.end ? ` ~ ${formatMonthLabel(stage.time.end)}` : ""}`,
      });
    },
    [resolveEvidenceLines],
  );

  return (
    <div ref={wrapRef} className="relative">
      <style jsx global>{`
        @keyframes lifetree-sway-left {
          0%,
          100% {
            transform: rotate(-0.6deg);
          }
          50% {
            transform: rotate(0.6deg);
          }
        }
        @keyframes lifetree-sway-right {
          0%,
          100% {
            transform: rotate(0.7deg);
          }
          50% {
            transform: rotate(-0.7deg);
          }
        }
      `}</style>

      <div className="relative overflow-hidden rounded-[28px] border border-white/15 bg-black/15 shadow-[0_24px_90px_rgba(0,0,0,0.24)] backdrop-blur-md">
        <div className="relative h-[640px] w-full">
          <div
            className="absolute inset-0 opacity-[0.92]"
            style={{
              backgroundImage: "url(/bg-tree.png)",
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(255,255,255,0.10),rgba(0,0,0,0.42)_62%,rgba(0,0,0,0.62)_100%)]" />
          <div className="absolute inset-0 opacity-[0.22]">
            <StarFieldCanvas seed={2026} density={80} />
          </div>

          <motion.svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="absolute inset-0 h-full w-full"
          >
            <defs>
              <linearGradient id="lifetree-gold" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgba(255,210,120,0.10)" />
                <stop offset="45%" stopColor="rgba(255,210,120,0.85)" />
                <stop offset="100%" stopColor="rgba(255,210,120,0.18)" />
              </linearGradient>
              <linearGradient id="lifetree-gold-strong" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgba(255,210,120,0.06)" />
                <stop offset="40%" stopColor="rgba(255,220,145,0.92)" />
                <stop offset="100%" stopColor="rgba(255,210,120,0.10)" />
              </linearGradient>
              <filter id="lifetree-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="0.6" result="blur" />
                <feColorMatrix
                  in="blur"
                  type="matrix"
                  values="1 0 0 0 0.2  0 1 0 0 0.15  0 0 1 0 0.05  0 0 0 1 0"
                />
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <radialGradient id="lifetree-bud-green" cx="35%" cy="35%" r="70%">
                <stop offset="0%" stopColor="rgba(210,255,245,0.95)" />
                <stop offset="45%" stopColor={layout.leftColor} />
                <stop offset="100%" stopColor="rgba(20,60,52,0.18)" />
              </radialGradient>
              <radialGradient id="lifetree-bud-red" cx="35%" cy="35%" r="70%">
                <stop offset="0%" stopColor="rgba(255,240,230,0.95)" />
                <stop offset="45%" stopColor={layout.rightColor} />
                <stop offset="100%" stopColor="rgba(80,20,18,0.18)" />
              </radialGradient>
              <radialGradient id="lifetree-fruit" cx="35%" cy="35%" r="70%">
                <stop offset="0%" stopColor="rgba(255,250,230,0.95)" />
                <stop offset="50%" stopColor="rgba(255,210,120,0.92)" />
                <stop offset="100%" stopColor="rgba(120,70,15,0.22)" />
              </radialGradient>
            </defs>

            <motion.g
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 1.25, ease: "easeOut" }}
              style={{
                transformOrigin: "50% 94%",
              }}
            >
              <path
                d={`M${layout.trunkX} ${layout.trunkBottomY} C ${layout.trunkX} 76, ${layout.trunkX} 45, ${layout.trunkX} ${layout.trunkTopY}`}
                stroke="rgba(235,235,255,0.26)"
                strokeWidth="2.2"
                strokeLinecap="round"
                fill="none"
              />

              {layout.vines.map((v) => {
                const midX = (v.from.x + v.to.x) / 2;
                const lift = 3.6 + (v.from.t + v.to.t) * 1.2;
                const d = `M${v.from.x} ${v.from.y} C ${midX - 8} ${v.from.y - lift}, ${midX + 8} ${v.to.y + lift}, ${v.to.x} ${v.to.y}`;
                return (
                  <g key={v.milestone.milestone_id} filter="url(#lifetree-glow)">
                    <motion.path
                      d={d}
                      stroke="url(#lifetree-gold-strong)"
                      strokeWidth={wrapW && wrapW < 420 ? 1.1 : 1.35}
                      strokeLinecap="round"
                      fill="none"
                      animate={{ opacity: [0.35, 0.95, 0.35] }}
                      transition={{
                        duration: 3.2,
                        ease: "easeInOut",
                        repeat: Infinity,
                        delay: (hashStringToNumber(v.milestone.milestone_id) % 7) * 0.17,
                      }}
                    />
                    <motion.path
                      d={d}
                      stroke="rgba(255,240,195,0.95)"
                      strokeWidth={wrapW && wrapW < 420 ? 0.55 : 0.7}
                      strokeLinecap="round"
                      fill="none"
                      strokeDasharray="2.4 4.6"
                      animate={{ strokeDashoffset: [18, 0] }}
                      transition={{
                        duration: 2.6,
                        ease: "linear",
                        repeat: Infinity,
                      }}
                      opacity={0.55}
                    />
                  </g>
                );
              })}

              <g
                style={{
                  transformBox: "fill-box",
                  transformOrigin: "50% 94%",
                  animation: "lifetree-sway-left 9s ease-in-out infinite",
                }}
              >
                {layout.leftBuds.map((b) => (
                  <g key={b.stage.stage_id}>
                    <path
                      d={`M${layout.trunkX} ${b.y} C ${48} ${b.y - 3.2}, ${b.x + 4.5} ${b.y + 2.6}, ${b.x} ${b.y}`}
                      stroke={layout.leftGlow}
                      strokeWidth="1.25"
                      strokeLinecap="round"
                      fill="none"
                      opacity={0.75}
                    />
                    <text
                      x={b.x - 2.2}
                      y={b.y + 0.9}
                      textAnchor="middle"
                      fontSize="2.1"
                      fill="rgba(255,255,255,0.35)"
                    >
                      团
                    </text>
                    <g
                      onClick={() => onPickStage("tuanzi", b.stage)}
                      style={{ cursor: "pointer" }}
                    >
                      <circle
                        cx={b.x}
                        cy={b.y}
                        r={b.r * 1.9}
                        fill={layout.leftGlow}
                        opacity={0.25}
                      />
                      <circle
                        cx={b.x}
                        cy={b.y}
                        r={b.r}
                        fill="url(#lifetree-bud-green)"
                      />
                    </g>
                  </g>
                ))}
              </g>

              <g
                style={{
                  transformBox: "fill-box",
                  transformOrigin: "50% 94%",
                  animation: "lifetree-sway-right 8.6s ease-in-out infinite",
                }}
              >
                {layout.rightBuds.map((b) => (
                  <g key={b.stage.stage_id}>
                    <path
                      d={`M${layout.trunkX} ${b.y} C ${52} ${b.y - 3.2}, ${b.x - 4.5} ${b.y + 2.6}, ${b.x} ${b.y}`}
                      stroke={layout.rightGlow}
                      strokeWidth="1.25"
                      strokeLinecap="round"
                      fill="none"
                      opacity={0.75}
                    />
                    <text
                      x={b.x + 2.2}
                      y={b.y + 0.9}
                      textAnchor="middle"
                      fontSize="2.1"
                      fill="rgba(255,255,255,0.35)"
                    >
                      丸
                    </text>
                    <g
                      onClick={() => onPickStage("maruko", b.stage)}
                      style={{ cursor: "pointer" }}
                    >
                      <circle
                        cx={b.x}
                        cy={b.y}
                        r={b.r * 1.9}
                        fill={layout.rightGlow}
                        opacity={0.25}
                      />
                      <circle
                        cx={b.x}
                        cy={b.y}
                        r={b.r}
                        fill="url(#lifetree-bud-red)"
                      />
                    </g>
                  </g>
                ))}
              </g>

              <text
                x={24}
                y={96.5}
                textAnchor="middle"
                fontSize="2.4"
                fill="rgba(255,255,255,0.70)"
              >
                2023
              </text>
              <text
                x={24}
                y={12.5}
                textAnchor="middle"
                fontSize="2.4"
                fill="rgba(255,255,255,0.70)"
              >
                2026
              </text>
            </motion.g>
          </motion.svg>

          <div className="pointer-events-none absolute left-4 top-4">
            <motion.div
              animate={{ y: [0, -2.2, 0] }}
              transition={{
                duration: 3.7,
                ease: "easeInOut",
                repeat: Infinity,
              }}
              className="flex flex-col items-center"
            >
              <div className="relative h-[60px] w-[60px] overflow-hidden rounded-full border border-white/25 bg-white/10">
                <Image
                  src="/Tuanzi.png"
                  alt="团子"
                  fill
                  sizes="60px"
                  className="object-cover"
                />
              </div>
              <div className="mt-1 text-[11px] font-medium text-white/85 [font-family:var(--font-hand)]">
                无限游戏
              </div>
            </motion.div>
          </div>

          <div className="pointer-events-none absolute right-4 top-4">
            <motion.div
              animate={{ y: [0, -2, 0] }}
              transition={{
                duration: 3.95,
                ease: "easeInOut",
                repeat: Infinity,
                delay: 0.7,
              }}
              className="flex flex-col items-center"
            >
              <div className="relative h-[60px] w-[60px] overflow-hidden rounded-full border border-white/25 bg-white/10">
                <Image
                  src="/Wanzi.png"
                  alt="丸子"
                  fill
                  sizes="60px"
                  className="object-cover"
                />
              </div>
              <div className="mt-1 text-[11px] font-medium text-white/85 [font-family:var(--font-hand)]">
                跨界连接
              </div>
            </motion.div>
          </div>

          <div
            className={`pointer-events-none absolute right-4 rounded-[18px] border border-white/15 bg-black/20 px-3 py-2 text-[11px] text-white/78 backdrop-blur-md ${
              selected ? "bottom-40" : "bottom-4"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: "rgba(65,170,140,0.92)" }} />
              <span>团子</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: "rgba(220,85,60,0.92)" }} />
              <span>丸子</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="h-[2px] w-6 rounded-full" style={{ background: "rgba(255,220,145,0.88)" }} />
              <span>共生藤曼</span>
            </div>
          </div>

          <AnimatePresence>
            {selected ? (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 14 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="absolute inset-x-4 bottom-4 overflow-hidden rounded-[26px] border border-white/15 bg-[linear-gradient(180deg,rgba(251,242,217,0.26)_0%,rgba(228,245,238,0.14)_46%,rgba(196,228,246,0.10)_100%)] p-4 text-white/90 shadow-[0_18px_80px_rgba(0,0,0,0.35)] backdrop-blur-md"
              >
                <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:repeating-linear-gradient(0deg,rgba(255,255,255,0.22)_0,rgba(255,255,255,0.22)_1px,transparent_1px,transparent_18px)]" />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs text-white/70">{selected.dateLabel}</div>
                    <div className="mt-1 text-sm font-semibold leading-6 [font-family:var(--font-hand)]">
                      {selected.title}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="grid h-9 w-9 place-items-center rounded-2xl border border-white/15 bg-white/5 text-white/80"
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
                <div className="relative mt-3 max-h-32 overflow-y-auto whitespace-pre-wrap text-[13px] leading-7 text-white/85 [font-family:var(--font-hand)]">
                  {selected.lines.join("\n")}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

type EchoCharacter = "tuanzi" | "maruko";

type EchoMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

function EchoChamber() {
  const [character, setCharacter] = useState<EchoCharacter>("tuanzi");
  const [messages, setMessages] = useState<EchoMessage[]>([]);
  const [input, setInput] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [lottieData, setLottieData] = useState<unknown | null>(null);

  const streamRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const revealTimerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const fullTextRef = useRef("");
  const shownLenRef = useRef(0);
  const doneRef = useRef(false);
  const minElapsedRef = useRef(false);
  const firstChunkRef = useRef(false);
  const revealStartedRef = useRef(false);
  const assistantIdRef = useRef("");
  const lastTickRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/LiziSongzi.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (cancelled) return;
        if (json) setLottieData(json);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const el = streamRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, showLoader]);

  const stopAll = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (revealTimerRef.current) window.clearTimeout(revealTimerRef.current);
    revealTimerRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    fullTextRef.current = "";
    shownLenRef.current = 0;
    doneRef.current = false;
    minElapsedRef.current = false;
    firstChunkRef.current = false;
    revealStartedRef.current = false;
    assistantIdRef.current = "";
    lastTickRef.current = 0;
    setShowLoader(false);
    setIsBusy(false);
  }, []);

  useEffect(() => {
    return () => stopAll();
  }, [stopAll]);

  const switchCharacter = useCallback(
    (next: EchoCharacter) => {
      if (next === character) return;
      stopAll();
      setCharacter(next);
      setMessages([]);
      setInput("");
    },
    [character, stopAll],
  );

  const startReveal = useCallback(() => {
    setShowLoader(false);

    const assistantId = assistantIdRef.current;
    if (!assistantId) return;

    if (!revealStartedRef.current) {
      revealStartedRef.current = true;
      setMessages((prev) => {
        if (prev.some((m) => m.id === assistantId)) return prev;
        return [...prev, { id: assistantId, role: "assistant", content: "" }];
      });
    }

    if (rafRef.current) return;

    lastTickRef.current = performance.now();

    const tick = () => {
      const now = performance.now();
      const dt = Math.max(0, now - lastTickRef.current);
      lastTickRef.current = now;

      const full = fullTextRef.current;
      const cps = full.length > 1600 ? 200 : full.length > 800 ? 150 : 110;
      const nextLen = Math.min(
        full.length,
        Math.floor(shownLenRef.current + (dt * cps) / 1000),
      );
      shownLenRef.current = nextLen;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: full.slice(0, nextLen) } : m,
        ),
      );

      if (nextLen < full.length || !doneRef.current) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      rafRef.current = null;
      setIsBusy(false);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const maybeReveal = useCallback(() => {
    if (revealStartedRef.current) return;
    if (!minElapsedRef.current) return;
    if (!firstChunkRef.current && !doneRef.current) return;
    startReveal();
  }, [startReveal]);

  const send = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (isBusy || showLoader) return;

    stopAll();
    setIsBusy(true);

    const userId = `u-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const assistantId = `a-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    assistantIdRef.current = assistantId;
    fullTextRef.current = "";
    shownLenRef.current = 0;
    doneRef.current = false;
    revealStartedRef.current = false;

    setInput("");
    setMessages((prev) => [...prev, { id: userId, role: "user", content: trimmed }]);
    setShowLoader(true);

    revealTimerRef.current = window.setTimeout(() => {
      revealTimerRef.current = null;
      minElapsedRef.current = true;
      maybeReveal();
    }, 1500);

    const ac = new AbortController();
    abortRef.current = ac;

    const history = messages
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ac.signal,
        body: JSON.stringify({
          persona: character === "tuanzi" ? "echoTuanzi" : "echoMaruko",
          message: trimmed,
          history,
        }),
      });

      if (!res.ok || !res.body) {
        doneRef.current = true;
        firstChunkRef.current = true;
        fullTextRef.current = "分身暂时没有回应，等会儿再试试。";
        maybeReveal();
        return;
      }

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
              dataLine = trimmedLine.slice(5).trim();
            }
          }

          if (eventName === "delta") {
            try {
              const json = JSON.parse(dataLine) as { delta?: string };
              const delta = json.delta ?? "";
              if (delta) {
                fullTextRef.current += delta;
                if (!firstChunkRef.current) {
                  firstChunkRef.current = true;
                  maybeReveal();
                }
                if (revealStartedRef.current && !rafRef.current) startReveal();
              }
            } catch {}
          } else if (eventName === "done") {
            doneRef.current = true;
            if (!firstChunkRef.current) {
              firstChunkRef.current = true;
              maybeReveal();
            }
          } else if (eventName === "error") {
            doneRef.current = true;
            if (!firstChunkRef.current) {
              firstChunkRef.current = true;
              maybeReveal();
            }
          }
        }
      }

      doneRef.current = true;
      if (!firstChunkRef.current) firstChunkRef.current = true;
      maybeReveal();
    } catch {
      doneRef.current = true;
      firstChunkRef.current = true;
      fullTextRef.current = "分身暂时离线，稍后再来。";
      maybeReveal();
    }
  }, [character, input, isBusy, maybeReveal, messages, showLoader, startReveal, stopAll]);

  const downloadChat = useCallback(() => {
    if (!messages.length) return;
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(
      now.getHours(),
    )}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    const assistantName =
      character === "tuanzi" ? "团子" : character === "maruko" ? "未来丸子" : "分身";

    const header = [
      `导出时间：${now.toLocaleString()}`,
      `分身：${assistantName}`,
      "",
    ].join("\r\n");
    const body = messages
      .map((m) => {
        const speaker = m.role === "user" ? "丸子" : assistantName;
        return `${speaker}：\r\n${m.content}\r\n`;
      })
      .join("\r\n");
    const text = `${header}\r\n${body}`.trimEnd() + "\r\n";

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `echochat_${assistantName}_${stamp}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }, [character, messages]);

  return (
    <div className="grid gap-4">
      <div className="rounded-[28px] border border-white/15 bg-white/10 p-4 text-white/85 shadow-[0_18px_70px_rgba(0,0,0,0.2)] backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold tracking-wide">分身选择</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => switchCharacter("tuanzi")}
              className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs transition-colors ${
                character === "tuanzi"
                  ? "border-white/30 bg-white/15 text-white"
                  : "border-white/10 bg-white/5 text-white/75 hover:bg-white/10"
              }`}
            >
              <span className="relative h-7 w-7 overflow-hidden rounded-full border border-white/20 bg-white/10">
                <Image
                  src="/Tuanzi.png"
                  alt=""
                  fill
                  sizes="28px"
                  className="object-cover"
                />
              </span>
              团子分身
            </button>
            <button
              type="button"
              onClick={() => switchCharacter("maruko")}
              className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs transition-colors ${
                character === "maruko"
                  ? "border-white/30 bg-white/15 text-white"
                  : "border-white/10 bg-white/5 text-white/75 hover:bg-white/10"
              }`}
            >
              <span className="relative h-7 w-7 overflow-hidden rounded-full border border-white/20 bg-white/10">
                <Image
                  src="/Wanzi.png"
                  alt=""
                  fill
                  sizes="28px"
                  className="object-cover"
                />
              </span>
              丸子分身
            </button>
          </div>
        </div>
      </div>

      <div
        ref={streamRef}
        className="h-[460px] overflow-y-auto rounded-[28px] border border-white/15 bg-white/10 p-4 shadow-[0_18px_70px_rgba(0,0,0,0.2)] backdrop-blur-md"
      >
        <div className="flex flex-col gap-3">
          {messages.map((m) => {
            const isUser = m.role === "user";
            return (
              <div
                key={m.id}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[86%] rounded-[22px] border px-4 py-3 text-sm leading-7 ${
                    isUser
                      ? "border-white/15 bg-white/15 text-white/90"
                      : "border-white/10 bg-black/20 text-white/85 [font-family:var(--font-hand)]"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              </div>
            );
          })}

          <AnimatePresence>
            {showLoader ? (
              <motion.div
                key="echo-loader"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="flex justify-center py-2"
              >
                <div className="w-full max-w-[360px] rounded-[22px] border border-white/10 bg-black/15 px-4 py-3">
                  <div className="flex items-center justify-center">
                    <div className="w-full" style={{ height: 120 }}>
                      {lottieData ? (
                        <Lottie
                          animationData={lottieData}
                          loop
                          autoplay
                          style={{ height: 120, width: "100%" }}
                        />
                      ) : (
                        <div className="h-[120px] w-full" />
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/15 bg-white/10 p-3 shadow-[0_18px_70px_rgba(0,0,0,0.2)] backdrop-blur-md">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="真真表达，TA会呼应"
            className="min-h-12 w-full resize-none rounded-[22px] border border-white/10 bg-black/10 px-4 py-3 text-sm leading-7 text-white/90 outline-none placeholder:text-white/45"
          />
          <button
            type="button"
            onClick={send}
            disabled={!input.trim() || isBusy || showLoader}
            className="h-11 shrink-0 rounded-[18px] border border-white/15 bg-white/10 px-4 text-sm font-medium text-white/90 transition-colors disabled:opacity-40"
          >
            发送
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={downloadChat}
        disabled={!messages.length}
        className="rounded-[28px] border border-white/15 bg-white/10 p-4 text-left text-white/85 shadow-[0_18px_70px_rgba(0,0,0,0.2)] backdrop-blur-md transition-colors hover:bg-white/15 disabled:opacity-40"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold tracking-wide">下载对话内容</div>
          <div className="text-xs text-white/55">TXT</div>
        </div>
      </button>
    </div>
  );
}

type SparkPhase = "idle" | "aggregating" | "scroll";

const SparkStarCanvas = memo(function SparkStarCanvas({
  seed,
  density,
  phase,
  target,
}: {
  seed: number;
  density: number;
  phase: SparkPhase;
  target: { x: number; y: number } | null;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const phaseRef = useRef<SparkPhase>(phase);
  const startAtRef = useRef<number | null>(null);
  const targetRef = useRef<{ x: number; y: number } | null>(target);

  useEffect(() => {
    phaseRef.current = phase;
    if (phase === "aggregating") {
      startAtRef.current = performance.now();
    }
  }, [phase]);

  useEffect(() => {
    targetRef.current = target;
  }, [target]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rng = mulberry32(seed);
    const stars = Array.from({ length: density }).map((_, i) => {
      const nx = rng();
      const ny = rng();
      return {
        id: `s-${i}`,
        nx,
        ny,
        r: 0.6 + rng() * 1.8,
        a: 0.15 + rng() * 0.85,
        tw: 0.2 + rng() * 0.9,
        p: rng() * Math.PI * 2,
      };
    });

    const ro = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    });
    {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    }
    ro.observe(canvas);

    let raf = 0;
    const draw = (t: number) => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const isAgg = phaseRef.current === "aggregating";
      const startedAt = startAtRef.current ?? t;
      const dur = 760;
      const tt = isAgg ? clamp01((t - startedAt) / dur) : 0;
      const ease = isAgg ? 1 - Math.pow(1 - tt, 3) : 0;
      const dpr = Math.max(1, w / Math.max(1, canvas.getBoundingClientRect().width));
      const targetPx = targetRef.current;
      const tx = isAgg && targetPx ? targetPx.x * dpr : w * 0.5;
      const ty = isAgg && targetPx ? targetPx.y * dpr : h * 0.5;

      for (const s of stars) {
        const tw = 0.65 + 0.35 * Math.sin(t * 0.0018 * s.tw + s.p);
        const baseA = s.a * tw;
        const baseX = s.nx * w;
        const baseY = s.ny * h;

        const x = isAgg ? baseX + (tx - baseX) * ease : baseX;
        const y = isAgg ? baseY + (ty - baseY) * ease : baseY;
        const boostT = isAgg ? clamp01(tt / 0.7) : 0;
        const fadeT = isAgg ? clamp01((tt - 0.7) / 0.3) : 0;
        const boostedA = isAgg ? baseA + (1 - baseA) * boostT : baseA;
        const alpha = boostedA * (isAgg ? 1 - fadeT : 1);
        if (alpha <= 0.01) continue;

        ctx.beginPath();
        ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(4)})`;
        ctx.arc(x, y, s.r * (isAgg ? 1 - 0.25 * ease : 1), 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [density, seed]);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" />;
});

function InspirationEmergence({
  memories,
  milestones,
}: {
  memories: CharacterMemoryEntry[];
  milestones: RelationshipMilestone[];
}) {
  const [phase, setPhase] = useState<SparkPhase>("idle");
  const [selectedPearl, setSelectedPearl] = useState<"2024" | "2025" | "all" | null>(
    null,
  );
  const [canvasTarget, setCanvasTarget] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [shownText, setShownText] = useState("");
  const [streamDone, setStreamDone] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const rafRef = useRef<number | null>(null);
  const fullTextRef = useRef("");
  const shownLenRef = useRef(0);
  const doneRef = useRef(false);
  const formattedRef = useRef(false);

  const pearlMeta = useMemo(() => {
    return {
      "2024": {
        label: "2024",
        title: "2024·破土与萌芽年度报告",
        range: { start: "2023-01", end: "2024-12" },
      },
      "2025": {
        label: "2025",
        title: "2025·共生与跃迁年度报告",
        range: { start: "2025-01", end: "2025-12" },
      },
      all: {
        label: "历年汇总",
        title: "历年汇总·无限游戏叙事报告",
        range: null as { start: string; end: string } | null,
      },
    };
  }, []);

  const parseAnyDateToMonthIndex = useCallback((date: string) => {
    const m = String(date ?? "").match(/^(\d{4})-(\d{2})/);
    if (!m) return null;
    const y = Number(m[1]);
    const mm = Number(m[2]);
    if (!Number.isFinite(y) || !Number.isFinite(mm) || mm < 1 || mm > 12) return null;
    return y * 12 + (mm - 1);
  }, []);

  const activeRange = selectedPearl ? pearlMeta[selectedPearl].range : null;
  const filteredMemories = useMemo(() => {
    if (!activeRange) return memories;
    const start = parseYearMonthToIndex(activeRange.start);
    const end = parseYearMonthToIndex(activeRange.end);
    return memories.filter((m) => {
      const idx = parseAnyDateToMonthIndex(m.date ?? "");
      if (idx === null) return false;
      return idx >= start && idx <= end;
    });
  }, [activeRange, memories, parseAnyDateToMonthIndex]);

  const filteredMilestones = useMemo(() => {
    if (!activeRange) return milestones;
    const start = parseYearMonthToIndex(activeRange.start);
    const end = parseYearMonthToIndex(activeRange.end);
    return milestones.filter((m) => {
      const idx = parseAnyDateToMonthIndex(m.date ?? "");
      if (idx === null) return false;
      return idx >= start && idx <= end;
    });
  }, [activeRange, milestones, parseAnyDateToMonthIndex]);

  const speakerKeywords = useMemo(() => {
    const build = (speaker: string) => {
      const map = new Map<string, number>();
      for (const m of filteredMemories) {
        if ((m.speaker || "").trim() !== speaker) continue;
        const k = (m.keyWord || "").trim();
        if (!k) continue;
        map.set(k, (map.get(k) || 0) + 1);
      }
      return Array.from(map.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([k]) => k);
    };
    return {
      maruko: build("丸子"),
      tuanzi: build("团子"),
    };
  }, [filteredMemories]);

  const waterfallLines = useMemo(() => {
    const maru = speakerKeywords.maruko.length
      ? speakerKeywords.maruko.join("、")
      : "暂无";
    const tuan = speakerKeywords.tuanzi.length
      ? speakerKeywords.tuanzi.join("、")
      : "暂无";
    return [
      `正在分析 ${filteredMemories.length} 条记忆星辰…`,
      `正在核对 ${filteredMilestones.length} 个里程碑锚点…`,
      `丸子关键词：${maru}`,
      `团子关键词：${tuan}`,
    ];
  }, [
    filteredMemories.length,
    filteredMilestones.length,
    speakerKeywords.maruko,
    speakerKeywords.tuanzi,
  ]);

  const stopTyping = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  const sanitizePlainText = useCallback((input: string) => {
    let s = input;
    s = s.replace(/\r/g, "");
    s = s.replace(/```+/g, "");
    s = s.replace(/`+/g, "");
    s = s.replace(/\*\*|__/g, "");
    s = s.replace(/[>*_#]/g, "");
    s = s.replace(/(^|\n)\s*[-*+]\s+/g, "$1");
    s = s.replace(/(^|\n)\s*---+\s*(?=\n|$)/g, "$1");
    s = s.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
    return s;
  }, []);

  const formatReportLayout = useCallback((input: string) => {
    let s = String(input ?? "");
    s = s.replace(/\r/g, "");

    const mainRe = /看不见的主线\s*[:：]/;
    const m = mainRe.exec(s);
    if (!m) return s;
    const mainHeaderEnd = m.index + m[0].length;

    const afterHeader = s.slice(mainHeaderEnd);
    const lifeRe = /(?:\n|^)\s*生命公式\s*[:：]/;
    const m2 = lifeRe.exec(afterHeader);
    const rawBody = (m2 ? afterHeader.slice(0, m2.index) : afterHeader).trim();
    const suffix = (m2 ? afterHeader.slice(m2.index) : "").trimStart();

    const normalizedBody = rawBody.replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
    if (!normalizedBody) return s;

    const pieces =
      normalizedBody.match(/[^。！？!?；;]+[。！？!?；;]?/g) ?? [normalizedBody];

    const paras: string[] = [];
    let cur = "";
    for (const piece of pieces) {
      const sent = piece.trim();
      if (!sent) continue;
      const next = cur ? cur + sent : sent;
      if (next.length >= 120 && cur.length >= 60) {
        paras.push(cur.trim());
        cur = sent;
        continue;
      }
      cur = next;
      if (cur.length >= 95 && /[。！？!?]$/.test(sent)) {
        paras.push(cur.trim());
        cur = "";
      }
    }
    if (cur.trim()) paras.push(cur.trim());

    const splitOne = (text: string) => {
      const cut = Math.floor(text.length / 2);
      let pos = cut;
      for (let d = 0; d <= 24; d += 1) {
        const left = cut - d;
        const right = cut + d;
        if (right > 0 && right <= text.length && /[。！？!?；;]/.test(text[right - 1] ?? "")) {
          pos = right;
          break;
        }
        if (left > 0 && left <= text.length && /[。！？!?；;]/.test(text[left - 1] ?? "")) {
          pos = left;
          break;
        }
      }
      const a = text.slice(0, pos).trim();
      const b = text.slice(pos).trim();
      return [a, b].filter(Boolean);
    };

    if (paras.length === 1 && normalizedBody.length >= 160) {
      paras.splice(0, 1, ...splitOne(paras[0]));
    }
    if (paras.length === 2 && normalizedBody.length >= 260) {
      const idx = paras[0].length >= paras[1].length ? 0 : 1;
      if (paras[idx].length >= 170) {
        const parts = splitOne(paras[idx]);
        paras.splice(idx, 1, ...parts);
      }
    }

    const prefix = s.slice(0, mainHeaderEnd).replace(/[ \t]*$/, "");
    const body = paras.join("\n\n");
    if (!suffix) return `${prefix}\n\n${body}`.trimEnd();
    return `${prefix}\n\n${body}\n\n${suffix}`.trimEnd();
  }, []);

  const startTyping = useCallback(() => {
    if (rafRef.current) return;
    const tick = () => {
      const full = fullTextRef.current;
      const shown = shownLenRef.current;
      if (shown < full.length) {
        const delta = Math.max(1, Math.ceil((full.length - shown) / 18));
        const nextLen = Math.min(full.length, shown + delta);
        shownLenRef.current = nextLen;
        setShownText(full.slice(0, nextLen));
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      if (doneRef.current) {
        if (!formattedRef.current) {
          formattedRef.current = true;
          const formatted = formatReportLayout(fullTextRef.current);
          fullTextRef.current = formatted;
          shownLenRef.current = formatted.length;
          setShownText(formatted);
          setStreamDone(true);
          rafRef.current = null;
          return;
        }
        setStreamDone(true);
        rafRef.current = null;
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [formatReportLayout]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [shownText]);

  useEffect(() => {
    return () => {
      stopTyping();
    };
  }, [stopTyping]);

  const runReportStream = useCallback(
    async (scope: "2024" | "2025" | "all") => {
      const meta = pearlMeta[scope];
      stopTyping();
      fullTextRef.current = "";
      shownLenRef.current = 0;
      doneRef.current = false;
      formattedRef.current = false;
      setShownText("");
      setStreamDone(false);

      const ac = new AbortController();
      abortRef.current = ac;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: ac.signal,
          body: JSON.stringify({
            persona: "reportArchitect",
            message: meta.label === "历年汇总" ? "生成 历年汇总 报告" : `生成 ${meta.label} 年度报告`,
            history: [],
            reportRange:
              scope === "all"
                ? { mode: "all" }
                : {
                    mode: scope,
                    start: meta.range?.start,
                    end: meta.range?.end,
                  },
          }),
        });

        if (!res.ok || !res.body) {
          doneRef.current = true;
          fullTextRef.current = "报告生成失败，请稍后再试。";
          startTyping();
          return;
        }

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
                const json = JSON.parse(dataLine) as { delta?: string };
                const delta = json.delta ?? "";
                if (delta) {
                  fullTextRef.current = sanitizePlainText(fullTextRef.current + delta);
                  startTyping();
                }
              } catch {}
            } else if (eventName === "done") {
              doneRef.current = true;
              startTyping();
            } else if (eventName === "error") {
              doneRef.current = true;
              if (!fullTextRef.current.trim()) {
                fullTextRef.current = "报告生成失败，请稍后再试。";
              }
              fullTextRef.current = sanitizePlainText(fullTextRef.current);
              startTyping();
            }
          }
        }

        doneRef.current = true;
        fullTextRef.current = sanitizePlainText(fullTextRef.current);
        startTyping();
      } catch {
        doneRef.current = true;
        if (!fullTextRef.current.trim()) {
          fullTextRef.current = "报告生成失败，请稍后再试。";
        }
        fullTextRef.current = sanitizePlainText(fullTextRef.current);
        startTyping();
      }
    },
    [pearlMeta, sanitizePlainText, startTyping, stopTyping],
  );

  const onPearlClick = useCallback((scope: "2024" | "2025" | "all", el: HTMLElement) => {
    if (phase !== "idle") return;
    const stage = stageRef.current;
    if (stage) {
      const stageRect = stage.getBoundingClientRect();
      const pearlRect = el.getBoundingClientRect();
      setCanvasTarget({
        x: pearlRect.left + pearlRect.width / 2 - stageRect.left,
        y: pearlRect.top + pearlRect.height / 2 - stageRect.top,
      });
    } else {
      setCanvasTarget(null);
    }
    setSelectedPearl(scope);
    setPhase("aggregating");
    window.setTimeout(() => {
      setPhase("scroll");
      runReportStream(scope);
    }, 920);
  }, [phase, runReportStream]);

  const onBack = useCallback(() => {
    stopTyping();
    setPhase("idle");
    setSelectedPearl(null);
    setCanvasTarget(null);
    setShownText("");
    setStreamDone(false);
  }, [stopTyping]);

  const downloadReport = useCallback(() => {
    const scope = selectedPearl ?? "all";
    const meta = pearlMeta[scope];
    const text = fullTextRef.current || shownText;
    if (!text.trim()) return;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `丸子的浮生百宝报告_${meta.label}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [pearlMeta, selectedPearl, shownText]);

  return (
    <div className="relative">
      <div className="relative overflow-hidden rounded-[28px]">
        <div className="absolute inset-0 bg-[url('/bg-lab.png')] bg-cover bg-center" />
        <div className="relative rounded-[28px] border border-white/15 bg-white/5 shadow-[0_18px_70px_rgba(0,0,0,0.2)] backdrop-blur-md">
          <div ref={stageRef} className="relative h-[560px] w-full">
          <SparkStarCanvas
            seed={20260223}
            density={240}
            phase={phase}
            target={canvasTarget}
          />

          {(() => {
            const pearls = [
              { id: "p0", y: 8, r: 12 },
              { id: "p1", y: 16, r: 18 },
              { id: "p2", y: 26, r: 28, key: "2024" as const, label: "2024" },
              { id: "p3", y: 36, r: 14 },
              { id: "p4", y: 46, r: 22 },
              { id: "p5", y: 56, r: 26, key: "2025" as const, label: "2025" },
              { id: "p6", y: 66, r: 16 },
              { id: "p7", y: 75, r: 20 },
              { id: "p8", y: 84, r: 30, key: "all" as const, label: "历年汇总" },
              { id: "p9", y: 92, r: 10 },
            ];

            const buildPath = () => {
              const pts = pearls.map((p) => ({ x: 50, y: p.y }));
              let d = `M ${pts[0].x} ${pts[0].y}`;
              for (let i = 1; i < pts.length; i += 1) {
                const prev = pts[i - 1];
                const cur = pts[i];
                const dx = i % 2 === 0 ? 10 : -10;
                const cp1x = prev.x + dx;
                const cp1y = prev.y + (cur.y - prev.y) * 0.33;
                const cp2x = cur.x - dx;
                const cp2y = prev.y + (cur.y - prev.y) * 0.66;
                d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${cur.x} ${cur.y}`;
              }
              return d;
            };

            return (
              <>
                <svg
                  className="absolute inset-0"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <motion.path
                    d={buildPath()}
                    fill="none"
                    stroke="rgba(255,210,120,0.75)"
                    strokeWidth="1.8"
                    vectorEffect="non-scaling-stroke"
                    style={{
                      filter:
                        "drop-shadow(0 0 10px rgba(255,210,120,0.38)) drop-shadow(0 0 22px rgba(255,210,120,0.22))",
                    }}
                    animate={{ opacity: [0.45, 1, 0.45] }}
                    transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                  />
                </svg>

                <div className="absolute inset-0">
                  {pearls.map((p) => {
                    const size = p.r * 2;
                    const interactive = Boolean((p as { key?: string }).key);
                    const key = (p as { key?: "2024" | "2025" | "all" }).key;
                    const label = (p as { label?: string }).label;
                    const inner = (
                      <>
                        <motion.span
                          animate={
                            phase === "idle"
                              ? { scale: [1, 1.05, 1], opacity: [0.72, 1, 0.72] }
                              : { scale: 0.95, opacity: 0.68 }
                          }
                          transition={
                            phase === "idle"
                              ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
                              : { duration: 0.2 }
                          }
                          className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_28%,rgba(255,255,255,0.92),rgba(255,236,190,0.60)_34%,rgba(255,210,120,0.22)_62%,rgba(0,0,0,0)_80%)] shadow-[0_0_0_1px_rgba(255,255,255,0.16),0_16px_70px_rgba(255,210,120,0.10),0_0_44px_rgba(255,215,140,0.16)]"
                        />
                        <motion.span
                          animate={
                            phase === "idle"
                              ? { opacity: [0.08, 0.35, 0.08], scale: [1, 1.18, 1] }
                              : { opacity: 0 }
                          }
                          transition={
                            phase === "idle"
                              ? { duration: 2.9, repeat: Infinity, ease: "easeInOut" }
                              : { duration: 0.2 }
                          }
                          className="absolute -inset-6 rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(255,210,120,0.18),rgba(0,0,0,0)_70%)]"
                        />
                      </>
                    );

                    return (
                      <div
                        key={p.id}
                        className="absolute left-1/2"
                        style={{ top: `${p.y}%`, transform: "translate(-50%, -50%)" }}
                      >
                        {interactive ? (
                          <button
                            type="button"
                            disabled={phase !== "idle"}
                            onClick={(e) => onPearlClick(key!, e.currentTarget)}
                            className="relative block rounded-full disabled:opacity-70"
                            style={{ width: size, height: size }}
                            aria-label={`生成 ${label} 报告`}
                          >
                            {inner}
                          </button>
                        ) : (
                          <div
                            className="relative block rounded-full"
                            style={{ width: size, height: size }}
                          >
                            {inner}
                          </div>
                        )}

                        {interactive ? (
                          <div className="pointer-events-none absolute left-[calc(100%+14px)] top-1/2 -translate-y-1/2">
                            <div className="text-sm font-semibold tracking-wide text-[rgba(255,236,190,0.95)] drop-shadow-[0_10px_34px_rgba(0,0,0,0.85)]">
                              {label}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}

          <AnimatePresence>
            {phase === "aggregating" ? (
              <motion.div
                key="waterfall"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="absolute inset-x-6 top-10"
              >
                <div className="grid gap-2">
                  {waterfallLines.map((line, i) => (
                    <motion.div
                      key={line}
                      initial={{ opacity: 0, y: -10, filter: "blur(3px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      transition={{ duration: 0.35, delay: 0.08 * i }}
                      className="px-1 text-xs leading-6 text-white/88 drop-shadow-[0_10px_32px_rgba(0,0,0,0.85)]"
                    >
                      {line}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {phase === "idle" ? (
            <div className="absolute inset-x-6 bottom-6 text-center text-xs leading-6 text-white/75">
              轻触岁华珠，聆听岁月回响
            </div>
          ) : null}
        </div>
      </div>
      </div>

      <AnimatePresence>
        {phase === "scroll" ? (
          <motion.div
            key="scroll"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          >
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <motion.div
                initial={{
                  clipPath: "inset(0 50% 0 50% round 34px)",
                  opacity: 0,
                }}
                animate={{
                  clipPath: "inset(0 0% 0 0% round 26px)",
                  opacity: 1,
                }}
                exit={{
                  clipPath: "inset(0 50% 0 50% round 34px)",
                  opacity: 0,
                }}
                transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                className="relative w-full max-w-3xl overflow-hidden rounded-[26px] border border-white/15 bg-[linear-gradient(180deg,rgba(255,244,220,0.92)_0%,rgba(252,240,214,0.92)_45%,rgba(249,233,201,0.92)_100%)] shadow-[0_34px_140px_rgba(0,0,0,0.55)]"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_22%,rgba(255,255,255,0.9),rgba(255,255,255,0)_55%)] opacity-60" />
                <div className="absolute inset-x-0 top-0 h-10 bg-[linear-gradient(90deg,rgba(255,210,120,0)_0%,rgba(255,210,120,0.55)_35%,rgba(255,210,120,0.0)_100%)] opacity-55" />
                <div className="absolute inset-x-0 bottom-0 h-10 bg-[linear-gradient(90deg,rgba(255,210,120,0)_0%,rgba(255,210,120,0.45)_35%,rgba(255,210,120,0.0)_100%)] opacity-55" />

                <div className="relative flex max-h-[calc(100dvh-64px)] flex-col">
                  <div className="flex items-center justify-between gap-3 border-b border-black/10 px-6 py-4">
                    <div className="text-sm font-semibold tracking-wide text-[color:color-mix(in_oklab,var(--color-dh-ink),transparent_15%)]">
                      {pearlMeta[selectedPearl ?? "all"].title}
                    </div>
                    <div className="text-xs text-[color:color-mix(in_oklab,var(--color-dh-ink),transparent_45%)]">
                      {pearlMeta[selectedPearl ?? "all"].label}
                    </div>
                  </div>

                  <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto px-6 py-5"
                  >
                    <div className="whitespace-pre-wrap text-[15px] leading-8 text-[color:color-mix(in_oklab,var(--color-dh-ink),transparent_10%)] [font-family:var(--font-hand)]">
                      {shownText || "正在落笔…"}
                    </div>
                  </div>

                  <div className="border-t border-black/10 px-6 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs text-[color:color-mix(in_oklab,var(--color-dh-ink),transparent_45%)]">
                        {streamDone ? "已生成" : "流式生成中"}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={downloadReport}
                          disabled={!streamDone}
                          className="rounded-full border border-black/10 bg-black/5 px-4 py-2 text-xs font-medium text-[color:color-mix(in_oklab,var(--color-dh-ink),transparent_10%)] transition-colors hover:bg-black/10 disabled:opacity-40"
                        >
                          下载报告
                        </button>
                        <button
                          type="button"
                          onClick={onBack}
                          disabled={!streamDone}
                          className="rounded-full border border-black/10 bg-black/5 px-4 py-2 text-xs font-medium text-[color:color-mix(in_oklab,var(--color-dh-ink),transparent_10%)] transition-colors hover:bg-black/10 disabled:opacity-40"
                        >
                          未完待续
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function ExplorationSpace({
  assets,
  isLoading,
  errorText,
}: {
  assets: ExplorationAssets | null;
  isLoading: boolean;
  errorText: string;
}) {
  const [subTab, setSubTab] = useState<ExploreSubTab>("starmap");
  const [starMapMode, setStarMapMode] = useState<StarMapMode>("map");

  return (
    <div className="flex flex-col gap-4 px-1">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold leading-7 tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.65)]">
          探索流空间
        </h2>
        {subTab === "starmap" ? (
          <button
            type="button"
            onClick={() =>
              setStarMapMode((m) => (m === "map" ? "cloud" : "map"))
            }
            className="relative flex h-8 shrink-0 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 text-[11px] font-medium text-white/85 backdrop-blur-md"
            aria-label="星图/词云切换"
          >
            <span className="relative z-10">{starMapMode === "cloud" ? "词云" : "星图"}</span>
            <span className="relative h-4 w-8 rounded-full bg-black/25">
              <motion.span
                animate={{ x: starMapMode === "cloud" ? 16 : 0 }}
                transition={{ type: "spring", stiffness: 520, damping: 40 }}
                className="absolute left-0 top-0 h-4 w-4 rounded-full bg-white/80 shadow-[0_8px_24px_rgba(0,0,0,0.3)]"
              />
            </span>
          </button>
        ) : null}
      </div>

      <SegmentedControl value={subTab} onChange={setSubTab} />

      {errorText ? (
        <div className="rounded-[24px] border border-white/15 bg-white/10 p-4 text-xs leading-6 text-white/80 backdrop-blur-md">
          {errorText}
        </div>
      ) : null}

      {isLoading && !assets ? (
        <div className="rounded-[28px] border border-white/15 bg-white/10 p-5 text-xs text-white/75 backdrop-blur-md">
          正在加载探索流素材……
        </div>
      ) : null}

      {assets ? (
        <AnimatePresence mode="wait">
          <motion.div
            key={subTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="flex flex-col gap-4"
          >
            {subTab === "starmap" ? (
              <StarMapFlow
                memories={assets.memories}
                milestones={assets.milestones}
                mode={starMapMode}
              />
            ) : null}
            {subTab === "lifetree" ? (
              <LifeTree
                skillMap={assets.skillMap}
                memories={assets.memories}
                milestones={assets.milestones}
              />
            ) : null}
            {subTab === "echo" ? (
              <EchoChamber />
            ) : null}
            {subTab === "spark" ? (
              <InspirationEmergence
                memories={assets.memories}
                milestones={assets.milestones}
              />
            ) : null}
          </motion.div>
        </AnimatePresence>
      ) : null}
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
  const [isStarted, setIsStarted] = useState(false);
  const [tab, setTab] = useState<TabKey>("curtain");
  const [explorationAssets, setExplorationAssets] =
    useState<ExplorationAssets | null>(null);
  const [explorationErrorText, setExplorationErrorText] = useState("");
  const [isExplorationLoading, setIsExplorationLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [bgmReady, setBgmReady] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const startingRef = useRef(false);

  const bgmUrl = useMemo(() => encodeURI("/X-Ray Dog - Time Will Tell.mp3"), []);
  const targetVolume = 0.22;

  const decodeAudioCompat = useCallback((ctx: AudioContext, data: ArrayBuffer) => {
    return new Promise<AudioBuffer>((resolve, reject) => {
      let settled = false;
      const done = (buf: AudioBuffer) => {
        if (settled) return;
        settled = true;
        resolve(buf);
      };
      const fail = (err: unknown) => {
        if (settled) return;
        settled = true;
        reject(err);
      };
      try {
        const ret = ctx.decodeAudioData(data.slice(0), done, fail) as unknown;
        if (ret && typeof (ret as { then?: unknown }).then === "function") {
          (ret as Promise<AudioBuffer>).then(done).catch(fail);
        }
      } catch (err) {
        fail(err);
      }
    });
  }, []);

  const ensureBgm = useCallback(async () => {
    if (startingRef.current) return;
    if (bgmReady && audioCtxRef.current && gainRef.current && sourceRef.current) {
      const ctx = audioCtxRef.current;
      if (ctx.state !== "running") {
        await ctx.resume().catch(() => {});
      }
      return;
    }

    const AC =
      typeof window !== "undefined"
        ? window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext
        : null;
    if (!AC) return;

    startingRef.current = true;
    try {
      const ctx = audioCtxRef.current ?? new AC();
      audioCtxRef.current = ctx;
      await ctx.resume().catch(() => {});

      const res = await fetch(bgmUrl);
      const ab = await res.arrayBuffer();
      const buf = await decodeAudioCompat(ctx, ab);

      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start(0);

      const finalVol = isMuted ? 0 : targetVolume;
      gain.gain.linearRampToValueAtTime(finalVol, ctx.currentTime + 2);

      sourceRef.current = src;
      gainRef.current = gain;
      setBgmReady(true);

      if (ctx.state !== "running") {
        const resume = () => {
          ctx.resume().catch(() => {});
        };
        window.addEventListener("touchstart", resume, {
          once: true,
          passive: true,
        });
        document.addEventListener(
          "WeixinJSBridgeReady",
          resume,
          { once: true } as AddEventListenerOptions,
        );
        document.addEventListener(
          "YixinJSBridgeReady",
          resume,
          { once: true } as AddEventListenerOptions,
        );
      }
    } catch {
      sourceRef.current = null;
      gainRef.current = null;
      setBgmReady(false);
    } finally {
      startingRef.current = false;
    }
  }, [bgmReady, bgmUrl, decodeAudioCompat, isMuted]);

  useEffect(() => {
    const ctx = audioCtxRef.current;
    const gain = gainRef.current;
    if (!ctx || !gain) return;
    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setTargetAtTime(isMuted ? 0 : targetVolume, now, 0.12);
  }, [isMuted]);

  useEffect(() => {
    return () => {
      try {
        sourceRef.current?.stop();
      } catch {}
      try {
        sourceRef.current?.disconnect();
      } catch {}
      try {
        gainRef.current?.disconnect();
      } catch {}
      void audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (!isStarted) return;
    let cancelled = false;

    const load = async () => {
      try {
        const [memoriesMod, milestonesMod, skillMapMod, cloneRes] =
          await Promise.all([
            import("../assets/character_memory_v2.json"),
            import("../assets/relationship_milestones.json"),
            import("../assets/skill_evolution_map.json"),
            fetch("/api/assets/clone-voice-settings"),
          ]);

        const cloneText = cloneRes.ok ? await cloneRes.text() : "";

        if (cancelled) return;
        setExplorationAssets({
          memories: (memoriesMod.default?.entries ??
            []) as CharacterMemoryEntry[],
          milestones: (milestonesMod.default?.milestones ??
            []) as RelationshipMilestone[],
          skillMap: (skillMapMod.default ?? null) as SkillEvolutionMap | null,
          cloneVoiceSettingsText: cloneText,
        });
      } catch {
        if (cancelled) return;
        setExplorationErrorText("探索流素材加载失败，请稍后再试。");
      } finally {
        if (cancelled) return;
        setIsExplorationLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [isStarted]);

  const backgroundSrc = useMemo(() => {
    if (tab === "curtain") return "/bg-curtain.png";
    if (tab === "shop") return "/bg-shop.png";
    if (tab === "lab") return "/bg-lab.png";
    return "/bg-curation.png";
  }, [tab]);

  const tabLabel = useMemo(() => {
    if (tab === "curtain") return "时光艺术展";
    if (tab === "shop") return "解忧杂货铺";
    if (tab === "lab") return "探索流空间";
    return "跨界策划台";
  }, [tab]);

  return (
    <AnimatePresence mode="wait">
      {!isStarted ? (
        <motion.div
          key="cover"
          initial={{ opacity: 1, scale: 1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-50 bg-black"
        >
          <div className="absolute inset-0">
            <Image
              src="/wanzix2.png"
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover object-[50%_72%] blur-[10px] brightness-[0.88] saturate-[1.05]"
            />
            <div className="absolute inset-0 bg-black/20" />
          </div>

          <div className="absolute inset-0 mx-auto flex h-dvh w-full max-w-3xl items-center justify-center p-6">
            <div className="relative w-full max-w-[560px] aspect-[9/16] overflow-hidden rounded-[28px] border border-white/20 bg-white/5 shadow-[0_34px_140px_rgba(0,0,0,0.55)] backdrop-blur-sm">
              <Image
                src="/wanzix2.png"
                alt=""
                fill
                priority
                sizes="(max-width: 768px) 100vw, 560px"
                className="object-cover object-[50%_72%]"
              />
              <button
                type="button"
                onClick={async () => {
                  await ensureBgm();
                  setIsStarted(true);
                }}
                className="absolute left-1/2 top-1/2 grid h-[86px] w-[86px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-[color:color-mix(in_oklab,var(--color-dh-gold),transparent_18%)] bg-white/20 text-[13px] font-medium tracking-wide text-white shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur-md transition-transform active:scale-[0.98]"
                aria-label="点击进入"
              >
                点击进入
              </button>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="main"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
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
                    {tab !== "curation" &&
                    tab !== "shop" &&
                    tab !== "curtain" &&
                    tab !== "lab" ? (
                      <p className="text-sm leading-6 text-[color:color-mix(in_oklab,var(--color-dh-ink),transparent_35%)]">
                        {tabLabel} · 敦煌五彩 · 盲盒治愈感
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsMuted((m) => !m)}
                      className={`relative grid h-10 w-10 place-items-center rounded-2xl border border-white/15 bg-white/10 text-white/90 shadow-[0_14px_50px_rgba(0,0,0,0.22)] backdrop-blur-md transition-opacity ${
                        isMuted ? "opacity-55" : "opacity-95"
                      }`}
                      aria-label={isMuted ? "取消静音" : "静音"}
                    >
                      <motion.span
                        animate={
                          bgmReady && !isMuted
                            ? { y: [0, -1.2, 0], rotate: [0, 1.2, 0] }
                            : { y: 0, rotate: 0 }
                        }
                        transition={
                          bgmReady && !isMuted
                            ? { duration: 2.6, repeat: Infinity, ease: "easeInOut" }
                            : { duration: 0.2 }
                        }
                        className="grid place-items-center"
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M9 19V6l12-2v13"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M9 19c0 1.657-1.567 3-3.5 3S2 20.657 2 19s1.567-3 3.5-3S9 17.343 9 19z"
                            stroke="currentColor"
                            strokeWidth="1.8"
                          />
                          <path
                            d="M21 17c0 1.657-1.567 3-3.5 3S14 18.657 14 17s1.567-3 3.5-3S21 15.343 21 17z"
                            stroke="currentColor"
                            strokeWidth="1.8"
                          />
                          {isMuted ? (
                            <path
                              d="M4 4l16 16"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                            />
                          ) : null}
                        </svg>
                      </motion.span>
                    </button>

                    {tab !== "curation" &&
                    tab !== "shop" &&
                    tab !== "curtain" &&
                    tab !== "lab" ? (
                      <div className="text-right">
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
                    {tab === "curtain" ? <TimeArtExhibition /> : null}

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
                      <ExplorationSpace
                        assets={explorationAssets}
                        isLoading={isExplorationLoading}
                        errorText={explorationErrorText}
                      />
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
                    <div className="grid grid-cols-4 gap-2">
                      {(
                        [
                          ["curtain", "时光艺术展"],
                          ["shop", "解忧杂货铺"],
                          ["lab", "探索流空间"],
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}
