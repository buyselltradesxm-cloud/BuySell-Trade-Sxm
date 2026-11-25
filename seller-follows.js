/* Follow a seller ("Suivre") and the "Vendeurs suivis" list. The phone
   notification on a new listing is sent by the database (supabase/seller-follows.sql). */
(function(){
  'use strict';
  const tr=(fr,en)=>state.lang==='fr'?fr:en;
  const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let followed=null,owner=null,loading=null,busy=false;
  const ready=()=>!!(state.user&&window.db&&window.SB?.enabled());
  const isFollowed=id=>owner===state.user?.id&&!!followed?.has(id);

  function load(){
    const id=state.user?.id;
    if(!ready()){followed=null;owner=null;return Promise.resolve();}
    if(owner===id&&followed) return Promise.resolve();
    if(owner===id&&loading) return loading;
    owner=id;followed=null;
    loading=db.from('seller_follows').select('seller_id').eq('follower_id',id).limit(200).then(r=>{
      if(owner===id&&!r.error) followed=new Set(r.data.map(x=>x.seller_id));
    },()=>{}).finally(()=>{loading=null;});
    return loading;
  }
  function paint(){
    document.querySelectorAll('[data-follow-seller]').forEach(b=>{
      const on=isFollowed(b.dataset.followSeller);
      b.textContent=on?tr('Suivi ✓','Following ✓'):tr('Suivre','Follow');
      b.setAttribute('aria-pressed',String(on));
    });
  }
  function button(sellerId){
    const on=isFollowed(sellerId);
    return `<button type="button" class="follow-seller-btn" data-follow-seller="${esc(sellerId)}" aria-pressed="${on}"
      data-click="toggleFollowSeller" data-click-args='${dataArgs(['__DATA__:followSeller','__THIS__'])}'>${on?tr('Suivi ✓','Following ✓'):tr('Suivre','Follow')}</button>`;
  }
  // Called from the listing detail template (app-index.js / app-marketplace.js).
  function buttonHTML(l){
    if(!UUID.test(l?.sellerId||'')||isOwnListing(l)) return '';
    if(state.user) setTimeout(()=>load().then(paint),0);
    return button(l.sellerId);
  }

  // want: true = follow only (after login), undefined = toggle.
  async function toggleFollowSeller(sellerId,btn,want){
    if(!UUID.test(sellerId||'')) return;
    if(!state.user){requireAccount('follow:'+sellerId);return;}
    if(!ready()||busy) return;
    busy=true;if(btn) btn.disabled=true;
    const id=state.user.id;
    try{
      await load();
      if(!followed||owner!==id) throw new Error('not loaded');
      const on=followed.has(sellerId);
      if(want===true&&on) return;
      const r=on
        ?await db.from('seller_follows').delete().eq('follower_id',id).eq('seller_id',sellerId)
        :await db.from('seller_follows').insert({follower_id:id,seller_id:sellerId});
      if(r.error&&r.error.code!=='23505') throw r.error; // 23505: already following
      if(owner!==id) return;
      on?followed.delete(sellerId):followed.add(sellerId);
      showToast(on?tr('Vous ne suivez plus ce vendeur.','You unfollowed this seller.')
        :tr('Vendeur suivi. Vous serez prévenu de ses nouvelles annonces.','Following. You’ll be notified of their new listings.'));
      if(!on&&typeof schedulePushInvite==='function') schedulePushInvite(1500);
    }catch(_){
      showToast(tr('Action non confirmée. Réessayez.','Not confirmed. Please try again.'));
    }finally{
      busy=false;if(btn) btn.disabled=false;paint();
    }
  }

  const modal=document.createElement('div');
  modal.id='followedSellersModal';modal.className='modal';
  document.body.append(modal);
  const close=()=>{closeModal(modal.id);modal.innerHTML='';};

  async function openFollowedSellers(){
    if(typeof closeNotifPanel==='function') closeNotifPanel();
    if(!state.user){requireAccount('followed-sellers');return;}
    const id=state.user.id;
    modal.innerHTML=`<section class="dialog search-alert-dialog" role="dialog" aria-modal="true" aria-labelledby="followedSellersTitle">
      <div class="dialog-head"><h2 id="followedSellersTitle" tabindex="-1">${tr('Vendeurs suivis','Followed sellers')}</h2>
        <button type="button" class="icon-btn" data-follow-close aria-label="${tr('Fermer','Close')}">×</button></div>
      <div class="dialog-body"><p>${tr('Vous recevez une notification quand ces vendeurs publient une nouvelle annonce.','You get a notification when these sellers post a new listing.')}</p>
      <ul id="followedSellersList" class="search-alert-list" aria-live="polite"><li>${tr('Chargement…','Loading…')}</li></ul></div></section>`;
    openModal(modal.id);
    document.getElementById('followedSellersTitle').focus();
    let r={error:true};
    try{if(ready()) r=await db.rpc('my_followed_sellers');}catch(_){}
    const list=document.getElementById('followedSellersList');
    if(!list||state.user?.id!==id) return;
    if(r.error){list.innerHTML=`<li>${tr('Impossible de charger la liste. Fermez puis réessayez.','Could not load the list. Close and try again.')}</li>`;return;}
    if(owner===id&&followed) r.data.forEach(s=>followed.add(s.seller_id));
    list.innerHTML=r.data.length?r.data.map(s=>`<li><div><b>${esc(s.seller_name)}</b>
        <p>${Number(s.active_listings)} ${tr('annonce(s) en ligne','listing(s) online')}</p></div>
        ${Number(s.active_listings)?`<button type="button" data-follow-open="${esc(s.seller_id)}">${tr('Voir ses annonces','See listings')}</button>`:''}
        ${button(s.seller_id)}</li>`).join('')
      :`<li>${tr('Vous ne suivez aucun vendeur. Touchez « Suivre » sur une annonce.','You don’t follow any seller yet. Tap “Follow” on a listing.')}</li>`;
    load().then(paint);
  }

  modal.addEventListener('click',event=>{
    if(event.target===modal||event.target.closest('[data-follow-close]')){close();return;}
    const open=event.target.closest('[data-follow-open]');
    if(open){close();openBusinessPage(open.dataset.followOpen);}
  });
  modal.addEventListener('keydown',event=>{if(event.key==='Escape'){event.stopPropagation();close();}});

  window.toggleFollowSeller=toggleFollowSeller;
  window.openFollowedSellers=openFollowedSellers;
  window.SellerFollows={buttonHTML,open:openFollowedSellers,follow:id=>toggleFollowSeller(id,null,true)};
})();
