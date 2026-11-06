/* Data adapter for SwiftUI workflows. Authentication stays in the existing
 * Supabase client; no credentials are copied to Swift or persisted in drafts. */
(function () {
  "use strict";
  const text = (fr, en) => state.lang === "fr" ? fr : en;
  const fail = (fr, en, code = "REQUEST_FAILED") => { const e = new Error(text(fr, en)); e.code = code; throw e; };
  const validID = value => /^(?:[0-9]+|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(String(value || ""));
  const validUser = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ""));
  const locks = new Set();
  function profile(cat, sub) {
    const p = postFieldProfile(cat, sub);
    return { photosRequired:!!p.photosRequired, price:!!p.price, priceRequired:p.price && p.priceRequired !== false,
      condition:!!p.condition, urgent:!!p.urgent, vehicle:!!p.vehicle, mileage:p.vehicle && cat !== "locvoit" };
  }
  function schema() {
    return {
      categories:CATS.filter(c=>c.id !== "all" && !adminCategoryStatus[c.id]?.hidden).map(c=>({
        id:c.id, name:c[state.lang], fields:profile(c.id,""),
        subs:(SUBCATS[c.id]?.groups || []).flatMap(g=>g.items).map(s=>({id:s.id,name:s[state.lang],fields:profile(c.id,s.id)}))
      })),
      areas:[...new Set([...AREAS.fr,...AREAS.nl])], conditions:CONDS.map(c=>({id:c.id,name:c[state.lang]}))
    };
  }
  async function identity(expected) {
    if(!window.SB || !SB.enabled()) fail("Connexion au service indisponible.", "Service connection unavailable.");
    const user = await SB.currentUser();
    if(!user || (expected && expected !== user.id) || state.user?.id !== user.id)
      fail("Connectez-vous avec votre compte pour continuer.", "Sign in with your account to continue.", "AUTH_REQUIRED");
    const revision = authProjectionRevision;
    return {user, check:()=>{
      if(state.user?.id !== user.id || authProjectionRevision !== revision)
        fail("Le compte a changé. Recommencez.", "The account changed. Please try again.", "AUTH_REQUIRED");
    }};
  }
  function message(m) {
    return {id:String(m.id),body:String(m.body || ""),senderId:m.sender_id,createdAt:m.created_at,read:!!m.read};
  }
  async function listing(id) {
    if(!validID(id)) fail("Annonce invalide.", "Invalid listing.");
    const r = await db.from("listings").select("id,seller_id,title,seller_name,status").eq("id",id).maybeSingle();
    if(r.error || !r.data?.seller_id) fail("Cette annonce n’est plus accessible.", "This listing is no longer accessible.");
    return r.data;
  }
  async function request(action, payload = {}) {
    let lock, claimed = false, writeStarted = false;
    try {
      if(action === "session") {
        const user = window.SB && SB.enabled() ? await SB.currentUser() : null;
        return {ok:true,data:{userId:user && state.user?.id === user.id ? user.id : null, french:state.lang === "fr", schema:schema()}};
      }
      const {user,check} = await identity(payload.userId);
      if(["publish","send","block","report"].includes(action)) {
        lock = user.id + ":" + action;
        if(locks.has(lock)) fail("Une opération est déjà en cours.", "An operation is already in progress.");
        locks.add(lock); claimed = true;
      }
      let data;
      if(action === "publish") {
        if(state.user.accountType === "business" && !hasActiveProSubscription(state.user))
          fail("Votre abonnement Pro doit être actif pour publier. Consultez votre profil.", "Your Pro subscription must be active to publish. Check your profile.");
        const d = payload.draft || {};
        const category = schema().categories.find(c=>c.id === d.category);
        if(!category || (d.subcategory && !category.subs.some(s=>s.id === d.subcategory)))
          fail("Choisissez une catégorie valide.", "Choose a valid category.");
        const fields = profile(d.category,d.subcategory || "");
        const title = String(d.title || "").trim(), description = String(d.description || "").trim();
        if(title.length < 3 || title.length > 120 || !description || description.length > 10000)
          fail("Ajoutez un titre de 3 à 120 caractères et une description.", "Add a 3–120 character title and a description.");
        if(![...AREAS.fr,...AREAS.nl].includes(d.area)) fail("Choisissez votre secteur.", "Choose your area.");
        const rawAmount = String(d.amount ?? "").trim().replace(",",".");
        const amount = Number(rawAmount);
        if(fields.price && (!Number.isFinite(amount) || amount < 0 || (rawAmount && !/^\d+(?:\.\d{1,2})?$/.test(rawAmount)) || (fields.priceRequired && !rawAmount)))
          fail("Saisissez un prix valide.", "Enter a valid price.");
        if(!["eur","usd"].includes(d.currency)) fail("Devise invalide.", "Invalid currency.");
        if(fields.condition && !CONDS.some(c=>c.id === d.condition)) fail("Choisissez l’état de l’article.", "Choose the item condition.");
        if(fields.mileage && (!/^\d{4}$/.test(d.year) || !/^\d+$/.test(d.km) || !String(d.color || "").trim()))
          fail("Complétez l’année, le kilométrage et la couleur.", "Complete the year, mileage and color.");
        const photos = Array.isArray(d.photos) ? d.photos : [];
        if(photos.length > 8 || (fields.photosRequired && !photos.length)) fail("Ajoutez entre 1 et 8 photos.", "Add between 1 and 8 photos.");
        const limit = listingLimitFor(state.user);
        if(Number.isFinite(limit) && publicationUsageCountFor(state.user) >= limit)
          fail("Votre limite de publication est atteinte. Consultez votre profil.", "Your publication limit has been reached. Check your profile.");
        const files = photos.map((p,i)=>{
          if(typeof p.data !== "string" || p.data.length > 6000000 || !/^[A-Za-z0-9+/]*={0,2}$/.test(p.data))
            fail("Une photo est invalide ou trop volumineuse.", "A photo is invalid or too large.");
          const bytes = Uint8Array.from(atob(p.data),c=>c.charCodeAt(0));
          if(bytes[0] !== 255 || bytes[1] !== 216) fail("Format de photo invalide.", "Invalid photo format.");
          return new File([bytes],`native-${i}.jpg`,{type:"image/jpeg"});
        });
        check();
        const uploaded = files.length ? await SB.uploadPhotos(files, null, user.id) : {full:[],thumbs:[]};
        check();
        if(uploaded.full.length !== files.length) fail("Les photos n’ont pas toutes été transférées. Le brouillon est conservé.", "Some photos could not be uploaded. Your draft is kept.");
        const price = fields.price ? amount : 0;
        const value = {t:title,cat:d.category,sub:d.subcategory || "",area:d.area,side:AREAS.nl.includes(d.area)?"nl":"fr",
          cur:d.currency,eur:d.currency==="eur"?price:Math.round(price*.92),usd:d.currency==="usd"?price:Math.round(price*1.08),
          cond:fields.condition?d.condition:"",desc:description,photos:uploaded.full,thumbPhotos:uploaded.thumbs,
          sellerName:state.user.name,sellerPhone:String(d.phone || "").slice(0,40),pro:hasActiveProSubscription(state.user),
          noPrice:!fields.price,salary:d.category === "job" && !(price > 0),
          urgent:fields.urgent && !!d.urgent,feat:true,negotiable:false,
          vehicle:fields.vehicle?{year:d.year || "",km:fields.mileage?d.km:"",color:fields.mileage?d.color:"",fuel:d.fuel || "gas",transmission:d.transmission || "automatic"}:null};
        writeStarted = true;
        const saved = await SB.insertListing(value, user.id);
        check();
        if(!saved) fail("Publication non confirmée. Vérifiez vos annonces dans Profil avant de réessayer. Le brouillon est conservé.", "Publication not confirmed. Check your listings in Profile before retrying. Your draft is kept.","UNCERTAIN_WRITE");
        if(!L.some(l=>String(l.id)===String(saved.id))) L.unshift(saved);
        if(!userListings.some(l=>String(l.id)===String(saved.id))) userListings.unshift(saved);
        try { render(); } catch (_) { /* The confirmed write must remain confirmed. */ }
        data = {id:String(saved.id)};
      } else if(action === "inbox") {
        if(await SB.fetchBlocks() === null) fail("Impossible de charger les conversations.","Could not load conversations.");
        check();
        const threads = await SB.fetchInbox(); check();
        if(threads === null) fail("Impossible de charger les conversations.","Could not load conversations.");
        if(typeof refreshMessageBadge === "function") await refreshMessageBadge(threads);
        check();
        data = threads.map(t=>({key:t.key,listingId:t.listingId == null ? null : String(t.listingId),otherId:t.otherId,
          otherName:t.otherName || text("Membre SXM","SXM member"),title:L.find(l=>String(l.id)===String(t.listingId))?.t || text("Conversation","Conversation"),
          lastBody:t.lastBody || "",lastAt:t.lastAt,unread:t.unread}));
      } else if(action === "contact") {
        const l = await listing(payload.listingId); check();
        if(l.seller_id === user.id) fail("C’est votre annonce.","This is your listing.");
        data = {key:String(l.id)+":"+l.seller_id,listingId:String(l.id),otherId:l.seller_id,
          otherName:l.seller_name || text("Vendeur","Seller"),title:l.title,lastBody:"",lastAt:null,unread:0};
      } else if(action === "thread") {
        if(!validUser(payload.otherId) || payload.otherId === user.id || (payload.listingId != null && !validID(payload.listingId))) fail("Conversation invalide.","Invalid conversation.");
        const blocks = await SB.fetchBlocks(); check();
        if(blocks === null || blocks.some(b=>b.id === payload.otherId)) fail("Conversation indisponible.","Conversation unavailable.");
        let q = db.from("messages").select("*").or(`and(sender_id.eq.${user.id},recipient_id.eq.${payload.otherId}),and(sender_id.eq.${payload.otherId},recipient_id.eq.${user.id})`);
        q = payload.listingId == null ? q.is("listing_id",null) : q.eq("listing_id",payload.listingId);
        if(payload.before) {
          if(!/^\d{4}-\d\d-\d\dT[0-9:.+-]+Z?$/.test(payload.before.at) || !validID(payload.before.id)) fail("Page invalide.","Invalid page.");
          q=q.or(`created_at.lt.${payload.before.at},and(created_at.eq.${payload.before.at},id.lt.${payload.before.id})`);
        }
        const r = await q.order("created_at",{ascending:false}).order("id",{ascending:false}).limit(50); check();
        if(r.error) fail("Impossible de charger les messages.","Could not load messages.");
        data = {messages:(r.data || []).reverse().map(message),hasMore:r.data?.length === 50};
        // The server verifies recipients; update badges only for confirmed reads.
        let marked = 0;
        for(const m of (r.data || [])) {check(); if(m.recipient_id===user.id && !m.read && await SB.markMessageRead(m.id)) marked++;}
        check();
        if(marked && typeof refreshMessageBadge === "function") refreshMessageBadge().catch(()=>{});
      } else if(action === "send") {
        const body=String(payload.body || "").trim();
        if(!body || body.length>4000 || !validUser(payload.otherId) || payload.otherId===user.id || (payload.listingId != null && !validID(payload.listingId))) fail("Message invalide (4 000 caractères maximum).","Invalid message (maximum 4,000 characters).");
        if(payload.listingId != null) {
          const l=await listing(payload.listingId);check();
          if(![user.id,payload.otherId].includes(l.seller_id)) fail("Destinataire invalide.","Invalid recipient.");
        }
        writeStarted = true;
        const sent=await SB.sendMessage({listingId:payload.listingId,recipientId:payload.otherId,body,senderName:state.user.name,expectedUserId:user.id});check();
        if(sent?.error_code) fail("Limite de messages gratuits atteinte. Consultez votre profil.","Free message limit reached. Check your profile.");
        if(!sent?.id) fail("Envoi non confirmé. Actualisez la conversation avant de réessayer.","Send not confirmed. Refresh the conversation before retrying.","UNCERTAIN_WRITE");
        data=message(sent);
      } else if(action === "block") {
        if(!validUser(payload.otherId) || payload.otherId === user.id || !await SB.blockUser(payload.otherId,payload.name,user.id)) fail("Blocage non confirmé.","Block not confirmed.");
        check();data={done:true};
      } else if(action === "report") {
        if(!validID(payload.listingId) || !await SB.createReport(payload.listingId,"Inappropriate content",String(payload.notes || "").slice(0,2000),user.id)) fail("Signalement non confirmé.","Report not confirmed.");
        check();data={done:true};
      } else fail("Action inconnue.","Unknown action.");
      return {ok:true,data};
    } catch(e) { return {ok:false,error:writeStarted && !e.code ? text("Enregistrement non confirmé. Vérifiez votre profil ou la conversation avant de réessayer.","Save not confirmed. Check your profile or conversation before retrying.") : e.message || text("Service indisponible.","Service unavailable."),code:e.code || (writeStarted ? "UNCERTAIN_WRITE" : "REQUEST_FAILED")}; }
    finally {if(claimed) locks.delete(lock);}
  }
  window.SXMNativeWorkflows = {request:async(action,payload)=>{
    let timer;
    try { return await Promise.race([request(action,payload), new Promise(resolve=>{
      timer=setTimeout(()=>resolve({ok:false,code:["publish","send"].includes(action)?"UNCERTAIN_WRITE":"REQUEST_FAILED",
        error:text("Délai dépassé. Vérifiez votre profil ou la conversation avant de réessayer.","Request timed out. Check your profile or conversation before retrying.")}),action === "publish"?120000:30000);
    })]); } finally { clearTimeout(timer); }
  }};
  if(window.SXMNativeInfo?.nativeWorkflows && window.db) {
    db.auth.onAuthStateChange((_event,session)=>{
      const userId=session?.user?.id || null;
      setTimeout(()=>{
        const p=Capacitor.Plugins?.SXMNative || Capacitor.registerPlugin("SXMNative");
        p.workflowIdentity({userId}).catch(()=>{});
      },0);
    });
  }
})();
