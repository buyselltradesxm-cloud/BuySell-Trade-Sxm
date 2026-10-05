const assert = require('node:assert/strict');
const { chromium } = require('playwright');

// Isolated local fixtures only: no production messages, reports or accounts.
(async () => {
  const browser = await chromium.launch();
  const failures = [];
  try {
    for (const route of ['/', '/marketplace.html']) {
      const context = await browser.newContext({ serviceWorkers: 'block' });
      const page = await context.newPage();
      page.on('pageerror', error => failures.push(`${route}: ${error.message}`));
      await page.goto(`http://127.0.0.1:5173${route}?local=1`);
      const results = await page.evaluate(async () => {
        const results = [];
        const api = window.SB;
        const record = (name, pass) => results.push({ name, pass: !!pass });
        const setup = mode => {
          state.lang = 'en';
          state.user = normalizeUser({ id: 'qa-chat-user', name: 'QA', provider: 'supabase' });
          notifications = [];
          blockedUsers = [];
          Object.keys(chatThreads).forEach(key => delete chatThreads[key]);
          L.length = 0;
          L.push({ id: 'qa-chat-listing', sellerId: 'qa-other', ownerId: 'qa-other', seller: 'Other',
            t: 'QA chat', cat: 'elec', area: 'Marigot', cur: 'usd', usd: 10, eur: 9, ph: 1 });
          const failed = async () => { if (mode === 'throw') throw new Error('QA network failure'); return mode === 'false' ? false : null; };
          window.SB = { enabled: () => mode !== 'offline', sendMessage: failed, createReport: failed };
          inboxConvs = [{ key: 'qa-chat-listing:qa-other', listingId: 'qa-chat-listing', otherId: 'qa-other',
            who: 'Other', title: 'QA chat', messages: [], unread: 0, real: true }];
          activeConvKey = inboxConvs[0].key;
          setUnreadMessageCount(0);
          document.getElementById('msgrInput').value = 'Keep my unsent message';
          document.getElementById('toast').textContent = '';
        };
        for (const mode of ['null', 'false', 'throw', 'offline']) {
          setup(mode);
          try { await sendInboxMessage(); } catch (_) { record(`send/${mode}: caught network error`, false); }
          record(`send/${mode}: preserve draft, no fake message`, document.getElementById('msgrInput').value === 'Keep my unsent message' && inboxConvs[0].messages.length === 0);
          record(`send/${mode}: show failure`, /not confirmed/i.test(document.getElementById('toast').textContent));
          setup(mode);
          const detailInput = document.createElement('input');
          detailInput.id = 'chatInput-qa-chat-listing';
          detailInput.value = 'Unsent detail message';
          document.body.appendChild(detailInput);
          await sendListingMessage('qa-chat-listing');
          record(`detail-send/${mode}: no fake local reply`, detailInput.value === 'Unsent detail message' && !(chatThreads['qa-chat-listing']?.messages.length));
          detailInput.remove();
          setup(mode);
          try { await quickChatAction('qa-chat-listing', 'report'); } catch (_) { record(`report/${mode}: caught network error`, false); }
          record(`report/${mode}: no false success`, /not confirmed|could not/i.test(document.getElementById('toast').textContent));
        }
        setup('success');
        SB.sendMessage = async opts => ({ id: 'sent-1', sender_id: state.user.id, recipient_id: opts.recipientId, body: opts.body, created_at: new Date().toISOString() });
        await sendInboxMessage();
        record('send/success: confirmed message only', inboxConvs[0].messages.length === 1 && document.getElementById('msgrInput').value === '');
        SB.createReport = async () => ({ id: 'report-1' });
        await quickChatAction('qa-chat-listing', 'report');
        record('report/success: confirmed report', document.getElementById('toast').textContent === t().reportSent);
        setup('success');
        let release, calls = 0;
        SB.sendMessage = opts => { calls++; return new Promise(resolve=>{release=()=>resolve({id:'in-flight',sender_id:state.user.id,body:opts.body,created_at:new Date().toISOString()});}); };
        const first = sendInboxMessage();
        await sendInboxMessage();
        document.getElementById('msgrInput').value = 'Next draft';
        release();
        await first;
        record('send/concurrent: one request and preserve new draft', calls === 1 && inboxConvs[0].messages.length === 1 && document.getElementById('msgrInput').value === 'Next draft');
        setup('success');
        SB.markMessageRead = async () => true;
        openModal('messagesModal');
        const msg = { id: 'incoming-1', listing_id: 'qa-chat-listing', sender_id: 'qa-other',
          recipient_id: state.user.id, sender_name: 'Other', body: 'Incoming', read: false, created_at: new Date().toISOString() };
        await handleIncomingMessage(msg);
        record('realtime/open: confirmed read has no unread badge', unreadMessageCount === 0 && inboxConvs[0].unread === 0 && inboxConvs[0].messages[0].read);
        await handleIncomingMessage({...msg});
        record('realtime/duplicate: append once', inboxConvs[0].messages.length === 1 && unreadMessageCount === 0);
        SB.markMessageRead = async () => false;
        await handleIncomingMessage({...msg, id:'incoming-2'});
        record('realtime/read-failure: retain unread', unreadMessageCount === 1 && inboxConvs[0].unread === 1 && !inboxConvs[0].messages[1].read);
        blockedUsers = [{id:'qa-other'}];
        await handleIncomingMessage({...msg, id:'incoming-blocked'});
        record('realtime/blocked: ignore delivery', inboxConvs[0].messages.length === 2 && unreadMessageCount === 1);
        blockedUsers = [];
        closeModal('messagesModal');
        await handleIncomingMessage({...msg, id:'incoming-closed'});
        record('realtime/closed: increment unread once', inboxConvs[0].messages.length === 3 && unreadMessageCount === 2 && notifications.some(n=>n.kind === 'message'));
        await handleIncomingMessage({...msg, id:'incoming-closed'});
        record('realtime/closed-duplicate: no second unread', unreadMessageCount === 2);
        const kept = inboxConvs;
        SB.fetchInbox = async () => { throw new Error('QA offline'); };
        await loadInbox();
        record('inbox/fetch-failure: preserve previous conversations', inboxConvs === kept);
        chatThreads['qa-private'] = {messages:[{en:'Private message'}]};
        clearAccountMessaging();
        record('session/clear: remove previous account messages and badges', inboxConvs.length === 0 && !activeConvKey && unreadMessageCount === 0 && Object.keys(chatThreads).length === 0 && notifications.length === 0);
        for(const action of ['inbox','badge','notification']){
          setup('success');
          let finish;
          const pending = new Promise(resolve=>{finish=resolve;});
          SB.fetchInbox = ()=>pending;
          SB.fetchNotifications = ()=>pending;
          const loading = action === 'inbox' ? loadInbox() : action === 'badge' ? refreshMessageBadge() : refreshBackendNotifications();
          clearAccountMessaging();
          state.user = normalizeUser({id:'qa-new-user',provider:'supabase'});
          finish(action === 'notification' ? [{id:'old-notification',kind:'message',body:'Private old account'}] :
            [{key:'old-conversation',listingId:'qa-chat-listing',otherId:'qa-other',messages:[msg],unread:1}]);
          await loading;
          record('session/late-' + action + ': ignore previous account response', inboxConvs.length === 0 && notifications.length === 0 && unreadMessageCount === 0);
        }
        setup('success');
        let finishProfile;
        SB.fetchProfile = ()=>new Promise(resolve=>{finishProfile=resolve;});
        const applying = applySupabaseUser({id:state.user.id,email:'qa-old@example.com',user_metadata:{}});
        clearAccountMessaging();
        state.user = null;
        finishProfile({name:'Old account'});
        record('session/late-profile: do not restore signed-out identity', await applying === null && state.user === null);
        window.SB = api;
        const oldDb = window.db;
        const oldCurrentUser = api.currentUser;
        api.currentUser = async () => ({id:'qa-chat-user'});
        window.db = {rpc:async (_name, args) => {
          if(args.msg_id === 2) return {error:{message:'QA denied'}};
          if(args.msg_id === 3) throw new Error('QA network');
          return {data:null, error:null};
        }};
        const messages = [1,2,3].map(id=>({id,read:false,recipient_id:'qa-chat-user'}));
        const done = await api.markConversationRead(messages);
        record('adapter/partial-read: count only confirmed writes', done === 1 && messages[0].read && !messages[1].read && !messages[2].read);
        window.db = oldDb;
        api.currentUser = oldCurrentUser;
        return results;
      });
      failures.push(...results.filter(result => !result.pass).map(result => `${route}: ${result.name}`));
      console.log(`${route}: ${results.filter(result => result.pass).length}/${results.length} assertions passed`);
      await context.close();
    }
    assert.deepEqual(failures, []);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
