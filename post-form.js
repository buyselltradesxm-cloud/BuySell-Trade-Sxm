/* "Publier une annonce": what is still missing before a listing can be published,
   and the description helper (live count). The same description rule is used by the
   native iOS form: descriptionIsSentence() is defined in native-workflows.js. */
(function(){
  'use strict';
  const tr=(fr,en)=>state.lang==='fr'?fr:en;
  const el=id=>document.getElementById(id);
  const MIN_DESC=20; // same minimum as descriptionIsSentence() in native-workflows.js
  const descriptionIsSentence=text=>window.descriptionIsSentence(text);

  const labelOf=control=>(control.closest('.field')?.querySelector('label')?.textContent||control.name||control.id).trim();
  const visible=control=>!control.disabled&&!control.closest('[hidden]');

  // Every reason the form cannot be published yet, in screen order.
  function postMissingItems(){
    const items=[];
    const add=(id,text)=>{if(!items.some(i=>i.id===id))items.push({id,text});};
    const title=el('newTitle').value.trim();
    if(title.length<4) add('newTitle',tr('Titre (4 caractères minimum)','Title (at least 4 characters)'));
    const cat=el('newCat').value;
    if(!cat) add('newCat',tr('Catégorie','Category'));
    else if(!el('newSubcatField').hidden&&!el('newSubcat').value) add('newSubcat',tr('Sous-catégorie','Subcategory'));
    if(!descriptionIsSentence(el('newDesc').value))
      add('newDesc',tr('Description : au moins une phrase (20 caractères minimum)','Description: at least one sentence (20 characters minimum)'));
    const sub=el('newSubcatField').hidden?'':el('newSubcat').value;
    if(cat&&postFieldProfile(cat,sub).photosRequired&&!selectedPostPhotos.length) add('newPhotos',tr('Au moins une photo','At least one photo'));
    el('postForm').querySelectorAll('[required]').forEach(control=>{
      if(!visible(control)||['newTitle','newCat','newSubcat'].includes(control.id)) return;
      if(!control.validity.valid) add(control.id,labelOf(control)); // validity, not checkValidity(): no invalid event, no old toast
    });
    const order=[...el('postForm').querySelectorAll('input,select,textarea')].map(c=>c.id);
    return items.sort((a,b)=>order.indexOf(a.id)-order.indexOf(b.id));
  }

  function showPostMissing(items,scroll){
    const box=el('postMissing');
    el('postForm').querySelectorAll('.field.missing').forEach(f=>f.classList.remove('missing'));
    if(!items.length){box.hidden=true;box.innerHTML='';return;}
    items.forEach(i=>el(i.id)?.closest('.field')?.classList.add('missing'));
    box.innerHTML=`<b>${tr('Pour publier votre annonce, il manque :','To publish your listing, please complete:')}</b>
      <ul>${items.map(i=>`<li><button type="button" data-post-goto="${esc(i.id)}"><span>${esc(i.text)}</span></button></li>`).join('')}</ul>`;
    box.hidden=false;
    if(scroll) box.scrollIntoView({block:'center',behavior:'smooth'});
  }

  // Called by createListing: true when the listing may be published.
  function checkPostComplete(){
    const items=postMissingItems();
    showPostMissing(items,true);
    return !items.length;
  }

  function refreshPostDescCount(){
    const area=el('newDesc'),out=el('newDescCount');
    if(!area||!out) return;
    const n=area.value.trim().length;
    const ok=descriptionIsSentence(area.value);
    out.textContent=ok?tr(`✓ ${n} caractères`,`✓ ${n} characters`)
      :n<MIN_DESC?tr(`${n} / ${MIN_DESC} caractères minimum`,`${n} / ${MIN_DESC} characters minimum`)
      :tr('Écrivez au moins une phrase complète','Write at least one full sentence');
    out.classList.toggle('ok',ok);
  }

  document.addEventListener('input',event=>{
    if(event.target.id==='newDesc') refreshPostDescCount();
    if(event.target.closest?.('#postForm')&&!el('postMissing').hidden) showPostMissing(postMissingItems(),false);
  });
  document.addEventListener('change',event=>{
    if(event.target.closest?.('#postForm')&&!el('postMissing').hidden) showPostMissing(postMissingItems(),false);
  });
  document.addEventListener('click',event=>{
    const go=event.target.closest?.('[data-post-goto]');
    if(!go) return;
    const control=el(go.dataset.postGoto);
    const field=control?.closest('.field')||control;
    field?.scrollIntoView({block:'center',behavior:'smooth'});
    if(control&&control.type!=='file') control.focus({preventScroll:true});
  });
  // A fresh or edited form starts without old warnings and with an up-to-date count.
  const modal=el('postModal');
  if(modal) new MutationObserver(()=>{
    if(!modal.classList.contains('open')) return;
    showPostMissing([],false);
    refreshPostDescCount();
  }).observe(modal,{attributes:true,attributeFilter:['class']});

  Object.assign(window,{postMissingItems,checkPostComplete,refreshPostDescCount});
})();
