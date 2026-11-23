/* Owner workspace. Existing listing/account actions remain canonical. */
(function(){
 'use strict';
 let snapshot=null,owner=null,error='',loading=false,sequence=0,dirty=false;
 const words=(fr,en)=>state.lang==='fr'?fr:en;
 const sections=[
  ['overview','Vue d’ensemble','Overview','grid'],['listings','Annonces','Listings','camera'],
  ['moderation','À valider','To review','bell'],['reports','Signalements','Reports','bell'],
  ['users','Utilisateurs','Users','user'],['ads','Publicités','Advertising','grid'],
  ['boosts','Boosts','Boosts','plus'],['categories','Catégories','Categories','grid'],
  ['settings','Réglages du site','Site settings','sliders'],['system','État du système','System status','sliders'],
  ['activity','Historique','Activity','mail'],['stats','Statistiques','Statistics','grid'],
  ['guide','Aide & secours','Help & recovery','heart']
 ];
 const descriptions={
  overview:['Les priorités de ton application, au même endroit.','Your app priorities, all in one place.'],
  listings:['Rechercher, modifier et gérer les annonces.','Search, edit and manage listings.'],
  moderation:['Vérifier les annonces avant leur publication.','Review listings before publication.'],
  reports:['Examiner les problèmes signalés par les utilisateurs.','Review issues reported by users.'],
  users:['Gérer les comptes, leurs droits et les accès Pro offerts.','Manage accounts, roles and complimentary Pro access.'],
  ads:['Modifier les campagnes publicitaires et leurs emplacements.','Edit advertising campaigns and placements.'],
  categories:['Afficher ou masquer les catégories de la place de marché.','Show or hide marketplace categories.'],
  boosts:['Suivre les annonces mises en avant.','Review promoted listings.'],
  settings:['Modifier les messages publics et les nouvelles publications.','Control public messages and new listings.'],
  system:['Voir les contrôles serveur et accéder aux outils de secours.','Review server checks and open recovery tools.'],
  activity:['Les 50 dernières actions enregistrées dans le journal serveur.','The latest 50 actions recorded in the server log.'],
  stats:['Consulter les visites et les erreurs remontées par l’application.','Review visits and errors reported by the app.'],
  guide:['Des étapes simples pour gérer l’application en confiance.','Simple steps to manage your app confidently.']
 };
 const icon=name=>`<img src="icons/market/${name}.svg" alt="" aria-hidden="true">`;
 const nav=(id,label,cls='')=>`<button type="button" class="${cls}" data-click="renderAdmin" data-click-args='${dataArgs([id])}'>${label}</button>`;
 const date=value=>value?new Date(value).toLocaleString(state.lang==='fr'?'fr-FR':'en-GB',{dateStyle:'medium',timeStyle:'short'}):'—';
 function clear(){sequence++;snapshot=null;owner=null;error='';loading=false;dirty=false;document.getElementById('adminBody')?.replaceChildren();}
 async function load(){
  if(!canUseSupabaseAdmin()||!window.db){snapshot=null;error=words('Connexion administrateur requise.','Admin sign-in required.');return false;}
  const id=state.user.id,request=++sequence;if(owner!==id)snapshot=null;owner=id;loading=true;error='';
  try{
   const result=await db.rpc('admin_console_snapshot');
   if(request!==sequence||state.user?.id!==id||!canUseSupabaseAdmin())return false;
   if(result.error||!result.data)throw new Error('snapshot unavailable');
   snapshot=result.data;return true;
  }catch(e){if(request===sequence&&state.user?.id===id){snapshot=null;error=words('Les données serveur ne sont pas disponibles. Réessaie avec Actualiser.','Server data is unavailable. Use Refresh to try again.');}return false;}
  finally{if(request===sequence)loading=false;}
 }
 function metric(label,value,tab){return `<button type="button" class="ac-metric" data-click="renderAdmin" data-click-args='${dataArgs([tab])}'><span>${label}</span><strong>${value==null?'—':esc(String(value))}</strong><small>${words('Consulter','View')} →</small></button>`;}
 function problems(){const h=snapshot?.health;return h?[(h.failing_jobs||[]).length,h.emails_failed_24h||0,h.emails_stuck_pending||0,h.stripe_events_failed_24h||0].reduce((a,b)=>a+Number(b),0):null;}
 function overview(){
  const s=snapshot?.stats||{},issues=problems();
  return `<div class="ac-metrics">${metric(words('Comptes','Accounts'),s.users,'users')}${metric(words('Annonces en ligne','Live listings'),s.active,'listings')}${metric(words('À valider','Pending review'),s.pending,'moderation')}${metric(words('Signalements ouverts','Open reports'),s.reports,'reports')}</div>
   <div class="ac-columns"><section class="ac-card ac-priority"><p class="ac-eyebrow">${words('À faire maintenant','Your next actions')}</p><h3>${words('Garde le contrôle.','Stay in control.')}</h3><p>${words('Commence par les annonces à valider et les signalements. Les changements confirmés sont appliqués à l’application.','Start with pending listings and reports. Confirmed changes are applied to the app.')}</p><div class="ac-shortcuts">${nav('moderation',words('Valider les annonces','Review listings'),'ac-primary')}${nav('reports',words('Voir les signalements','Open reports'))}${nav('users',words('Gérer les comptes','Manage accounts'))}</div></section>
   <section class="ac-card"><p class="ac-eyebrow">${words('Surveillance','Monitoring')}</p><h3>${issues==null?words('État non vérifié','Status not checked'):issues?words('Des points à vérifier','Items need attention'):words('Contrôles serveur OK','Server checks passed')}</h3><p>${words('Contrôle des tâches programmées, des emails et des événements Stripe. Les sauvegardes se vérifient séparément.','Checks scheduled jobs, emails and Stripe events. Backups are checked separately.')}</p>${snapshot?.settings?.posting_paused?`<p class="ac-warning">${words('Les nouvelles publications sont suspendues.','New listings are paused.')}</p>`:''}${nav('system',words('Voir l’état détaillé','View detailed status'),'ac-text-link')}</section></div>
   <section class="ac-card"><div class="ac-section-head"><h3>${words('Dernières actions','Recent activity')}</h3>${nav('activity',words('Tout voir','View all'),'ac-text-link')}</div>${activityRows(5)}</section>`;
 }
 function settings(){const s=snapshot?.settings;return `<section class="ac-card"><h3>${words('Messages & publication','Messages & publishing')}</h3><p>${words('Un message s’affiche en haut de l’application. La suspension bloque les nouvelles annonces des utilisateurs ; les administrateurs peuvent continuer à publier. Les messages privés restent disponibles.','A notice appears at the top of the app. Pausing blocks new user listings; admins can still publish. Private messages remain available.')}</p>
  <form id="adminConsoleSettings"><fieldset ${!s?'disabled':''}><label class="ac-check"><input type="checkbox" name="notice_enabled" ${s?.notice_enabled?'checked':''}><span><b>${words('Afficher un message aux utilisateurs','Show a public notice')}</b><small>${words('Prépare les deux langues avant de l’activer.','Prepare both languages before enabling it.')}</small></span></label>
  <label>${words('Message en français','French message')}<textarea name="notice_fr" maxlength="280" rows="3">${esc(s?.notice_fr||'')}</textarea></label>
  <label>${words('Message en anglais','English message')}<textarea name="notice_en" maxlength="280" rows="3">${esc(s?.notice_en||'')}</textarea></label>
  <label class="ac-check ac-pause"><input type="checkbox" name="posting_paused" ${s?.posting_paused?'checked':''}><span><b>${words('Suspendre les nouvelles annonces','Pause new listings')}</b><small>${words('À activer uniquement si tu veux arrêter temporairement les nouvelles publications.','Enable only when you want to temporarily stop new listings.')}</small></span></label>
  <p id="adminConsoleSaveStatus" role="status" aria-live="polite"></p><button class="ac-primary" type="submit">${words('Enregistrer les réglages','Save settings')}</button></fieldset></form></section>`;}
 function statusRow(title,value,note){return `<div class="ac-status-row"><div><b>${title}</b><small>${note}</small></div><strong>${esc(String(value??'—'))}</strong></div>`;}
 function system(){const h=snapshot?.health,s=snapshot?.stats;return `<div class="ac-columns"><section class="ac-card"><h3>${words('Contrôles serveur','Server checks')}</h3>${statusRow(words('Base de données','Database'),snapshot?words('Connectée','Connected'):words('Non vérifiée','Not checked'),words('Réponse authentifiée du serveur.','Authenticated server response.'))}${statusRow(words('Tâches à vérifier','Jobs needing attention'),h?(h.failing_jobs||[]).length:null,words('Échec ou absence récente d’exécution.','Failed or missing recent execution.'))}${statusRow(words('Emails en échec · 24 h','Failed emails · 24 h'),h?.emails_failed_24h,words('Consulter les journaux avant toute relance.','Check logs before retrying.'))}${statusRow(words('Emails en attente · plus de 2 h','Emails waiting · over 2 h'),h?.emails_stuck_pending,words('Peut indiquer un problème d’envoi.','May indicate a delivery issue.'))}${statusRow(words('Erreurs Stripe · 24 h','Stripe errors · 24 h'),h?.stripe_events_failed_24h,words('Ce contrôle ne couvre pas Apple, Google Play ni PayPal.','This check does not cover Apple, Google Play or PayPal.'))}${statusRow(words('Fichiers photos','Photo files'),s?.photos,words('Images et avatars présents dans le stockage.','Images and avatars in storage.'))}
  ${(h?.failing_jobs||[]).map(j=>`<p class="ac-warning"><b>${esc(j.job)}</b> · ${esc(j.last_status||words('jamais exécutée','never ran'))}<br>${esc(date(j.last_run))}</p>`).join('')}</section>
  <section class="ac-card"><h3>${words('Sauvegardes & accès de secours','Backups & recovery access')}</h3><p>${words('La base est sauvegardée chaque nuit, les photos chaque semaine. Vérifie le dernier résultat dans GitHub. Cette page ne confirme pas la réussite d’une restauration.','The database is backed up nightly, photos weekly. Check the latest result in GitHub. This page does not confirm a successful restore.')}</p><div class="ac-resource-links"><a href="admin/recovery.html" target="_blank" rel="noopener">${words('Ouvrir la page de secours','Open recovery page')} ↗</a><a href="https://github.com/buyselltradesxm-cloud/BuySell-Trade-Sxm/actions/workflows/db-backup.yml" target="_blank" rel="noopener">${words('Vérifier les sauvegardes','Check backups')} ↗</a><a href="https://github.com/buyselltradesxm-cloud/BuySell-Trade-Sxm/actions/workflows/health-check.yml" target="_blank" rel="noopener">${words('Voir la surveillance','View monitoring')} ↗</a><a href="https://supabase.com/dashboard/project/szhaxlmronirhnntlwyb" target="_blank" rel="noopener">${words('Ouvrir Supabase','Open Supabase')} ↗</a></div><p class="ac-help-note">${words('Ces outils demandent ta connexion propriétaire. Conserve la clé de déchiffrement des sauvegardes en lieu sûr, hors du site.','These tools require your owner login. Keep the backup decryption key secure and outside the website.')}</p></section></div>`;}
 function activityRows(limit=50){const rows=snapshot?.activity;if(!rows)return `<p>${words('Historique indisponible tant que le serveur ne répond pas.','History is unavailable until the server responds.')}</p>`;const names={console_settings_saved:words('Réglages du site modifiés','Site settings updated'),owner_grant_admin_unlimited:words('Accès propriétaire Unlimited attribué','Owner Unlimited access granted'),update_user_role:words('Droits du compte modifiés','Account role updated'),grant_plan:words('Accès Pro offert','Pro access granted'),delete_listing:words('Annonce supprimée','Listing deleted'),ban_user:words('Compte banni','Account banned'),unban_user:words('Compte débloqué','Account unbanned')};return rows.slice(0,limit).map(r=>`<div class="ac-activity"><span class="ac-activity-dot"></span><div><b>${esc(names[r.action]||r.action)}</b><small>${esc(r.actor||'Admin')} · ${esc(r.target_type||'')} ${esc(r.target_id||'')}</small></div><time>${esc(date(r.created_at))}</time></div>`).join('')||`<p>${words('Aucune action enregistrée.','No recorded actions.')}</p>`;}
 function guide(){return `<div class="ac-columns"><section class="ac-card"><p class="ac-eyebrow">${words('Prise en main','Getting started')}</p><h3>${words('Ton application, simplement.','Your app, made simple.')}</h3><ol class="ac-guide"><li><b>${words('Au quotidien','Every day')}</b><p>${words('Regarde la vue d’ensemble, puis traite les annonces à valider et les signalements.','Check the overview, then handle pending listings and reports.')}</p></li><li><b>${words('Pour modifier une annonce','To edit a listing')}</b><p>${words('Ouvre Annonces, recherche le titre et choisis Modifier. Enregistre le formulaire habituel.','Open Listings, search the title and choose Edit. Save the usual listing form.')}</p></li><li><b>${words('Pour gérer un compte','To manage an account')}</b><p>${words('Dans Utilisateurs, recherche le nom ou l’email. Tu peux gérer son accès Pro et ses droits. Un administrateur dispose de pouvoirs importants.','In Users, search a name or email. You can manage Pro access and roles. An admin has significant permissions.')}</p></li><li><b>${words('Sur ton téléphone','On your phone')}</b><p>${words('Ouvre buyselltradesxm.com/admin/ dans Safari ou Chrome et ajoute cette page à tes favoris. Connecte-toi avec un de tes comptes administrateur.','Open buyselltradesxm.com/admin/ in Safari or Chrome and bookmark it. Sign in with one of your admin accounts.')}</p></li></ol></section>
  <section class="ac-card"><p class="ac-eyebrow">${words('En cas de problème','If something goes wrong')}</p><h3>${words('Trois réflexes utiles.','Three useful steps.')}</h3><ol class="ac-guide"><li><b>${words('Vérifier','Check')}</b><p>${words('Ouvre État du système, puis Actualiser. Consulte aussi les erreurs dans Statistiques.','Open System status and Refresh. Also check errors in Statistics.')}</p></li><li><b>${words('Prévenir','Inform')}</b><p>${words('Dans Réglages, affiche un message. Si nécessaire, suspends les nouvelles annonces. Ne relance pas un paiement ou un email dont le résultat est incertain.','Show a notice in Settings. Pause new listings if needed. Do not retry a payment or email whose outcome is uncertain.')}</p></li><li><b>${words('Récupérer','Recover')}</b><p>${words('Si le site ne s’ouvre plus, utilise directement Supabase et GitHub. Une restauration se prépare dans un environnement isolé avec une aide technique.','If the site will not open, use Supabase and GitHub directly. Prepare restoration in an isolated environment with technical help.')}</p></li></ol>${nav('system',words('Ouvrir les outils de secours','Open recovery tools'),'ac-primary')}</section></div>`;}
 function render(tab){
  const host=document.getElementById('adminBody');if(!host)return;
  if(!isAdminUser()){clear();return;}
  if(owner&&owner!==state.user?.id)clear();
  const selected=sections.find(s=>s[0]===tab)||sections[0];adminTab=selected[0];
  const title=words(selected[1],selected[2]);const note=descriptions[adminTab]||descriptions.overview;
  document.getElementById('adminTitle').textContent=words('Administration','Administration');
  const panel=adminTab==='overview'?overview():adminTab==='settings'?settings():adminTab==='system'?system():adminTab==='activity'?`<section class="ac-card"><h3>${words('Journal des actions','Action log')}</h3><p>${words('Les 50 dernières actions enregistrées. Certaines actions historiques peuvent ne pas avoir été journalisées.','The latest 50 recorded actions. Some historical actions may not have been logged.')}</p>${activityRows()}</section>`:adminTab==='guide'?guide():adminPanelHTML(adminTab);
  host.innerHTML=`<div class="ac-workspace"><nav class="ac-sidebar" aria-label="${words('Rubriques administrateur','Admin sections')}"><label class="ac-mobile-menu">${words('Choisir une rubrique','Choose a section')}<select data-change="renderAdmin" data-change-args='["__VALUE__"]'>${sections.map(s=>`<option value="${s[0]}" ${s[0]===adminTab?'selected':''}>${words(s[1],s[2])}</option>`).join('')}</select></label><div class="ac-brand"><span>SXM<span class="ac-brand-dot">.</span></span><small>${words('Espace propriétaire','Owner workspace')}</small></div>${sections.map(s=>`<button type="button" class="ac-nav" ${s[0]===adminTab?'aria-current="page"':''} data-click="renderAdmin" data-click-args='${dataArgs([s[0]])}'>${icon(s[3])}<span>${words(s[1],s[2])}</span>${s[0]==='moderation'&&snapshot?.stats?.pending?`<em>${esc(String(snapshot.stats.pending))}</em>`:''}</button>`).join('')}<div class="ac-account"><b>${esc(state.user.name||words('Administrateur','Administrator'))}</b><span>${esc(state.user.email||'')}</span><small>${words('Accès administrateur','Admin access')}</small></div></nav><main class="ac-main"><header class="ac-top"><div><p class="ac-eyebrow">Buy Sell Trade SXM</p><h2>${title}</h2><p>${words(note[0],note[1])}</p></div><div class="ac-tools"><button type="button" data-admin-action="language">${state.lang==='fr'?'EN':'FR'}</button><button type="button" data-admin-action="refresh" ${loading?'disabled':''}>${words('Actualiser','Refresh')}</button><button type="button" data-click="closeModal" data-click-args='["adminModal"]'>${words('Voir le site','View site')} ↗</button></div></header><div class="ac-sync"><span class="ac-status-dot ${snapshot?'is-connected':''}"></span>${loading?words('Actualisation…','Refreshing…'):snapshot?words('Données serveur · ','Server data · ')+esc(date(snapshot.checked_at)):words('Données non vérifiées','Unverified data')}</div>${error?`<div class="ac-error" role="alert">${esc(error)}</div>`:''}${window.adminDataLoadFailed?`<div class="ac-error" role="alert">${words('Certaines listes n’ont pas pu être actualisées. Les compteurs serveur restent séparés des listes chargées.','Some lists could not refresh. Server totals are separate from loaded lists.')}</div>`:''}<div class="ac-content">${panel}</div><footer class="ac-footer">${words('Les actions modifient l’application en ligne. Les opérations sensibles demandent une confirmation.','Actions update the live app. Sensitive operations require confirmation.')}</footer></main></div>`;
 }
 async function refresh(){
  if(dirty&&!confirm(words('Abandonner les modifications non enregistrées ?','Discard unsaved changes?')))return;
  dirty=false;
  const id=state.user?.id;if(!canUseSupabaseAdmin())return;
  loading=true;render(adminTab);
  await Promise.all([load(),loadSupabaseAdminData()]);
  if(state.user?.id===id&&isAdminUser())render(adminTab);
 }
 async function save(event){
  event.preventDefault();if(!canUseSupabaseAdmin()||!snapshot||loading)return;
  const form=event.target,feedback=form.querySelector('[role="status"]'),submit=form.querySelector('[type="submit"]');
  const fields=new FormData(form),payload={notice_enabled:fields.has('notice_enabled'),posting_paused:fields.has('posting_paused'),notice_fr:String(fields.get('notice_fr')||''),notice_en:String(fields.get('notice_en')||'')};
  if(payload.notice_enabled&&(!payload.notice_fr.trim()||!payload.notice_en.trim())){feedback.textContent=words('Complète les messages français et anglais.','Complete the French and English messages.');return;}
  if(payload.posting_paused!==snapshot.settings.posting_paused&&!confirm(payload.posting_paused?words('Suspendre les nouvelles annonces pour les utilisateurs ?','Pause new user listings?'):words('Réouvrir les nouvelles publications ?','Resume new user listings?')))return;
  const id=state.user.id;submit.disabled=true;feedback.textContent=words('Enregistrement…','Saving…');
  try{
   const result=await db.rpc('admin_console_save_settings',{payload,expected_revision:snapshot.settings.revision});
   if(state.user?.id!==id||!canUseSupabaseAdmin())return;
   if(result.error){feedback.textContent=result.error.code==='40001'?words('Un autre administrateur a modifié les réglages. Copie ton texte, actualise, puis réessaie.','Another admin changed the settings. Copy your text, refresh and try again.'):words('Enregistrement non confirmé. Tes modifications restent dans le formulaire.','Save not confirmed. Your changes remain in the form.');return;}
   snapshot.settings=result.data;dirty=false;feedback.textContent=words('Réglages enregistrés sur le serveur.','Settings saved on the server.');window.SiteConsole?.load();
   const request=sequence;await load();if(state.user?.id===id&&sequence>=request&&document.getElementById('adminConsoleSettings')===form)feedback.textContent=words('Réglages enregistrés sur le serveur.','Settings saved on the server.');
  }catch(e){if(state.user?.id===id)feedback.textContent=words('Connexion interrompue. Actualise avant de réessayer pour vérifier si le changement a été enregistré.','Connection interrupted. Refresh before retrying to check whether the change was saved.');}
  finally{submit.disabled=false;}
 }
 document.addEventListener('submit',event=>{if(event.target.id==='adminConsoleSettings')save(event);});
 document.addEventListener('input',event=>{if(event.target.closest('#adminConsoleSettings'))dirty=true;});
 document.addEventListener('click',event=>{
  const button=event.target.closest('[data-admin-action]');if(!button||!isAdminUser())return;
  if(button.dataset.adminAction==='refresh')refresh();
  if(button.dataset.adminAction==='language'){if(dirty&&!confirm(words('Abandonner les modifications non enregistrées ?','Discard unsaved changes?')))return;dirty=false;setLang(state.lang==='fr'?'en':'fr');render(adminTab);}
 });
 document.addEventListener('click',event=>{
  const button=event.target.closest('#adminModal [data-click]');if(!button)return;
  const action=button.dataset.click;
  if(dirty&&(action==='renderAdmin'||action==='closeModal')&&!confirm(words('Abandonner les modifications non enregistrées ?','Discard unsaved changes?'))){event.preventDefault();event.stopImmediatePropagation();return;}
  if(action==='renderAdmin'||action==='closeModal')dirty=false;
  const sensitive=['removeListingAdmin','deleteUserAdmin','toggleBanUser','toggleAdminRole'];
  if(!sensitive.includes(action))return;
  const args=JSON.parse(button.getAttribute('data-click-args')||'[]');
  if(String(args[0])===String(state.user?.id)&&['deleteUserAdmin','toggleBanUser','toggleAdminRole'].includes(action)){
   event.preventDefault();event.stopImmediatePropagation();showToast(words('Ton propre accès administrateur est protégé ici.','Your own admin access is protected here.'));return;
  }
  if(!confirm(words('Confirmer cette action sur cet élément ou ce compte ?','Confirm this action on this item or account?'))){event.preventDefault();event.stopImmediatePropagation();}
 },true);
 window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
 window.AdminConsole={load,render,refresh,clear};
})();
