/* Listing page sections, in the order buyers read them: seller card (with Follow),
   key information, then the description. Shared by index.html and marketplace.html. */
(function(){
  'use strict';
  const tr=(fr,en)=>state.lang==='fr'?fr:en;
  const COLORS=['#0b6e7f','#1f7a4d','#b4542d','#6b4fa0','#a3366b','#2f5d8a'];
  const CHEVRON='<svg class="ld-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>';

  function avatar(name){
    const letter=(Array.from(String(name||'').trim())[0]||'?').toUpperCase();
    let h=0;for(const ch of String(name||''))h=(h*31+ch.codePointAt(0))>>>0;
    return `<span class="ld-avatar" style="background:${COLORS[h%COLORS.length]}" aria-hidden="true">${esc(letter)}</span>`;
  }

  function listingSellerCardHTML(l){
    const name=sellerName(l);
    const count=l.sellerId?businessListings(l.sellerId).length:0;
    const kind=l.pro?t().sellerPro:t().sellerLocal;
    const countText=count?`${count} ${count>1?tr('annonces','listings'):tr('annonce','listing')}`:'';
    const text=`<span class="ld-seller-text"><b>${esc(name)}</b><span>${[countText,esc(kind)].filter(Boolean).join(' · ')}</span></span>`;
    const head=count
      ?`<button type="button" class="ld-seller-main" data-click="openBusinessPage" data-click-args='${dataArgs([l.sellerId])}'
          aria-label="${esc(tr(`Voir les annonces de ${name}`,`See ${name}’s listings`))}">${avatar(name)}${text}${CHEVRON}</button>`
      :`<div class="ld-seller-main">${avatar(name)}${text}</div>`;
    return `<section class="ld-seller" aria-label="${tr('Vendu par','Sold by')}">
      <h3 class="ld-heading">${tr('Vendu par','Sold by')}</h3>
      ${head}
      <div class="ld-seller-actions">${window.SellerFollows?.buttonHTML(l)||''}${sellerPhoneHTML(l).replace(/^<br>/,'')}</div>
      ${sellerTrustHTML(l)}
    </section>`;
  }

  function listingKeyInfoHTML(l,profile){
    const cat=CATS.find(c=>c.id===l.cat);
    const sub=(SUBCATS[l.cat]?.groups||[]).flatMap(g=>g.items).find(s=>s.id===l.sub);
    const side=l.side==='fr'?t().frSide:l.side==='nl'?t().nlSide:'';
    const rows=[
      [tr('État','Condition'),profile.condition?condLabel(l.cond):''],
      [tr('Catégorie','Category'),cat&&cat.id!=='all'?cat[state.lang]:''],
      [tr('Type','Type'),sub?sub[state.lang]:''],
      [tr('Lieu','Location'),[l.area,side].filter(Boolean).join(' · ')],
      [tr('Remise','Handover'),profile.delivery?deliveryLabel(l.delivery):''],
      [tr('Rendez-vous','Meeting point'),profile.meetup?meetupLabel(l.meetup):''],
      [tr('Prix','Price'),profile.negotiable&&l.negotiable?t().negotiableLabel:'']
    ].filter(([,value])=>value);
    if(!rows.length) return '';
    return `<section class="ld-section"><h3 class="ld-heading">${tr('Les informations clés','Key information')}</h3>
      <dl class="ld-keys">${rows.map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></section>`;
  }

  // Long descriptions start folded to six lines with "Voir plus".
  function listingDescriptionHTML(text){
    if(!text) return '';
    const long=text.length>320||text.split('\n').length>6;
    return `<section class="ld-section ld-desc${long?' folded':''}"><h3 class="ld-heading">Description</h3>
      <p class="detail-description">${esc(text)}</p>
      ${long?`<button type="button" class="ld-more" aria-expanded="false" data-click="toggleListingDescription" data-click-args='${dataArgs(['__THIS__'])}'>${tr('Voir plus','See more')}</button>`:''}</section>`;
  }
  function toggleListingDescription(btn){
    const box=btn.closest('.ld-desc');
    const open=box.classList.toggle('folded')===false;
    btn.setAttribute('aria-expanded',String(open));
    btn.textContent=open?tr('Voir moins','See less'):tr('Voir plus','See more');
  }

  // Shown to the seller on their own listing instead of the buyer chat:
  // status, then every owner action in one place (actions from ownerActionBarHTML).
  function listingOwnerPanelHTML(l){
    const sold=listingIsSold(l);
    const status=sold?tr('Vendue','Sold'):tr('En ligne','Online');
    return `<section class="ld-owner" aria-labelledby="ldOwnerTitle">
      <div class="ld-owner-head">
        <h3 class="ld-heading" id="ldOwnerTitle">${tr('Gérer votre annonce','Manage your listing')}</h3>
        <span class="ld-owner-status${sold?' sold':''}">${status}</span>
      </div>
      <p class="ld-owner-help">${tr('Les acheteurs vous écrivent depuis cette page. Leurs messages arrivent dans Messages.','Buyers write to you from this page. Their messages arrive in Messages.')}</p>
      ${ownerActionBarHTML(l)}
      <button type="button" class="ld-owner-messages" data-click="openOwnListingMessages">${tr('Messages des acheteurs','Messages from buyers')}</button>
    </section>`;
  }
  function openOwnListingMessages(){closeModal('detailModal');openMessages();}

  // First-message suggestions (same list as the iOS Messages screen): a tap fills the
  // message box, the buyer still chooses to send. Hidden once the buyer has written.
  const SUGGESTIONS=[['Bonjour, est-ce toujours disponible ?','Hi, is this still available?'],
    ['Quel est votre dernier prix ?','What is your best price?'],
    ['Où peut-on se rencontrer ?','Where can we meet?'],
    ['Pouvez-vous m’envoyer d’autres photos ?','Could you send more photos?']];
  function chatSuggestionsHTML(id,thread){
    if(!state.user||thread.messages.some(m=>m.who==='buyer')) return '';
    return `<div class="chat-suggest" role="group" aria-label="${tr('Messages suggérés','Suggested messages')}">${SUGGESTIONS.map(([fr,en])=>{
      const text=tr(fr,en);
      return `<button type="button" data-click="useChatSuggestion" data-click-args='${dataArgs([String(id),text])}'>${esc(text)}</button>`;
    }).join('')}</div>`;
  }
  function useChatSuggestion(id,text){
    const input=document.getElementById('chatInput-'+id);
    if(!input) return;
    input.value=text;
    input.focus();
  }

  Object.assign(window,{chatSuggestionsHTML,useChatSuggestion,listingOwnerPanelHTML,openOwnListingMessages,listingSellerCardHTML,listingKeyInfoHTML,listingDescriptionHTML,toggleListingDescription});
})();
