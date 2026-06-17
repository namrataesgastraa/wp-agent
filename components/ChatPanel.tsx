"use client";

import { useEffect, useRef, useState } from "react";
import type { Conversation, ConversationMode, Message } from "@/lib/types";
import { formatTime } from "@/lib/format";

interface Props {
  conversation: Conversation | null;
  messages: Message[];
  onToggleMode: (mode: ConversationMode) => void;
  onSend: (content: string) => Promise<void>;
}

export default function ChatPanel({
  conversation,
  messages,
  onToggleMode,
  onSend,
}: Props) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!conversation) {
    return (
      <section className="hidden flex-1 items-center justify-center chat-bg text-gray-400 sm:flex">
        <p>Select a conversation to start</p>
      </section>
    );
  }

  const isAgent = conversation.mode === "agent";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await onSend(text);
      setInput("");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="flex flex-1 flex-col">
      {/* Header */}
      <header className="flex items-center justify-between gap-3 border-b border-gray-200 bg-wa-dark px-4 py-3 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-wa-green">
            {(conversation.name || conversation.phone).charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-medium leading-tight">
              {conversation.name || conversation.phone}
            </div>
            <div className="text-xs text-gray-200">{conversation.phone}</div>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              isAgent
                ? "bg-green-500 text-white"
                : "bg-orange-500 text-white"
            }`}
          >
            {isAgent ? "Agent" : "Human"}
          </span>
          <button
            onClick={() => onToggleMode(isAgent ? "human" : "agent")}
            className="rounded-md border border-white/40 px-2.5 py-1 text-xs hover:bg-white/10"
          >
            Switch to {isAgent ? "Human" : "Agent"}
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 space-y-2 overflow-y-auto chat-bg px-4 py-4">
        {messages.map((m) => {
          const outbound = m.role === "assistant";
          return (
            <div
              key={m.id}
              className={`flex ${outbound ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-lg px-3 py-2 shadow-sm ${
                  outbound ? "bg-wa-bubble-out" : "bg-wa-bubble-in"
                }`}
              >
                <p className="whitespace-pre-wrap break-words text-sm text-gray-800">
                  {m.content}
                </p>
                <div className="mt-1 text-right text-[10px] text-gray-400">
                  {outbound ? "Reply" : "Customer"} · {formatTime(m.created_at)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input — available in both modes */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-gray-200 bg-gray-50 px-4 py-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            isAgent
              ? "Send a manual message (overrides the AI)…"
              : "Type your reply…"
          }
          className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm focus:border-wa-green focus:outline-none"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="rounded-full bg-wa-green px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {sending ? "…" : "Send"}
        </button>
      </form>
    </section>
  );
}
