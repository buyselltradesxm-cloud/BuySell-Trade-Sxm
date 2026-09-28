import { applyTransaction, db, products, userId } from "../_shared/apple.ts";

const origins = new Set(["https://buyselltradesxm.com", "https://www.buyselltradesxm.com", "http://localhost:5173", "http://127.0.0.1:5173"]);
Deno.serve(async req => {
  const origin = req.headers.get("origin") || "";
  const headers = { "Content-Type": "application/json", "Cache-Control": "no-store", "Vary": "Origin",
    "Access-Control-Allow-Origin": origins.has(origin) ? origin : "https://buyselltradesxm.com",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  if (origin && !origins.has(origin)) return reply({ error: "Forbidden" }, 403);
  try {
    const owner = await userId(req);
    if (!owner) return reply({ error: "Please sign in first." }, 401);
    if (!(await db("rpc/consume_apple_rate_limit", "POST", { p_user: owner }))) {
      return reply({ error: "Please try again later." }, 429);
    }
    const raw = await req.text();
    if (raw.length > 30000) return reply({ error: "Payload too large" }, 413);
    const body = JSON.parse(raw);
    if (body.action === "prepare") {
      const product = products[String(body.productId)];
      if (!product) return reply({ error: "Unknown product" }, 400);
      let listingId = null;
      if (product.days) {
        if (!/^\d+$/.test(String(body.listingId))) return reply({ error: "Choose a listing first." }, 400);
        const [listing] = await db(`listings?id=eq.${encodeURIComponent(body.listingId)}&seller_id=eq.${owner}&select=id,status`);
        if (!listing || listing.status !== "active") return reply({ error: "Choose one of your active listings." }, 400);
        listingId = listing.id;
      }
      const [intent] = await db("apple_purchase_intents", "POST", { user_id: owner, product_id: body.productId, listing_id: listingId });
      return reply({ appAccountToken: intent.token });
    }
    if (body.action === "verify" && typeof body.signedTransaction === "string") {
      return reply(await applyTransaction(body.signedTransaction, owner));
    }
    return reply({ error: "Invalid request" }, 400);
  } catch (error) {
    // Never log signed transactions, bearer tokens, or user details.
    const ownership = error instanceof Error && error.message.startsWith("Sign in to the marketplace");
    return reply({ error: ownership ? error.message : "Unable to verify the purchase. Please use Restore Purchases to retry." }, ownership ? 403 : 503);
  }
});
