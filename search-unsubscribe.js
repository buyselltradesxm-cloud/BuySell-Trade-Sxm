(function(){
  'use strict';
  const token=new URLSearchParams(location.search).get('token')||'';
  // Remove the private token before any navigation; this page has no analytics.
  history.replaceState(null,'',location.pathname);
  const button=document.getElementById('unsubscribeSearch'),status=document.getElementById('unsubscribeStatus');
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)){
    button.disabled=true;status.textContent='Invalid link. Open the link in your email again. / Lien invalide. Rouvrez le lien de votre email.';return;
  }
  document.getElementById('unsubscribeForm').addEventListener('submit',async event=>{
    event.preventDefault();
    if(button.disabled)return;button.disabled=true;status.textContent='Saving… / Enregistrement…';
    try{
      const response=await fetch(window.SUPABASE_URL+'/rest/v1/rpc/unsubscribe_search_digests',{method:'POST',signal:AbortSignal.timeout(12000),
        headers:{apikey:window.SUPABASE_ANON_KEY,'content-type':'application/json'},body:JSON.stringify({token})});
      if(!response.ok||await response.json()!==true)throw new Error();
      status.textContent='Search emails stopped. / Emails de recherche désactivés.';button.hidden=true;
    }catch(_){button.disabled=false;status.textContent='Could not unsubscribe. Try again. / Désinscription impossible. Réessayez.';}
  });
})();
