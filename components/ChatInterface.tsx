"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

type Persona = "lizhi" | "songzhi";

type ChatMsg =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; persona: Persona };

export default function ChatInterface() {
  const [persona, setPersona] = useState<Persona>("lizhi");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [assistantDraft, setAssistantDraft] = useState("");
  const [assistantDraftPersona, setAssistantDraftPersona] =
    useState<Persona>("lizhi");
  const streamAbortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const assistant = useMemo(() => {
    if (persona === "songzhi") {
      return {
        name: "松子",
        avatarSrc: "/songzhi-avatar.png",
        bubbleClassName:
          "bg-[color:color-mix(in_oklab,var(--color-dh-red),transparent_82%)]",
        reply:
          "我虽调皮捣蛋，却脑瓜机灵，妈妈有什么事业难题，松子鬼灵精都能为你出主意：）",
      };
    }

    return {
      name: "栗子",
      avatarSrc: "/lizhi-avatar.png",
      bubbleClassName:
        "bg-[color:color-mix(in_oklab,var(--color-dh-azure),transparent_80%)]",
      reply: "妈妈有什么不如意的事都可以跟我说，让栗子宝贝萌化你的心吧：）",
    };
  }, [persona]);

  useEffect(() => {
    return () => {
      streamAbortRef.current?.abort();
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const syncInputHeight = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "0px";
    const next = Math.min(160, Math.max(44, el.scrollHeight));
    el.style.height = `${next}px`;
  }, []);

  useEffect(() => {
    syncInputHeight();
  }, [input, syncInputHeight]);

  useEffect(() => {
    if (!bottomRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ block: "end" });
    });
  }, [messages, assistantDraft]);

  const callApiStream = async ({
    message,
    shortcut,
    history,
    personaForRequest,
  }: {
    message?: string;
    shortcut?: "loveCode";
    history: Array<{ role: "user" | "assistant"; content: string }>;
    personaForRequest: Persona;
  }) => {
    streamAbortRef.current?.abort();
    const abortController = new AbortController();
    streamAbortRef.current = abortController;

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: abortController.signal,
      body: JSON.stringify({
        persona: personaForRequest,
        message: message ?? "",
        shortcut,
        history,
      }),
    });

    if (!res.ok) {
      throw new Error("bad response");
    }

    if (!res.body) {
      throw new Error("missing body");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let full = "";

    setAssistantDraft("");
    setAssistantDraftPersona(personaForRequest);

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
          const trimmed = line.trim();
          if (trimmed.startsWith("event:")) {
            eventName = trimmed.slice(6).trim();
          } else if (trimmed.startsWith("data:")) {
            dataLine += trimmed.slice(5).trim();
          }
        }

        if (eventName === "delta") {
          try {
            const parsed = JSON.parse(dataLine) as { delta?: string };
            const delta = parsed.delta ?? "";
            if (delta) {
              full += delta;
              setAssistantDraft(full);
            }
          } catch {}
        } else if (eventName === "done") {
          if (full.trim()) {
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: full, persona: personaForRequest },
            ]);
          }
          setAssistantDraft("");
          return;
        }
      }
    }

    if (full.trim()) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: full, persona: personaForRequest },
      ]);
      setAssistantDraft("");
      return;
    }

    throw new Error("empty stream");
  };

  const showFallback = () => {
    const fallback = "哎呀，网络开小差了，一定是栗子刚才偷吃了路由器！";
    setAssistantDraft("");
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: fallback, persona: "songzhi" },
    ]);
  };

  const downloadChat = () => {
    const lines: string[] = [];
    for (const m of messages) {
      if (m.role === "user") {
        lines.push(`丸子：${m.content}`);
      } else {
        lines.push(`${m.persona === "lizhi" ? "栗子" : "松子"}：${m.content}`);
      }
      lines.push("");
    }
    if (assistantDraft.trim()) {
      lines.push(
        `${assistantDraftPersona === "lizhi" ? "栗子" : "松子"}：${assistantDraft}`,
      );
      lines.push("");
    }

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "丸子的浮生百宝舞台-对话.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    const nextUserMessage = { role: "user" as const, content: trimmed };
    const personaForRequest = persona;
    const historyForApi = [...messages, nextUserMessage]
      .slice(-10)
      .map((m) =>
        m.role === "assistant"
          ? { role: "assistant" as const, content: m.content }
          : { role: "user" as const, content: m.content },
      );
    setMessages((prev) => [...prev, nextUserMessage]);
    setInput("");
    setIsSending(true);

    try {
      await callApiStream({
        message: trimmed,
        history: historyForApi,
        personaForRequest,
      });
    } catch {
      showFallback();
    } finally {
      setIsSending(false);
    }
  };

  const sendLoveCode = async () => {
    if (isSending) return;
    setIsSending(true);
    const nextUserMessage = { role: "user" as const, content: "解忧暗号" };
    const personaForRequest = persona;
    const historyForApi = [...messages, nextUserMessage]
      .slice(-10)
      .map((m) =>
        m.role === "assistant"
          ? { role: "assistant" as const, content: m.content }
          : { role: "user" as const, content: m.content },
      );
    setMessages((prev) => [...prev, nextUserMessage]);
    try {
      await callApiStream({
        shortcut: "loveCode",
        history: historyForApi,
        personaForRequest,
      });
    } catch {
      showFallback();
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="relative flex h-[calc(100dvh-280px)] flex-col md:h-[70vh]">
      <div className="flex items-center justify-between px-1">
        <div className="inline-flex items-center gap-2">
          <motion.div
            key={persona}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="relative h-8 w-8 overflow-hidden rounded-full border border-white/25 bg-white/10"
          >
            <Image
              src={assistant.avatarSrc}
              alt={assistant.name}
              fill
              loading="lazy"
              sizes="32px"
              className="object-cover"
            />
          </motion.div>
          <div className="text-sm font-medium text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.55)]">
            {assistant.name}
          </div>
          <div className="text-xs text-white/75 drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)]">
            {persona === "lizhi" ? "治愈模式" : "灵感模式"}
          </div>
        </div>

        <button
          type="button"
          onClick={downloadChat}
          className="inline-flex h-9 items-center rounded-2xl border border-white/20 bg-white/10 px-3 text-xs font-medium text-white backdrop-blur-md drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]"
        >
          下载对话
        </button>
      </div>

      <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl bg-white/12 shadow-[0_18px_48px_rgba(0,0,0,0.28)] backdrop-blur-md">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <button
            type="button"
            onClick={sendLoveCode}
            disabled={isSending}
            className="inline-flex h-9 items-center rounded-2xl border border-white/20 bg-white/10 px-3 text-xs font-medium text-white"
          >
            解忧暗号
          </button>
          <div className="flex items-center gap-2">
            <div className="text-xs text-white/70">{isSending ? "正在召唤…" : " "}</div>
            <motion.button
              type="button"
              disabled={isSending}
              onClick={() => setPersona((p) => (p === "lizhi" ? "songzhi" : "lizhi"))}
              whileTap={{ scale: 0.95 }}
              animate={{ rotate: persona === "songzhi" ? 10 : 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 28 }}
              className="grid h-9 w-9 place-items-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md disabled:opacity-60"
              aria-label="面具切换"
            >
              <div className="relative h-5 w-5">
                <Image
                  src="/mask-toggle.png"
                  alt=""
                  fill
                  loading="lazy"
                  sizes="20px"
                  className="object-contain"
                />
              </div>
            </motion.button>
          </div>
        </div>

        <div
          ref={listRef}
          className="min-h-0 flex-1 overflow-y-auto px-4 py-3"
          style={{ scrollBehavior: "smooth" }}
        >
          <div className="flex flex-col gap-2">
            {messages.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 360, damping: 30 }}
                className="flex items-end gap-2"
              >
                <div className="relative h-9 w-9 overflow-hidden rounded-full border border-white/20 bg-white/10">
                  <Image
                    src={assistant.avatarSrc}
                    alt={assistant.name}
                    fill
                    loading="lazy"
                    sizes="36px"
                    className="object-cover"
                  />
                </div>
                <div className="max-w-[78%] whitespace-pre-wrap rounded-2xl bg-[color:color-mix(in_oklab,var(--color-dh-paper),transparent_40%)] px-3 py-2 text-sm leading-6 text-[color:var(--color-dh-ink)]">
                  {assistant.reply}
                </div>
              </motion.div>
            ) : null}

            {messages.map((m, idx) => {
              if (m.role === "assistant") {
                const a =
                  m.persona === "lizhi"
                    ? { name: "栗子", avatar: "/lizhi-avatar.png" }
                    : { name: "松子", avatar: "/songzhi-avatar.png" };

                return (
                  <motion.div
                    key={`a-${idx}-${m.content.slice(0, 12)}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 360, damping: 30 }}
                    className="flex items-end gap-2"
                  >
                    <div className="relative h-9 w-9 overflow-hidden rounded-full border border-white/20 bg-white/10">
                      <Image
                        src={a.avatar}
                        alt={a.name}
                        fill
                        loading="lazy"
                        sizes="36px"
                        className="object-cover"
                      />
                    </div>
                    <div className="max-w-[78%] whitespace-pre-wrap rounded-2xl bg-[color:color-mix(in_oklab,var(--color-dh-paper),transparent_40%)] px-3 py-2 text-sm leading-6 text-[color:var(--color-dh-ink)]">
                      {m.content}
                    </div>
                  </motion.div>
                );
              }

              return (
                <motion.div
                  key={`u-${idx}-${m.content.slice(0, 12)}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 360, damping: 30 }}
                  className="flex items-end justify-end gap-2"
                >
                  <div className="max-w-[78%] whitespace-pre-wrap rounded-2xl bg-[color:color-mix(in_oklab,var(--color-dh-gold),transparent_70%)] px-3 py-2 text-sm leading-6 text-[color:var(--color-dh-ink)]">
                    {m.content}
                  </div>
                  <div className="relative h-9 w-9 overflow-hidden rounded-full border border-white/20 bg-white/10">
                    <Image
                      src="/maruko-avatar.png"
                      alt="丸子"
                      fill
                      loading="lazy"
                      sizes="36px"
                      className="object-cover"
                    />
                  </div>
                </motion.div>
              );
            })}

            {assistantDraft ? (
              <motion.div
                key={`draft-${assistantDraftPersona}`}
                initial={{ opacity: 0.8, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-end gap-2"
              >
                <div className="relative h-9 w-9 overflow-hidden rounded-full border border-white/20 bg-white/10">
                  <Image
                    src={
                      assistantDraftPersona === "lizhi"
                        ? "/lizhi-avatar.png"
                        : "/songzhi-avatar.png"
                    }
                    alt={assistantDraftPersona === "lizhi" ? "栗子" : "松子"}
                    fill
                    loading="lazy"
                    sizes="36px"
                    className="object-cover"
                  />
                </div>
                <div className="max-w-[78%] whitespace-pre-wrap rounded-2xl bg-[color:color-mix(in_oklab,var(--color-dh-paper),transparent_40%)] px-3 py-2 text-sm leading-6 text-[color:var(--color-dh-ink)]">
                  {assistantDraft}
                </div>
              </motion.div>
            ) : null}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="border-t border-white/10 px-4 py-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              placeholder="心里堵堵的，就说出来吧，必有回响"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              className="max-h-40 w-full resize-none rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/60"
            />
            <button
              type="button"
              onClick={() => send(input)}
              disabled={isSending}
              className="h-11 shrink-0 rounded-2xl bg-white px-4 text-sm font-medium text-[color:var(--color-dh-ink)]"
            >
              发送
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
