// GET is confirmation only: email scanners cannot silently change preferences.
// POST also accepts RFC 8058 one-click requests. Tokens never enter analytics.
const responseHeaders={'content-type':'text/html; charset=utf-8','cache-control':'no-store','referrer-policy':'no-referrer',
  'content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"};
Deno.serve(async request=>{
  if(!['GET','POST'].includes(request.method)) return new Response('',{status:405});
  const token=new URL(request.url).searchParams.get('token')||'';
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) return new Response('Invalid link / Lien invalide',{status:400,headers:responseHeaders});
  if(request.method==='GET'){
    const page=new URL('/search-unsubscribe.html',Deno.env.get('SITE_URL')||'https://buyselltradesxm.com');page.searchParams.set('token',token);
    return new Response(null,{status:303,headers:{...responseHeaders,location:page.href}});
  }
  let ok=false;
  if(request.method==='POST') {
    const r=await fetch(Deno.env.get('SUPABASE_URL')+'/rest/v1/rpc/unsubscribe_search_digests',{
      method:'POST',headers:{apikey:Deno.env.get('SUPABASE_ANON_KEY')||'','content-type':'application/json'},body:JSON.stringify({token})
    }).catch(()=>null);
    ok=!!r?.ok&&(await r.json().catch(()=>false))===true;
  }
  const message=request.method==='GET'?'Stop search emails? / Arrêter les emails de recherche ?':ok?
    'Search emails stopped. Your private message notifications are unchanged. / Emails de recherche désactivés. Les notifications de messages privés restent inchangées.':
    'Could not unsubscribe. Please try again. / Désinscription impossible. Réessayez.';
  return new Response(`<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Buy Sell Trade SXM</title>
    <body style="font:18px system-ui;padding:24px;max-width:600px;margin:auto;color:#132a2e"><h1>Buy Sell Trade SXM</h1><p>${message}</p>
    ${ok?'':`<form method="post"><button style="font:inherit;padding:12px;cursor:pointer">Stop emails / Arrêter les emails</button></form>`}
    <p><a href="https://buyselltradesxm.com/">Return to marketplace / Retour à la marketplace</a></p></body></html>`,
    {status:request.method==='POST'&&!ok?503:200,headers:responseHeaders});
});
