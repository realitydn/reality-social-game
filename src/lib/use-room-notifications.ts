"use client";

import { useEffect, useRef, useState } from "react";

// Subscribes to /api/sessions/[id]/ws and calls onPing on every message.
// Auto-reconnects with exponential backoff. Returns { connected } so the UI can
// show a Live/Reconnecting badge. Cheap fallback: if the WebSocket can't
// connect, the existing polling intervals still keep the UI fresh — realtime is
// additive, not load-bearing.
export function useRoomNotifications(sessionId: string, onPing: () => void): { connected: boolean } {
  const onPingRef = useRef(onPing);
  onPingRef.current = onPing;
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    let ws: WebSocket | null = null;
    let backoffMs = 1000;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (cancelled) return;
      const proto = window.location.protocol === "https:" ? "wss" : "ws";
      const url = `${proto}://${window.location.host}/api/sessions/${sessionId}/ws`;
      try {
        ws = new WebSocket(url);
      } catch {
        scheduleReconnect();
        return;
      }
      ws.addEventListener("open", () => {
        backoffMs = 1000;
        setConnected(true);
      });
      ws.addEventListener("message", () => {
        onPingRef.current();
      });
      ws.addEventListener("close", () => {
        setConnected(false);
        scheduleReconnect();
      });
      ws.addEventListener("error", () => {
        setConnected(false);
        try {
          ws?.close();
        } catch {
          /* swallow */
        }
      });
    };

    const scheduleReconnect = () => {
      if (cancelled) return;
      reconnectTimer = setTimeout(connect, backoffMs);
      backoffMs = Math.min(backoffMs * 2, 30000);
    };

    connect();
    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      try {
        ws?.close();
      } catch {
        /* swallow */
      }
    };
  }, [sessionId]);

  return { connected };
}
