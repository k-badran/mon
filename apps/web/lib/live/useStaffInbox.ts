"use client";

import { useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";

import { useApi } from "@/lib/api";
import { useRealtimeEvent } from "@/lib/useRealtime";
import { isSocket, REFERENCE_POLL_MS, TRACKING_POLL_MS } from "./config";
import type { ChatRole } from "./useMessages";

/**
 * The staff side of the support conversations, kept current.
 *
 * The customer hooks in `useMessages.ts` read `/api/chat/mine`, which only ever
 * returns the caller's own threads; these read the `/api/chat/staff/*` routes,
 * which are guarded by `messages.read`. The live pattern is the same: polling
 * refetches on an interval, the socket invalidates on a `chat.message` push —
 * the server sends a customer's message and every staff action to the
 * `messages.read` feed room.
 */

export type StaffThreadFilter = "all" | "waiting" | "assistant" | "human";

export interface StaffCustomer {
  id: string;
  name: string;
  email: string;
}

export interface StaffThreadSummary {
  id: string;
  locale: string;
  isHumanHandled: boolean;
  handledByName: string | null;
  createdAt: string;
  updatedAt: string;
  /** A customer is waiting on a person; see `waitingForStaff` in the API. */
  waiting: boolean;
  /** Null for an anonymous visitor on the public site. */
  customer: StaffCustomer | null;
  lastMessage: { role: ChatRole; content: string; createdAt: string } | null;
}

export interface StaffThreadDetail extends Omit<StaffThreadSummary, "updatedAt" | "lastMessage"> {
  messages: Array<{ id: string; role: ChatRole; content: string; createdAt: string }>;
}

export const staffInboxKeys = {
  all: ["chat", "staff"] as const,
  list: (filter: StaffThreadFilter) => ["chat", "staff", "list", filter] as const,
  thread: (id: string) => ["chat", "staff", "thread", id] as const,
  waiting: ["chat", "staff", "waiting"] as const,
};

function useStaffPush(): void {
  const queryClient = useQueryClient();

  useRealtimeEvent("chat.message", () => {
    void queryClient.invalidateQueries({ queryKey: staffInboxKeys.all });
  });
}

export function useStaffThreads(
  filter: StaffThreadFilter,
): UseQueryResult<{ threads: StaffThreadSummary[] }> {
  const { sdk, user, can } = useApi();

  useStaffPush();

  return useQuery({
    queryKey: staffInboxKeys.list(filter),
    queryFn: () =>
      sdk.http.get<{ threads: StaffThreadSummary[] }>(`/api/chat/staff/threads?status=${filter}`),
    refetchInterval: isSocket ? false : TRACKING_POLL_MS,
    enabled: Boolean(user) && can("messages.read"),
  });
}

export function useStaffThread(threadId: string | null): UseQueryResult<StaffThreadDetail> {
  const { sdk, user, can } = useApi();

  useStaffPush();

  return useQuery({
    queryKey: staffInboxKeys.thread(threadId ?? ""),
    queryFn: () => sdk.http.get<StaffThreadDetail>(`/api/chat/staff/threads/${threadId}`),
    refetchInterval: isSocket ? false : TRACKING_POLL_MS,
    enabled: Boolean(user && threadId) && can("messages.read"),
  });
}

/**
 * The nav badge: conversations waiting on a person.
 *
 * Polls at the reference rate, like the customer's badge — it is on every
 * staff page, and a minute's lag is fine for a count when the inbox itself
 * refreshes every few seconds while it is open.
 */
export function useStaffWaitingCount({ enabled = true }: { enabled?: boolean } = {}) {
  const { sdk, user, can } = useApi();

  useStaffPush();

  return useQuery({
    queryKey: staffInboxKeys.waiting,
    queryFn: () => sdk.http.get<{ waiting: number }>("/api/chat/staff/waiting"),
    refetchInterval: isSocket ? false : REFERENCE_POLL_MS,
    enabled: Boolean(user) && enabled && can("messages.read"),
  });
}
