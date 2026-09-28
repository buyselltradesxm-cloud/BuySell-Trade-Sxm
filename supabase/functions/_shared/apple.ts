import { Environment, SignedDataVerifier } from "npm:@apple/app-store-server-library@3.1.0";
import { Buffer } from "node:buffer";
import { appleRoots } from "./apple-roots.ts";

export const bundle = "com.korekdigitalmarketing.buyselltradesxm";
export const products: Record<string, { plan?: string; days?: number }> = {};
for (const tier of ["starter", "business", "premium", "elite", "unlimited"]) {
  products[`${bundle}.pro_${tier}_monthly`] = { plan: `pro-${tier}` };
}
for (const days of [3, 7, 14]) products[`${bundle}.boost_${days}_days`] = { days };
const verifiers = [Environment.PRODUCTION, Environment.SANDBOX].map(env =>
  new SignedDataVerifier(appleRoots.map(x => Buffer.from(x, "base64")), true, env, bundle, 6809964445));

export async function verifyTransaction(signed: string) {
  for (const verifier of verifiers) {
    try { return await verifier.verifyAndDecodeTransaction(signed); } catch (_) { /* try other Apple environment */ }
  }
  throw new Error("Invalid Apple transaction signature");
}
export async function verifyNotification(signed: string) {
  for (const verifier of verifiers) {
    try { return await verifier.verifyAndDecodeNotification(signed); } catch (_) { /* try other Apple environment */ }
  }
  throw new Error("Invalid Apple notification signature");
}

export const base = Deno.env.get("SUPABASE_URL") || "";
function serviceKey(): string {
  const direct = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (direct) return direct;
  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    if (typeof keys === "string") return keys;
    for (const value of Object.values(keys)) if (typeof value === "string" && value.length > 20) return value;
  } catch (_) { /* fail closed below */ }
  throw new Error("Server credentials are unavailable");
}
export async function db(path: string, method = "GET", body?: unknown) {
  const key = serviceKey();
  const response = await fetch(`${base}/rest/v1/${path}`, {
    method, headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (!response.ok) throw new Error("Purchase storage is unavailable");
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}
export async function userId(req: Request): Promise<string | null> {
  const authorization = req.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const response = await fetch(`${base}/auth/v1/user`, { headers: { apikey: serviceKey(), Authorization: authorization } });
  return response.ok ? (await response.json()).id : null;
}
export async function applyTransaction(signed: string, owner?: string) {
  const t = await verifyTransaction(signed);
  const product = products[t.productId || ""];
  if (!product || !t.transactionId || !t.originalTransactionId || !t.appAccountToken || !t.purchaseDate || !t.signedDate || t.bundleId !== bundle) {
    throw new Error("Unrecognized Apple purchase");
  }
  if (product.plan && (!t.expiresDate || t.type !== "Auto-Renewable Subscription")) throw new Error("Invalid subscription");
  if (product.days && t.type !== "Consumable") throw new Error("Invalid boost purchase");
  const [intent] = await db(`apple_purchase_intents?token=eq.${encodeURIComponent(t.appAccountToken)}&select=user_id,product_id`);
  if (!intent || (owner && intent.user_id !== owner)) throw new Error("Sign in to the marketplace account used for this purchase to restore it.");
  if (!intent.user_id) return { transactionId: t.transactionId };
  if (product.days && intent.product_id !== t.productId) throw new Error("Purchase product mismatch");
  await db("rpc/apply_apple_transaction", "POST", { p: {
    transaction_id: t.transactionId, original_transaction_id: t.originalTransactionId,
    token: t.appAccountToken, product_id: t.productId, plan: product.plan || null, boost_days: product.days || null,
    purchase_date: new Date(t.purchaseDate).toISOString(), expires_date: t.expiresDate ? new Date(t.expiresDate).toISOString() : null,
    revoked: !!t.revocationDate || !!t.isUpgraded, signed_date: new Date(t.signedDate).toISOString(), environment: t.environment
  } });
  return { transactionId: t.transactionId };
}
