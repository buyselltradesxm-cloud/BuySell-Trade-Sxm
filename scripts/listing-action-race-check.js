const assert = require('node:assert/strict');
const { chromium } = require('playwright');

// Local fixtures only. No reports or listing writes reach the backend.
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
          state.user = normalizeUser({ id: 'owner-a', name: 'Owner', provider: 'supabase' });
          const listing = { id: 'owned', ownerId: 'owner-a', sellerId: 'owner-a', t: 'Original',
            cat: 'elec', area: 'Marigot', cur: 'usd', usd: 10, eur: 9, sold: false, status: 'active' };
          L.splice(0, L.length, listing); userListings = [listing];
          window.SB = { enabled: () => true };
          window.confirm = () => true;
          return listing;
        };
        for (const action of ['sold', 'renew', 'delete', 'remove']) {
          setup();
          let finish;
          const delayed = () => new Promise(resolve => { finish = resolve; });
          SB.updateListing = SB.confirmListingAvailable = SB.deleteListing = delayed;
          const pending = action === 'sold' ? setOwnListingSold('owned', true)
            : action === 'renew' ? confirmListingAvailable('owned')
            : action === 'delete' ? deleteOwnListing('owned') : markSoldAndRemove('owned');
          clearAccountMessaging();
          state.user = normalizeUser({ id: 'owner-b', provider: 'supabase' });
          state.favs.add('owned');
          const before = JSON.stringify({ L, userListings, favs: [...state.favs] });
          finish(action === 'sold' ? { sold: true, status: 'sold' } : action === 'renew' ? { status: 'active' } : true);
          await pending;
          check(action + ' completion does not mutate another account state', before === JSON.stringify({ L, userListings, favs: [...state.favs] }));
        }
        setup();
        const completions = [];
        SB.updateListing = () => new Promise(resolve => completions.push(resolve));
        const first = setOwnListingSold('owned', true);
        const second = setOwnListingSold('owned', false);
        check('conflicting listing actions cannot run concurrently', completions.length === 1);
        completions.forEach(resolve => resolve({ sold: true, status: 'sold' }));
        await Promise.all([first, second]);
        SB.updateListing = async () => ({ sold: false, status: 'active' });
        await setOwnListingSold('owned', false);
        check('listing action unlocks after completion', L[0].sold === false);
        SB.updateListing = async () => { throw new Error('Offline fixture'); };
        await setOwnListingSold('owned', true);
        check('failed action preserves listing status', L[0].sold === false);
        SB.updateListing = async () => ({ sold: true, status: 'sold' });
        await setOwnListingSold('owned', true);
        check('failed action releases lock for retry', L[0].sold === true);

        setup();
        const reports = [];
        SB.createReport = () => new Promise(resolve => reports.push(resolve));
        openReportModal('report-a');
        const form = document.querySelector('#reportBody form');
        const send = () => submitReport({ preventDefault() {}, target: form });
        const reportOne = send();
        const reportTwo = send();
        check('duplicate report submission makes only one request', reports.length === 1);
        openReportModal('report-b');
        document.getElementById('reportNotes').value = 'Keep this report';
        reports.forEach(resolve => resolve({ id: 'saved-report' }));
        await Promise.all([reportOne, reportTwo]);
        check('old report result preserves newer report form', reportingListingId === 'report-b' && document.querySelector('#reportModal.open') && document.getElementById('reportNotes').value === 'Keep this report');

        setup();
        let finishReport;
        SB.createReport = () => new Promise(resolve => { finishReport = resolve; });
        openReportModal('report-a');
        const oldReport = submitReport({ preventDefault() {}, target: document.querySelector('#reportBody form') });
        clearAccountMessaging();
        state.user = null;
        document.getElementById('toast').textContent = 'Current status';
        finishReport({ id: 'saved' });
        await oldReport;
        check('report completion after logout does not show stale success', document.getElementById('toast').textContent === 'Current status');

        setup();
        SB.createReport = async () => { throw new Error('Offline fixture'); };
        openReportModal('retry-report');
        const retryForm = document.querySelector('#reportBody form');
        document.getElementById('reportNotes').value = 'Preserve these details';
        await submitReport({ preventDefault() {}, target: retryForm });
        check('report failure preserves input and enables retry', document.getElementById('reportNotes').value === 'Preserve these details' && !retryForm.querySelector('button[type=submit]').disabled);
        SB.createReport = async () => ({ id: 'retry-success' });
        await submitReport({ preventDefault() {}, target: retryForm });
        check('report retry succeeds after a thrown failure', reportingListingId === null && !document.querySelector('#reportModal.open'));
        return results;
      });
      console.log(route, JSON.stringify(results));
      failures.push(...results.filter(r => !r.pass).map(r => route + ': ' + r.name));
      await context.close();
    }
    assert.deepEqual(failures, []);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
