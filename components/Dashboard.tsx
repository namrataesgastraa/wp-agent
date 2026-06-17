"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Sidebar from "./Sidebar";
import ChatPanel from "./ChatPanel";
import { getBrowserClient } from "@/lib/supabase-browser";
import type {
  Conversation,
  ConversationMode,
  ConversationWithLast,
  Message,
} from "@/lib/types";

export default function Dashboard() {
  const [conversations, setConversations] = useState<ConversationWithLast[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unread, setUnread] = useState<Set<string>>(new Set());

  // Keep the latest activeId available inside realtime callbacks.
  const activeIdRef = useRef<string | null>(null);
  activeIdRef.current = activeId;

  const loadConversations = useCallback(async () => {
    const res = await fetch("/api/conversations");
    const json = await res.json();
    setConversations(json.conversations ?? []);
  }, []);

  const loadMessages = useCallback(async (id: string) => {
    const res = await fetch(`/api/conversations/${id}/messages`);
    const json = await res.json();
    setMessages(json.messages ?? []);
  }, []);

  // Initial load.
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load messages whenever the active conversation changes, and clear its unread flag.
  useEffect(() => {
    if (!activeId) return;
    loadMessages(activeId);
    setUnread((prev) => {
      if (!prev.has(activeId)) return prev;
      const next = new Set(prev);
      next.delete(activeId);
      return next;
    });
  }, [activeId, loadMessages]);

  // Realtime: react to new messages and conversation changes.
  useEffect(() => {
    const supabase = getBrowserClient();
    const channel = supabase
      .channel("dashboard")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as Message;
          // Refresh sidebar previews/ordering.
          loadConversations();
          if (msg.conversation_id === activeIdRef.current) {
            setMessages((prev) =>
              prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
            );
          } else if (msg.role === "user") {
            setUnread((prev) => new Set(prev).add(msg.conversation_id));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => loadConversations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadConversations]);

  const activeConversation: Conversation | null =
    conversations.find((c) => c.id === activeId) ?? null;

  async function handleToggleMode(mode: ConversationMode) {
    if (!activeId) return;
    // Optimistic update.
    setConversations((prev) =>
      prev.map((c) => (c.id === activeId ? { ...c, mode } : c))
    );
    await fetch(`/api/conversations/${activeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });
  }

  async function handleSend(content: string) {
    if (!activeId) return;
    const res = await fetch(`/api/conversations/${activeId}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) {
      alert("Failed to send message. Check the WhatsApp API credentials.");
      return;
    }
    const json = await res.json();
    if (json.message) {
      setMessages((prev) =>
        prev.some((m) => m.id === json.message.id)
          ? prev
          : [...prev, json.message]
      );
    }
    loadConversations();
  }

  return (
    <div className="flex h-full">
      <div className={activeId ? "hidden sm:block" : "block w-full sm:w-auto"}>
        <Sidebar
          conversations={conversations}
          activeId={activeId}
          unread={unread}
          onSelect={setActiveId}
        />
      </div>
      <ChatPanel
        conversation={activeConversation}
        messages={messages}
        onToggleMode={handleToggleMode}
        onSend={handleSend}
      />
    </div>
  );
}
