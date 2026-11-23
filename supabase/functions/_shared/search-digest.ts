export type DigestJob = { id: string; recipient_email: string; payload: {
  language: string; unsubscribe_token: string; items: Array<Record<string, unknown>>;
}};
const escape = (v: unknown) => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function buildDigestEmail(job: DigestJob, site: string, api: string) {
  const fr=job.payload.language==='fr';
  const unsubscribe=new URL(api+'/functions/v1/search-digest-unsubscribe');
  unsubscribe.searchParams.set('token',job.payload.unsubscribe_token);
  const unsubscribePage=new URL('/search-unsubscribe.html',site);
  unsubscribePage.searchParams.set('token',job.payload.unsubscribe_token);
  const settings=new URL('/?alerts=1',site).href;
  const subject=fr?'De nouvelles annonces pour vos recherches':'New listings for your saved searches';
  const intro=fr?'Ces nouvelles annonces correspondent à vos alertes. Touchez une annonce pour voir sa disponibilité actuelle.':
    'These new listings match your alerts. Open a listing to check its current availability.';
  const items=job.payload.items.slice(0,20).map(item=>{
    const title=String((fr?item.title_fr:item.title_en)||item.title||'Listing');
    const link=new URL('/',site);link.searchParams.set('listing',String(item.id));
    const price=[['EUR',item.price_eur],['USD',item.price_usd]].flatMap(([currency,amount])=>
      typeof amount==='number'&&Number.isFinite(amount)&&amount>0?[new Intl.NumberFormat(fr?'fr-FR':'en-US',{style:'currency',currency:String(currency)}).format(amount)]:[]).join(' / ');
    return {title,link:link.href,detail:[item.area,price].filter(Boolean).join(' · ')};
  });
  const stop=fr?'Arrêter les emails de recherche':'Unsubscribe from search emails';
  const address='Association Korek Digital · 17 Résidence des Gémeaux, 94260 Fresnes, France';
  const html=`<!doctype html><html lang="${fr?'fr':'en'}"><body style="font-family:Arial,sans-serif;color:#132a2e;background:#fbf7ef;padding:20px">
  <main style="max-width:600px;margin:auto;background:white;border:1px solid #d4dfdc;border-radius:16px;padding:24px">
  <p style="color:#0b6e7f;font-weight:bold">Buy Sell Trade SXM</p><h1 style="font-size:24px">${subject}</h1><p>${intro}</p>
  ${items.map(i=>`<p style="border-top:1px solid #d4dfdc;padding-top:16px"><a style="color:#0b6e7f;font-weight:bold" href="${escape(i.link)}">${escape(i.title)}</a><br>${escape(i.detail)}</p>`).join('')}
  <p>${fr?'Jusqu’à 20 annonces par résumé ; les suivantes restent pour un prochain envoi.':'Up to 20 listings per digest; additional matches are kept for a later email.'}</p>
  <p><a href="${escape(settings)}">${fr?'Gérer mes alertes':'Manage my alerts'}</a></p>
  <p style="font-size:13px">${fr?'Vous avez choisi de recevoir ces résumés. Au maximum un par jour, uniquement s’il y a des nouveautés.':'You opted into these digests. At most one per day, only when there are new matches.'}</p>
  <p><a href="${escape(unsubscribePage.href)}">${stop}</a></p><p style="font-size:12px">${address}</p></main></body></html>`;
  const text=[subject,intro,...items.map(i=>`${i.title}\n${i.detail}\n${i.link}`),`${stop}: ${unsubscribePage.href}`,address].join('\n\n');
  return {subject,html,text,headers:{'List-Unsubscribe':`<${unsubscribe.href}>`,'List-Unsubscribe-Post':'List-Unsubscribe=One-Click'}};
}

type Dependencies = {
  rpc: (name:string,body:Record<string,unknown>)=>Promise<any>;
  send: (job:DigestJob,email:ReturnType<typeof buildDigestEmail>)=>Promise<{id?:string;error?:string}>;
  pause: ()=>Promise<void>; site:string; api:string;
};
export async function processDigests(d: Dependencies) {
  await d.rpc('enqueue_search_digests',{});
  const results=[];
  for(let count=0;count<5;count++) {
    // Claim immediately before each send: refresh availability, consent and address.
    const jobs:DigestJob[]=await d.rpc('claim_search_digests',{batch_size:1});
    const job=jobs?.[0];if(!job)break;
    let outcome='uncertain';let id:string|undefined;
    try {
      const sent=await d.send(job,buildDigestEmail(job,d.site,d.api));
      id=sent.id;
      outcome=id?'sent':sent.error||'uncertain';
    } catch (_) { outcome='Delivery unconfirmed; inspect provider before retrying'; }
    // If this write fails, leave the reserved job alone. Never dispatch it again automatically.
    await d.rpc('finish_search_digest',{job_id:job.id,outcome,provider_id:id||null});
    results.push({id:job.id,outcome});
    if(['daily_quota_exceeded','monthly_quota_exceeded','rate_limit_exceeded'].includes(outcome))break;
    await d.pause();
  }
  return {claimed:results.length,results};
}
