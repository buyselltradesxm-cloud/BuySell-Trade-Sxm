// Authenticated cancellation of the caller's PayPal subscription.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const CLIENT_ID = Deno.env.get("PAYPAL_CLIENT_ID") || "";
const CLIENT_SECRET = Deno.env.get("PAYPAL_CLIENT_SECRET") || "";
const API = (Deno.env.get("PAYPAL_API_BASE") || "https://api-m.paypal.com").replace(/\/$/, "");
function serviceKey() {
  const direct = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (direct) return direct;
  try { const value=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||""); if(typeof value==="string") return value; if(value&&typeof value==="object") for(const item of Object.values(value)) if(typeof item==="string"&&item.length>20) return item; } catch (_) { /* no secret */ }
  return "";
}
const SERVICE_KEY=serviceKey();
const allowedOrigin=(origin:string)=>origin==="https://buyselltradesxm.com"||origin==="https://www.buyselltradesxm.com"||/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
function cors(req:Request):Record<string,string>{const origin=req.headers.get("origin")||"";const h:Record<string,string>={"Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Cache-Control":"no-store","Vary":"Origin"};if(allowedOrigin(origin))h["Access-Control-Allow-Origin"]=origin;return h;}
function json(body:unknown,status:number,headers:Record<string,string>){return new Response(JSON.stringify(body),{status,headers:{...headers,"Content-Type":"application/json"}});}
Deno.serve(async(req)=>{
  const headers=cors(req);if(req.method==="OPTIONS")return new Response(null,{headers});if(req.method!=="POST")return json({error:"method not allowed"},405,headers);if(!allowedOrigin(req.headers.get("origin")||""))return json({error:"forbidden"},403,headers);
  if(!SUPABASE_URL||!SERVICE_KEY||!CLIENT_ID||!CLIENT_SECRET)return json({error:"PayPal unavailable"},503,headers);
  const bearer=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");const auth=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:{apikey:SERVICE_KEY,Authorization:`Bearer ${bearer}`}});const user=auth.ok?await auth.json():null;if(!user?.id)return json({error:"not authenticated"},401,headers);
  const profileRes=await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=paypal_subscription_id,subscription_provider,subscription_current_period_end,account_plan,subscription_cancel_at_period_end`,{headers:{apikey:SERVICE_KEY,Authorization:`Bearer ${SERVICE_KEY}`}});if(!profileRes.ok)return json({error:"profile unavailable"},503,headers);const [profile]=await profileRes.json();const sub=String(profile?.paypal_subscription_id||"");if(profile?.subscription_provider!=="paypal"||!sub)return json({error:"no PayPal subscription"},404,headers);if(profile.subscription_cancel_at_period_end)return json({cancelled:true,periodEnd:profile.subscription_current_period_end||null},200,headers);
  const tokenRes=await fetch(`${API}/v1/oauth2/token`,{method:"POST",headers:{Authorization:`Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`,"Content-Type":"application/x-www-form-urlencoded"},body:"grant_type=client_credentials"});if(!tokenRes.ok)return json({error:"PayPal unavailable"},502,headers);const token=(await tokenRes.json()).access_token;
  const cancelRes=await fetch(`${API}/v1/billing/subscriptions/${encodeURIComponent(sub)}/cancel`,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({reason:"Cancelled by subscriber"})});if(!cancelRes.ok&&cancelRes.status!==204)return json({error:"cancellation failed"},502,headers);
  const end=profile.subscription_current_period_end;const retain=end&&new Date(end).getTime()>Date.now();const patch={account_type:retain?"business":"personal",account_plan:retain?profile.account_plan:"personal-free",subscription_status:retain?"active":"inactive",subscription_cancel_at_period_end:true,paypal_checkout_started_at:null};
  const saved=await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}`,{method:"PATCH",headers:{apikey:SERVICE_KEY,Authorization:`Bearer ${SERVICE_KEY}`,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify(patch)});if(!saved.ok)return json({error:"profile update failed"},503,headers);
  return json({cancelled:true,periodEnd:end||null},200,headers);
});
