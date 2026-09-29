import { driverChannel, MANAGERS_CHANNEL, pusher } from "@/lib/realtime";
import { getCurrentUser } from "@/lib/session";

// Pusher calls this before joining a private channel. Managers may join the managers'
// channel; a driver may join only their own channel.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!pusher || !user) return new Response("Forbidden", { status: 403 });

  const form = await request.formData();
  const socketId = String(form.get("socket_id") ?? "");
  const channel = String(form.get("channel_name") ?? "");
  const allowed = user.role === "manager" ? channel === MANAGERS_CHANNEL : channel === driverChannel(user.id);
  if (!socketId || !allowed) return new Response("Forbidden", { status: 403 });

  return Response.json(pusher.authorizeChannel(socketId, channel));
}
