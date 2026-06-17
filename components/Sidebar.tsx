"use client";

import type { ConversationWithLast } from "@/lib/types";
import { formatTime, truncate } from "@/lib/format";

interface Props {
  conversations: ConversationWithLast[];
  activeId: string | null;
  unread: Set<string>;
  onSelect: (id: string) => void;
}

export default function Sidebar({
  conversations,
  activeId,
  unread,
  onSelect,
}: Props) {
  return (
    <aside className="flex h-full w-full flex-col border-r border-gray-200 bg-white sm:w-80 md:w-96">
      <header className="flex items-center justify-between gap-2 bg-wa-dark px-4 py-4 text-white">
        <div className="flex items-center gap-2">
          <span className="text-lg">💬</span>
          <h1 className="text-base font-semibold">ESGastraa Inbox</h1>
        </div>
        <button
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            window.location.href = "/login";
          }}
          className="rounded-md border border-white/30 px-2.5 py-1 text-xs hover:bg-white/10"
        >
          Logout
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 && (
          <p className="p-6 text-center text-sm text-gray-400">
            No conversations yet. Messages will appear here.
          </p>
        )}

        {conversations.map((c) => {
          const isActive = c.id === activeId;
          const isUnread = unread.has(c.id);
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={`flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
                isActive ? "bg-gray-100" : ""
              }`}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-wa-green text-white">
                {(c.name || c.phone).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium text-gray-900">
                    {c.name || c.phone}
                  </span>
                  <span className="shrink-0 text-xs text-gray-400">
                    {formatTime(c.last_message_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm text-gray-500">
                    {truncate(c.last_message) || "—"}
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    {c.mode === "human" && (
                      <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-700">
                        Human
                      </span>
                    )}
                    {isUnread && (
                      <span className="h-2.5 w-2.5 rounded-full bg-wa-green" />
                    )}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
