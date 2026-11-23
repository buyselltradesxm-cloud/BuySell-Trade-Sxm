import {processDigests} from '../_shared/search-digest.ts';

const env=(name:string)=>Deno.env.get(name)||'';
function serviceKey() {
  if(env('SUPABASE_SERVICE_ROLE_KEY')) return env('SUPABASE_SERVICE_ROLE_KEY');
  try { const keys=JSON.parse(env('SUPABASE_SECRET_KEYS')||'{}');
    return typeof keys==='string'?keys:Object.values(keys).find(v=>typeof v==='string'&&v.length>20) as string||'';
  } catch (_) {return '';}
}
const url=env('SUPABASE_URL'), key=serviceKey();
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
async function rpc(name:string,body:Record<string,unknown>) {
  const r=await fetch(url+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:key,authorization:'Bearer '+key,'content-type':'application/json'},body:JSON.stringify(body)});
  if(!r.ok) throw new Error('Digest database operation failed: '+name);
  return r.json();
}
Deno.serve(async request=>{
  if(request.method!=='POST') return json({ok:false},405);
  const secret=env('EMAIL_QUEUE_SECRET');
  if(!secret||!key||!url||!env('RESEND_API_KEY')) return json({ok:false,error:'Digest service is not configured'},503);
  const hash=async(s:string)=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
  const [expected,received]=await Promise.all([hash(secret),hash(request.headers.get('x-email-worker-secret')||'')]);
  let difference=0;for(let i=0;i<expected.length;i++) difference|=expected[i]^received[i];
  if(difference) return json({ok:false},401);
  try {
    const result=await processDigests({rpc,site:env('SITE_URL')||'https://buyselltradesxm.com',api:url,
      pause:()=>new Promise(resolve=>setTimeout(resolve,650)),
      send:async(job,email)=>{
        const response=await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(12000),headers:{
          authorization:'Bearer '+env('RESEND_API_KEY'),'content-type':'application/json','idempotency-key':'search_digest_'+job.id
        },body:JSON.stringify({from:env('EMAIL_FROM')||'Buy Sell Trade SXM <noreply@buyselltradesxm.com>',to:[job.recipient_email],...email})});
        const data=await response.json().catch(()=>({}));
        return response.ok&&data.id?{id:data.id}:{error:['daily_quota_exceeded','monthly_quota_exceeded','rate_limit_exceeded'].includes(data.name)?data.name:'Provider rejected or did not confirm delivery'};
      }});
    return json({ok:true,...result});
  } catch (_) {return json({ok:false,error:'Digest processing stopped; inspect reserved jobs before retrying'},500);}
});
