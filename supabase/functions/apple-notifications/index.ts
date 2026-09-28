import { applyTransaction, verifyNotification } from "../_shared/apple.ts";

Deno.serve(async req => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  try {
    const raw = await req.text();
    if (raw.length > 60000) return new Response("Payload too large", { status: 413 });
    const { signedPayload } = JSON.parse(raw);
    if (typeof signedPayload !== "string") return new Response("Invalid notification", { status: 400 });
    const notification = await verifyNotification(signedPayload);
    if (notification.data?.signedTransactionInfo) await applyTransaction(notification.data.signedTransactionInfo);
    // Apple retries failures; the SQL transaction makes delivery replay-safe.
    return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
  } catch (_) { return new Response("Notification could not be processed", { status: 503 }); }
});
