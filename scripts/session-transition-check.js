const assert = require('node:assert/strict');
const { chromium } = require('playwright');

// Local fixtures only; no authenticated requests or production writes.
(async () => {
  const browser = await chromium.launch();
  const failures = [];
  try {
    for (const route of ['/', '/marketplace.html']) {
      const context = await browser.newContext({ serviceWorkers: 'block' });
      const page = await context.newPage();
      await page.goto('http://127.0.0.1:5173' + route + '?local=1');
      const results = await page.evaluate(async () => {
        const results = [];
        const check = (name, ok) => results.push({ name, ok: !!ok });
        state.lang = 'en';
        state.user = normalizeUser({ id: 'qa-transitions', name: 'QA Seller', provider: 'supabase' });
        window.SB = { enabled: () => true };
        inboxConvs = ['a', 'b'].map(key => ({ key, listingId: key, otherId: key,
          who: key, title: key, messages: [], unread: 0, real: true }));
        await openInboxThread('a');
        const input = document.getElementById('msgrInput');
        input.value = 'Private draft for A';
        await openInboxThread('b');
        check('switching recipients starts with their own draft', input.value === '');
        input.value = 'Draft for B';
        await openInboxThread('a');
        check('returning to a recipient restores the draft', input.value === 'Private draft for A');
        let finish;
        SB.sendMessage = () => new Promise(resolve => { finish = resolve; });
        input.value = 'Same words';
        const sending = sendInboxMessage();
        await openInboxThread('b');
        input.value = 'Same words';
        finish({ id: 'sent-a', body: 'Same words', sender_id: state.user.id, created_at: new Date().toISOString() });
        await sending;
        check('late send never clears another recipient draft', input.value === 'Same words');
        await openInboxThread('a');
        check('confirmed send clears the original draft', input.value === '');
        input.value = 'Private account draft';
        clearAccountMessaging();
        check('account cleanup clears the composer', input.value === '');
        inboxConvs = [{ key: 'b', who: 'b', title: 'b', messages: [], unread: 0 }];
        await openInboxThread('b');
        check('account cleanup clears saved conversation drafts', input.value === '');

        profileEditOpen = true;
        renderProfile();
        document.getElementById('pfEditName').value = 'Updated Seller';
        SB.upsertProfile = async () => ({ name: 'Updated Seller' });
        let finishSellerUpdate;
        SB.refreshOwnListingSellerName = () => new Promise(resolve => { finishSellerUpdate = resolve; });
        const saving = saveProfileEdit({ preventDefault() {}, target: document.querySelector('#pfEditName').closest('form') });
        await Promise.resolve();
        state.user = null;
        finishSellerUpdate();
        let thrown = false;
        try { await saving; } catch (_) { thrown = true; }
        check('logout during seller-name sync does not crash or restore profile', !thrown && state.user === null);

        // Hold browser traversal pending to reproduce a fast close/reopen.
        await new Promise(resolve => setTimeout(resolve, 50));
        const originalBack = history.back.bind(history);
        const originalPush = history.pushState.bind(history);
        let pushes = 0;
        history.back = () => {};
        history.pushState = (...args) => { pushes++; originalPush(...args); };
        openModal('boostModal');
        closeModal('boostModal');
        await new Promise(resolve => setTimeout(resolve, 10));
        const before = pushes;
        openModal('accountModal');
        check('reopening during pending Back does not push onto an obsolete entry', pushes === before);
        closeModal('accountModal');
        const listing = L[0];
        openListing(listing.id);
        history.back = originalBack;
        history.pushState = originalPush;
        await new Promise(resolve => {
          window.addEventListener('popstate', resolve, { once: true });
          originalBack();
        });
        check('pending Back restores the reopened listing URL and history entry',
          overlayHistory === 1 && overlayPopGuard === 0 && history.state?.bstOverlay &&
          new URLSearchParams(location.search).get('listing') === String(listing.id));
        await new Promise(resolve => {
          window.addEventListener('popstate', resolve, { once: true });
          originalBack();
        });
        check('next Back closes the listing without leaving the app',
          !document.querySelector('#detailModal.open') && typeof openListing === 'function' &&
          location.search.includes('local=1'));
        return results;
      });
      failures.push(...results.filter(r => !r.ok).map(r => route + ': ' + r.name));
      console.log(route, JSON.stringify(results));
      await context.close();
    }
    assert.deepEqual(failures, []);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
