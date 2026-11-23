/* A small public projection; privileged data stays behind admin-only RPCs. */
(function(){
 'use strict';
 let settings=null,sequence=0;
 function render(){
  let notice=document.getElementById('siteConsoleNotice');
  if(!notice){notice=document.createElement('aside');notice.id='siteConsoleNotice';notice.className='site-console-notice';notice.setAttribute('aria-label','Information');document.querySelector('.topbar')?.insertAdjacentElement('afterend',notice);}
  if(!notice)return;
  const fr=document.documentElement.lang==='fr';
  const message=settings?.notice_enabled?(fr?settings.notice_fr:settings.notice_en):'';
  const pause=settings?.posting_paused?(fr?'La publication de nouvelles annonces est temporairement suspendue. Les annonces existantes et les messages restent accessibles.':'New listings are temporarily paused. Existing listings and messages remain available.'):'';
  notice.replaceChildren();
  for(const text of [message,pause])if(text){const p=document.createElement('p');p.textContent=text;notice.appendChild(p);}
  notice.hidden=!message&&!pause;
 }
 async function load(){
  if(!window.db)return;
  const current=++sequence;
  try{const response=await db.rpc('public_console_settings');if(current!==sequence||response.error)return;settings=response.data;render();}catch(e){/* Keep the last known notice; server enforces the publication gate. */}
 }
 window.SiteConsole={load,render,paused:()=>!!settings?.posting_paused};
 const start=()=>{load();new MutationObserver(render).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});
})();
