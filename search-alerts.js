/* Optional daily search emails. Private alert data stays on the server. */
(function(){
  'use strict';
  const tr=(fr,en)=>state.lang==='fr'?fr:en;
  let owner=null,revision=null,rows=[],busy=false,editId=null,returnFocus=null;
  let createId=null;
  let background=[];
  const el=id=>document.getElementById(id);
  const modal=document.createElement('div');
  modal.id='searchAlertsModal';modal.className='modal';
  document.body.append(modal);
  const current=(id,rev)=>state.user?.id===id&&rev===revision&&authIdentityRevision===rev?.auth&&owner===id;
  const message=text=>{el('searchAlertsStatus').textContent=text;};
  const options=(list,selected)=>list.map(x=>`<option value="${esc(x.id)}" ${x.id===selected?'selected':''}>${esc(x.name)}</option>`).join('');
  function categoryName(id){return CATS.find(c=>c.id===id)?.[state.lang]||id;}
  function subs(category,selected=''){
    el('alertSubcategory').innerHTML=options([{id:'',name:tr('Tous les types','All types')},
      ...(SUBCATS[category]?.groups||[]).flatMap(g=>g.items).map(s=>({id:s.id,name:s[state.lang]}))],selected);
  }
  function list(){
    el('searchAlertsList').innerHTML=rows.length?rows.map(row=>{
      const sub=(SUBCATS[row.category]?.groups||[]).flatMap(g=>g.items).find(s=>s.id===row.subcategory);
      const price=[row.min_price??'',row.max_price??''].join(' – ')+(row.currency==='usd'?' $':' €');
      const summary=[categoryName(row.category),sub?.[state.lang],row.keywords,row.area,
        row.min_price!=null||row.max_price!=null?price:''].filter(Boolean).join(' · ');
      return `<li><div><b>${esc(summary)}</b><p>${row.email_enabled?tr('Email quotidien activé','Daily email on'):tr('Email désactivé','Email off')}</p></div>
        <button type="button" data-alert-edit="${esc(row.id)}">${tr('Modifier','Edit')}</button>
        <button type="button" data-alert-remove="${esc(row.id)}">${tr('Supprimer','Remove')}</button></li>`;
    }).join(''):`<li>${tr('Aucune alerte. Choisissez vos critères ci-dessous.','No alerts yet. Choose your criteria below.')}</li>`;
    el('searchAlertSave').disabled=busy||(!editId&&rows.length>=5);
  }
  function form(row){
    editId=row?.id||null;
    createId=editId?null:crypto.randomUUID();
    el('alertCategory').value=row?.category||state.cat||'all';
    subs(el('alertCategory').value,row?.subcategory||(row? '':state.subcat));
    el('alertKeywords').value=row?.keywords??state.q??'';
    modal.querySelector('[data-alert-clear]').hidden=!el('alertKeywords').value;
    el('alertArea').value=row?.area??state.area??'';
    el('alertCurrency').value=row?.currency||state.cur||'eur';
    el('alertMin').value=row?.min_price??(row?'':el('pmin')?.value||'');
    el('alertMax').value=row?.max_price??(row?'':el('pmax')?.value||'');
    el('alertEmail').checked=!!row?.email_enabled;
    el('searchAlertSave').textContent=editId?tr('Enregistrer les modifications','Save changes'):tr('Enregistrer cette alerte','Save this alert');
    el('searchAlertNew').hidden=!editId;
    list();
  }
  async function load(){
    const id=owner,rev=revision;
    message(tr('Chargement des alertes…','Loading alerts…'));
    try{
      const result=await db.from('saved_search_alerts').select('*').eq('user_id',id).order('created_at').limit(5);
      if(!current(id,rev)) return;
      if(result.error) throw result.error;
      rows=result.data||[];list();message('');
    }catch(_){if(current(id,rev)) message(tr('Impossible de charger les alertes. Fermez puis réessayez.','Could not load alerts. Close and try again.'));}
  }
  async function openSearchAlerts(){
    closeNotifPanel();
    if(!state.user){requireAccount('search-alerts');return;}
    owner=state.user.id;revision={auth:authIdentityRevision};rows=[];busy=false;editId=null;
    returnFocus=document.activeElement?.getClientRects().length?document.activeElement:
      [...document.querySelectorAll('[data-click="toggleNotifPanel"]')].find(node=>node.getClientRects().length);
    const areas=[...new Set([...AREAS.fr,...AREAS.nl])];
    modal.innerHTML=`<section class="dialog search-alert-dialog" role="dialog" aria-modal="true" aria-labelledby="searchAlertsTitle" aria-describedby="searchAlertsHelp">
      <div class="dialog-head"><h2 id="searchAlertsTitle">${tr('Mes alertes de recherche','My search alerts')}</h2><button type="button" class="icon-btn" data-alert-close aria-label="${tr('Fermer','Close')}">×</button></div>
      <div class="dialog-body"><p id="searchAlertsHelp">${tr('Un résumé par email au maximum par jour, uniquement pour les nouvelles annonces qui vous intéressent. Aucun email sans votre accord.','At most one email digest per day, only for new listings that interest you. No email without your permission.')}</p>
      <ul id="searchAlertsList" class="search-alert-list" aria-label="${tr('Alertes enregistrées','Saved alerts')}"></ul>
      <form id="searchAlertForm" novalidate><h3>${tr('Choisir une recherche','Choose a search')}</h3>
      <div class="search-alert-fields">
        <label>${tr('Catégorie','Category')}<select id="alertCategory">${options(CATS.map(c=>({id:c.id,name:c[state.lang]})),state.cat)}</select></label>
        <label>${tr('Type','Type')}<select id="alertSubcategory"></select></label>
        <label>${tr('Quartier','Area')}<select id="alertArea">${options([{id:'',name:tr('Toute l’île','Whole island')},...areas.map(a=>({id:a,name:a}))],state.area)}</select></label>
        <label>${tr('Mots-clés (facultatif)','Keywords (optional)')}<input id="alertKeywords" type="text" maxlength="120" autocomplete="off"><button class="search-alert-clear" type="button" data-alert-clear hidden>${tr('Effacer les mots-clés','Clear keywords')}</button></label>
        <label>${tr('Budget minimum (facultatif)','Minimum budget (optional)')}<input id="alertMin" type="text" inputmode="decimal" maxlength="14" aria-describedby="searchAlertsStatus"></label>
        <label>${tr('Budget maximum (facultatif)','Maximum budget (optional)')}<input id="alertMax" type="text" inputmode="decimal" maxlength="14" aria-describedby="searchAlertsStatus"></label>
        <label>${tr('Devise','Currency')}<select id="alertCurrency"><option value="eur">EUR €</option><option value="usd">USD $</option></select></label>
      </div>
      <label class="search-alert-consent"><input type="checkbox" id="alertEmail"><span>${tr('Je souhaite recevoir les nouvelles annonces de cette recherche par email.','Email me new listings that match this search.')}</span></label>
      <p class="search-alert-note">${tr('Les critères ci-dessus définissent votre alerte. Jusqu’à 5 alertes et 20 annonces par résumé. Les envois peuvent être reportés. Désinscription à tout moment dans chaque email.','The criteria above define your alert. Up to 5 alerts and 20 listings per digest. Emails may be delayed. Unsubscribe anytime from any email.')}</p>
      <p id="searchAlertsStatus" role="status" aria-live="polite"></p>
      <div class="search-alert-actions"><button type="submit" id="searchAlertSave"></button><button type="button" id="searchAlertNew" hidden>${tr('Nouvelle alerte','New alert')}</button></div></form></div></section>`;
    form();openModal(modal.id);
    if(!background.length)background=[...document.body.children].filter(node=>node!==modal&&node.tagName!=='SCRIPT').map(node=>({node,inert:node.inert}));
    background.forEach(({node})=>node.inert=true);
    el('searchAlertsTitle').tabIndex=-1;el('searchAlertsTitle').focus();
    el('alertCategory').addEventListener('change',()=>subs(el('alertCategory').value));
    const clear=()=>{modal.querySelector('[data-alert-clear]').hidden=!el('alertKeywords').value;};
    clear();el('alertKeywords').addEventListener('input',clear);
    el('searchAlertNew').addEventListener('click',()=>{form();clear();el('alertCategory').focus();});
    el('searchAlertForm').addEventListener('submit',save);
    if(!window.SB?.enabled()||!window.db){message(tr('Connectez-vous au service pour enregistrer vos alertes.','Connect to the service to save your alerts.'));el('searchAlertSave').disabled=true;return;}
    await load();
  }
  function setBusy(on){busy=on;el('searchAlertForm').setAttribute('aria-busy',String(on));
    modal.querySelectorAll('input,select,button:not([data-alert-close])').forEach(button=>button.disabled=on);
    if(!on) list();
  }
  async function save(event){
    event.preventDefault();if(busy)return;
    const id=owner,rev=revision;if(!current(id,rev)){close();return;}
    const parse=id=>{const s=el(id).value.trim().replace(',','.');return s===''?null:/^\d+(\.\d{1,2})?$/.test(s)?Number(s):NaN;};
    const min=parse('alertMin'),max=parse('alertMax');
    if([min,max].some(n=>n!==null&&(!Number.isFinite(n)||n>1e9))||(min!==null&&max!==null&&min>max)){
      message(tr('Vérifiez les budgets : nombres positifs, minimum inférieur au maximum.','Check budgets: positive numbers, minimum no greater than maximum.'));
      el('alertMax').setAttribute('aria-invalid','true');el('alertMax').focus();return;
    }
    el('alertMax').removeAttribute('aria-invalid');
    const criteria={owner_id:id,request_id:createId,category:el('alertCategory').value,subcategory:el('alertSubcategory').value,area:el('alertArea').value,
      keywords:el('alertKeywords').value.trim(),currency:el('alertCurrency').value,min_price:min,max_price:max};
    const consent=el('alertEmail').checked;
    setBusy(true);message(tr('Enregistrement…','Saving…'));
    try{
      const result=await db.rpc('save_search_alert',{criteria,consent,locale:state.lang,alert_id:editId});
      if(!current(id,rev))return;
      if(result.error||!result.data?.id)throw result.error||new Error();
      const index=rows.findIndex(r=>r.id===result.data.id);
      if(index>=0)rows[index]=result.data;else rows.push(result.data);
      form(result.data);message(consent?tr('Alerte enregistrée. Vous recevrez les nouveautés par email.','Alert saved. New matches will be emailed to you.'):
        tr('Recherche enregistrée. Aucun email ne sera envoyé pour cette recherche.','Search saved. No emails will be sent for this search.'));
    }catch(_){if(current(id,rev))message(tr('Enregistrement non confirmé. Fermez puis rouvrez les alertes avant de réessayer.','Save not confirmed. Close and reopen alerts before trying again.'));}
    finally{if(current(id,rev))setBusy(false);}
  }
  function release(){revision=null;rows=[];owner=null;modal.innerHTML='';background.forEach(({node,inert})=>node.inert=inert);background=[];returnFocus?.focus?.();}
  function close(){closeModal(modal.id);release();}
  new MutationObserver(()=>{if(owner&&!modal.classList.contains('open'))release();}).observe(modal,{attributes:true,attributeFilter:['class']});
  modal.addEventListener('click',async event=>{
    if(event.target===modal||event.target.closest('[data-alert-close]')){close();return;}
    if(event.target.closest('[data-alert-clear]')){el('alertKeywords').value='';event.target.hidden=true;el('alertKeywords').focus();return;}
    const edit=event.target.closest('[data-alert-edit]'),remove=event.target.closest('[data-alert-remove]');
    if(edit&&!busy){form(rows.find(r=>r.id===edit.dataset.alertEdit));el('alertCategory').focus();}
    if(remove&&!busy){
      const id=owner,rev=revision;if(!current(id,rev)){close();return;}
      setBusy(true);message(tr('Suppression…','Removing…'));
      try{const result=await db.rpc('delete_search_alert',{alert_id:remove.dataset.alertRemove,owner_id:id});
        if(!current(id,rev))return;if(result.error||result.data!==true)throw new Error();
        rows=rows.filter(r=>r.id!==remove.dataset.alertRemove);form();message(tr('Alerte supprimée.','Alert removed.'));
      }catch(_){if(current(id,rev))message(tr('Suppression non confirmée. Fermez puis rouvrez les alertes.','Removal not confirmed. Close and reopen alerts.'));}
      finally{if(current(id,rev))setBusy(false);}
    }
  });
  modal.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.stopPropagation();close();return;}
    if(event.key==='Tab'){
      const controls=[...modal.querySelectorAll('button,input,select')].filter(x=>!x.disabled&&!x.hidden&&x.getClientRects().length);
      if(event.shiftKey&&(document.activeElement===controls[0]||document.activeElement===el('searchAlertsTitle'))){event.preventDefault();controls.at(-1)?.focus();}
      else if(!event.shiftKey&&document.activeElement===controls.at(-1)){event.preventDefault();controls[0]?.focus();}
    }
  });
  // Account cleanup also closes this private surface, including late-response invalidation.
  window.SearchAlerts={open:openSearchAlerts,clear:()=>{if(owner)close();}};
  window.openSearchAlerts=openSearchAlerts;
  if(new URLSearchParams(location.search).get('alerts')==='1'){
    const url=new URL(location.href);url.searchParams.delete('alerts');history.replaceState(null,'',url.pathname+url.search+url.hash);
    setTimeout(openSearchAlerts,0);
  }
})();
