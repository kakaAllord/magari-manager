"use client";

import { useRouter } from "next/navigation";
import PusherClient from "pusher-js";
import { useEffect } from "react";

const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
const FALLBACK_SECONDS = 10;

let client: PusherClient | null = null;
function getClient() {
  if (!key || !cluster) return null;
  client ??= new PusherClient(key, {
    cluster,
    channelAuthorization: { endpoint: "/api/realtime/auth", transport: "ajax" },
  });
  return client;
}

// Refreshes the page's server data the moment a request is created, approved or
// rejected. Without Pusher keys, or while the socket is down, it polls instead.
export function LiveUpdates({ channel }: { channel: string }) {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => router.refresh();
    let timer: ReturnType<typeof setInterval> | undefined;
    const startPolling = () => (timer ??= setInterval(refresh, FALLBACK_SECONDS * 1000));
    const stopPolling = () => {
      clearInterval(timer);
      timer = undefined;
    };

    const pusher = getClient();
    if (!pusher) {
      startPolling();
      return stopPolling;
    }

    const sub = pusher.subscribe(channel);
    sub.bind("requests-changed", refresh);
    sub.bind("pusher:subscription_error", startPolling);
    // Poll whenever the socket isn't connected (connecting, refused, offline...).
    const onState = ({ current }: { current: string }) => {
      if (current === "connected") {
        const wasPolling = timer !== undefined;
        stopPolling();
        if (wasPolling) refresh(); // catch up on anything missed while offline
      } else {
        startPolling();
      }
    };
    if (pusher.connection.state !== "connected") startPolling();
    pusher.connection.bind("state_change", onState);

    return () => {
      stopPolling();
      pusher.connection.unbind("state_change", onState);
      sub.unbind("requests-changed", refresh);
      sub.unbind("pusher:subscription_error", startPolling);
      pusher.unsubscribe(channel);
    };
  }, [channel, router]);

  return null;
}
