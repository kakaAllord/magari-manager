import { query } from "@/lib/db";
import { requireUser } from "@/lib/session";

// A payment's receipt photo. Staff see every receipt; a driver sees only their own.
export async function GET(_request: Request, ctx: RouteContext<"/receipts/[id]">) {
  const user = await requireUser();
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return new Response("Haipo", { status: 404 });

  const rows = await query<{ content_type: string; data: Buffer }>(
    `SELECT rc.content_type, rc.data FROM receipts rc JOIN money_requests r ON r.id = rc.request_id
      WHERE rc.request_id = $1 AND ($2::int IS NULL OR r.requester_id = $2)`,
    [id, user.role === "driver" ? user.id : null],
  );
  const receipt = rows[0];
  if (!receipt) return new Response("Haipo", { status: 404 });

  return new Response(new Uint8Array(receipt.data), {
    headers: {
      "Content-Type": receipt.content_type,
      "Content-Disposition": `inline; filename="risiti-${id}"`,
      "Cache-Control": "private, max-age=3600",
      // Shown as a bare image: nothing in it may run.
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
