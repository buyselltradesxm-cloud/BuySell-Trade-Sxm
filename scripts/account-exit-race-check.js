const assert = require('node:assert/strict');
const { chromium } = require('playwright');

// All account deletion, sign-out, and push operations are local stubs.
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
        const check = (name, pass) => results.push({ name, pass: !!pass });
        const setup = () => {
          state.lang = 'en';
          state.user = normalizeUser({ id: 'account-a', provider: 'supabase' });
          window.confirm = () => true;
          window.Push = { disable: async () => true };
          window.SB = { enabled: () => true, signOut: async () => ({}), deleteMyAccount: async () => ({ ok: true }) };
        };
        const switchAccount = (id = 'account-b') => {
          clearAccountMessaging();
          state.user = normalizeUser({ id, provider: 'supabase' });
          document.getElementById('toast').textContent = 'New session';
        };
        for (const action of ['logout', 'delete']) {
          for (const stage of action === 'logout' ? ['push', 'request'] : ['request', 'push', 'signout']) {
            setup();
            let finish;
            let reached;
            const started = new Promise(resolve => { reached = resolve; });
            const delayed = () => { reached(); return new Promise(resolve => { finish = resolve; }); };
            let signouts = 0;
            SB.signOut = async () => { signouts++; return {}; };
            if (stage === 'push') Push.disable = delayed;
            else if (action === 'delete' && stage === 'request') SB.deleteMyAccount = delayed;
            else SB.signOut = delayed;
            const pending = action === 'logout' ? logoutUser() : deleteMyAccountConfirmed();
            await started;
            switchAccount();
            finish(action === 'delete' && stage === 'request' ? { ok: true } : {});
            await pending;
            check(action + '/' + stage + ': newer account stays signed in', state.user?.id === 'account-b');
            check(action + '/' + stage + ': no stale notice', document.getElementById('toast').textContent === 'New session');
            if (stage === 'push' || (action === 'delete' && stage === 'request')) check(action + '/' + stage + ': no later signout for new account', signouts === 0);
          }
          setup();
          const finishes = [];
          let requests = 0;
          const delayed = () => { requests++; return new Promise(resolve => finishes.push(resolve)); };
          if (action === 'logout') SB.signOut = delayed; else SB.deleteMyAccount = delayed;
          const first = action === 'logout' ? logoutUser() : deleteMyAccountConfirmed();
          const second = action === 'logout' ? logoutUser() : deleteMyAccountConfirmed();
          await Promise.resolve(); await Promise.resolve();
          check(action + ': repeated clicks make one request', requests === 1);
          finishes.forEach(resolve => resolve({ error: 'Fixture failure' }));
          await Promise.all([first, second]);
          check(action + ': rejected request preserves account', state.user?.id === 'account-a');
          SB.signOut = async () => ({});
          SB.deleteMyAccount = async () => ({ ok: true });
          await (action === 'logout' ? logoutUser() : deleteMyAccountConfirmed());
          check(action + ': retry succeeds after failure', state.user === null);
        }
        setup();
        let finish;
        SB.signOut = () => new Promise(resolve => { finish = resolve; });
        const pending = logoutUser();
        await Promise.resolve();
        switchAccount('account-a');
        finish({});
        await pending;
        check('new session for same account survives an older logout result', state.user?.id === 'account-a');
        for (const action of ['logout', 'delete']) {
          setup();
          openModal('profileModal');
          SB.signOut = async () => {
            clearAccountMessaging();
            state.user = null;
            return {};
          };
          await (action === 'logout' ? logoutUser() : deleteMyAccountConfirmed());
          check(action + ': auth callback before response still closes profile', !document.querySelector('#profileModal.open') && state.user === null);
        }
        setup();
        let finishDeletion;
        let deletionStarted;
        const deletionReady = new Promise(resolve => { deletionStarted = resolve; });
        SB.deleteMyAccount = () => { deletionStarted(); return new Promise(resolve => { finishDeletion = resolve; }); };
        let signouts = 0;
        SB.signOut = async () => { signouts++; return {}; };
        const deleting = deleteMyAccountConfirmed();
        await deletionReady;
        await logoutUser();
        check('logout cannot overlap pending deletion', signouts === 0);
        finishDeletion({ error: 'Fixture failure' });
        await deleting;
        return results;
      });
      console.log(route, JSON.stringify(results));
      failures.push(...results.filter(r => !r.pass).map(r => route + ': ' + r.name));
      await context.close();
    }
    assert.deepEqual(failures, []);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
