"use client";

import { useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";

import { useApi } from "@/lib/api";
import { useRealtimeEvent } from "@/lib/useRealtime";
import { isSocket, REFERENCE_POLL_MS, TRACKING_POLL_MS } from "./config";

/**
 * The signed-in user's support conversations, kept current.
 *
 * Same shape as the order hooks beside it: under polling React Query refetches
 * on an interval, under the socket a `chat.message` push invalidates the cache.
 * The server puts a staff reply into the owner's `user:` room, which every
 * signed-in socket is in, so the badge moves on any dashboard page.
 */

export type ChatRole = "user" | "assistant" | "staff" | "system";

export interface ThreadSummary {
  id: string;
  isHumanHandled: boolean;
  createdAt: string;
  updatedAt: string;
  /** Staff replies newer than the owner's last visit. */
  unread: number;
  lastMessage: { role: ChatRole; content: string; createdAt: string } | null;
}

export interface ThreadDetail {
  threadId: string;
  isHumanHandled: boolean;
  messages: Array<{ id: string; role: ChatRole; content: string; createdAt: string }>;
}

export const messageKeys = {
  mine: ["chat", "mine"] as const,
  thread: (id: string) => ["chat", "thread", id] as const,
};

/** Invalidates everything under "chat" when a message is pushed. */
function useChatPush(): void {
  const queryClient = useQueryClient();

  useRealtimeEvent("chat.message", () => {
    void queryClient.invalidateQueries({ queryKey: ["chat"] });
  });
}

/**
 * The conversation list and the unread total.
 *
 * `fast` is for the Messages screen itself. Every other page only needs the
 * badge, which polls at the slower reference rate: one cheap request a minute
 * per open tab, rather than one every five seconds on screens where nobody is
 * waiting for an answer.
 */
export function useMyThreads(
  { enabled = true, fast = false }: { enabled?: boolean; fast?: boolean } = {},
): UseQueryResult<{ threads: ThreadSummary[]; unread: number }> {
  const { sdk, user } = useApi();

  useChatPush();

  return useQuery({
    queryKey: messageKeys.mine,
    queryFn: () =>
      sdk.http.get<{ threads: ThreadSummary[]; unread: number }>("/api/chat/mine"),
    refetchInterval: isSocket ? false : fast ? TRACKING_POLL_MS : REFERENCE_POLL_MS,
    enabled: Boolean(user) && enabled,
  });
}

/** One conversation's history. */
export function useThread(threadId: string | null): UseQueryResult<ThreadDetail> {
  const { sdk, user } = useApi();

  useChatPush();

  return useQuery({
    queryKey: messageKeys.thread(threadId ?? ""),
    queryFn: () => sdk.http.get<ThreadDetail>(`/api/chat/${threadId}`),
    refetchInterval: isSocket ? false : TRACKING_POLL_MS,
    enabled: Boolean(user && threadId),
  });
}
