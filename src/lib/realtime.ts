import "server-only";
import Pusher from "pusher";

// Channels carry only "something changed" signals; pages re-fetch their own data.
export const MANAGERS_CHANNEL = "private-managers";
export const driverChannel = (driverId: number) => `private-driver-${driverId}`;
export const REQUESTS_CHANGED = "requests-changed";

const { PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER } = process.env;

export const pusher =
  PUSHER_APP_ID && PUSHER_KEY && PUSHER_SECRET && PUSHER_CLUSTER
    ? new Pusher({ appId: PUSHER_APP_ID, key: PUSHER_KEY, secret: PUSHER_SECRET, cluster: PUSHER_CLUSTER, useTLS: true })
    : null;

// Never fails the caller: a missed signal only delays the update to the fallback refresh.
export async function notify(channels: string[], event = REQUESTS_CHANGED) {
  if (!pusher) return;
  try {
    await pusher.trigger(channels, event, {});
  } catch (err) {
    console.error("realtime notify failed", err);
  }
}
