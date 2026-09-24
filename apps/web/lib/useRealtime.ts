"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

import { useApi } from "./api";
import { isSocket } from "./live/config";

/**
 * Live updates from the backend.
 *
 * This is the capability the previous version simply did not have: a new order
 * only appeared on the admin board when someone reloaded, two staff on the
 * same queue overwrote each other with no indication, and the availability
 * calendar could offer a slot that had been taken minutes earlier.
 *
 * The socket authenticates with the access token during the handshake. Room
 * membership is decided by the server from that identity — this hook never
 * asks to join a room it has not been granted.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface RealtimeEnvelope<T = unknown> {
  event: string;
  /** Monotonic per room; a gap means events were missed while disconnected. */
  sequence: number;
  emittedAt: string;
  payload: T;
}

export type ConnectionState = "connecting" | "connected" | "disconnected";

/**
 * Opens one shared socket for the signed-in user.
 *
 * Returns null while signed out — an anonymous visitor has nothing to receive,
 * and the server would refuse the handshake anyway.
 */
export function useSocket(): { socket: Socket | null; status: ConnectionState } {
  const { user, sdk } = useApi();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<ConnectionState>("disconnected");

  useEffect(() => {
    /**
     * Dormant under polling.
     *
     * The whole socket implementation below stays compiled and correct — this
     * is the single place the transport is honoured, so switching back is
     * NEXT_PUBLIC_LIVE_TRANSPORT=socket and nothing else.
     */
    if (!isSocket || !user) {
      setSocket(null);
      setStatus("disconnected");
      return;
    }

    setStatus("connecting");

    // Set after a refused handshake. The server closes a socket whose token has
    // expired — a connection is not torn down by its own credential running
    // out, so it has to be — and reconnecting with that same expired token
    // would refuse identically, forever.
    let renewFirst = false;

    const instance = io(API_URL, {
      path: "/realtime",
      // The token is read at connect time from the SDK's store, so a refreshed
      // access token is used on reconnect rather than a stale one.
      auth: (cb) => {
        if (!renewFirst) {
          cb({ token: sdk.http.getAccessToken() });
          return;
        }

        renewFirst = false;
        void sdk.http
          .renewAccessToken()
          .then((token) => cb({ token: token ?? sdk.http.getAccessToken() }));
      },
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
    });

    instance.on("connect", () => setStatus("connected"));
    instance.on("disconnect", () => setStatus("disconnected"));
    instance.on("connect_error", (error) => {
      renewFirst = error.message === "UNAUTHENTICATED";
      setStatus("disconnected");
    });

    setSocket(instance);

    return () => {
      instance.close();
    };
  }, [user, sdk]);

  return { socket, status };
}

/**
 * Subscribes to one event.
 *
 * `onEvent` is held in a ref so a caller passing an inline arrow function does
 * not tear down and re-register the listener on every render.
 */
export function useRealtimeEvent<T = unknown>(
  event: string,
  onEvent: (envelope: RealtimeEnvelope<T>) => void,
): ConnectionState {
  const { socket, status } = useSocket();
  const handlerRef = useRef(onEvent);

  useEffect(() => {
    handlerRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!socket) return;

    const listener = (envelope: RealtimeEnvelope<T>) => handlerRef.current(envelope);

    socket.on(event, listener);

    return () => {
      socket.off(event, listener);
    };
  }, [socket, event]);

  return status;
}

/** Watches one order, so its status stepper updates without a reload. */
export function useOrderUpdates(
  orderId: string | null,
  onUpdate: (envelope: RealtimeEnvelope<{ id: string; status: string }>) => void,
): ConnectionState {
  const { socket, status } = useSocket();
  const handlerRef = useRef(onUpdate);

  useEffect(() => {
    handlerRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!socket || !orderId) return;

    // The server verifies ownership before granting the room; a refusal simply
    // means no live updates, not an error the user needs to see.
    socket.emit("subscribe:order", orderId, (granted: boolean) => {
      if (!granted) return;
    });

    const listener = (envelope: RealtimeEnvelope<{ id: string; status: string }>) =>
      handlerRef.current(envelope);

    socket.on("order.status_changed", listener);

    return () => {
      socket.off("order.status_changed", listener);
    };
  }, [socket, orderId]);

  return status;
}

/** Watches a month so a slot taken elsewhere disappears from this calendar. */
export function useAvailabilityUpdates(
  month: string | null,
  onChange: () => void,
): ConnectionState {
  const { socket, status } = useSocket();
  const handlerRef = useRef(onChange);

  useEffect(() => {
    handlerRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!socket || !month) return;

    socket.emit("subscribe:month", month);

    const listener = () => handlerRef.current();
    socket.on("availability.changed", listener);

    return () => {
      socket.off("availability.changed", listener);
    };
  }, [socket, month]);

  return status;
}


