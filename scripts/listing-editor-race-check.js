const assert = require('node:assert/strict');
const { chromium } = require('playwright');

// Isolated local fixtures: no real uploads, accounts, or listing writes.
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
        const photo = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
        const setup = () => {
          state.lang = 'en';
          state.user = normalizeUser({ id: 'qa-editor', name: 'Editor', provider: 'supabase' });
          const listing = { id: 'qa-edit', ownerId: state.user.id, sellerId: state.user.id,
            t: 'Original', cat: 'elec', sub: 'phones', area: 'Marigot', side: 'fr',
            cur: 'usd', usd: 10, eur: 9, price: 10, cond: 'bon', desc: 'Description',
            photos: [photo, photo], thumbPhotos: ['thumb-a', 'thumb-b'] };
          L.splice(0, L.length, listing); userListings = [listing];
          window.SB = { enabled: () => true, updateListing: async l => l };
          openEditListing(listing.id);
          return listing;
        };
        const submit = () => createListing({ preventDefault() {}, target: document.getElementById('postForm') });

        setup();
        removePostPhoto(0);
        let saved;
        SB.updateListing = async l => { saved = l; return null; };
        await submit();
        check('removing first photo also removes its thumbnail', saved?.thumbPhotos?.length === 1 && saved.thumbPhotos[0] === 'thumb-b');

        setup();
        let finishUpload;
        window.ImgUtils = { compressMany: () => new Promise(resolve => { finishUpload = resolve; }) };
        const picking = handlePhotoUpload({ target: { files: [new File(['x'], 'a.jpg', { type: 'image/jpeg' })] } });
        buildPostForm({ t: 'New form', photos: [photo] });
        finishUpload([{ file: new File(['x'], 'a.jpg'), thumbFile: null, dataUrl: 'stale-photo' }]);
        await picking;
        check('late photo compression does not overwrite a newer form', selectedPostPhotos[0] === photo && selectedPostFiles.length === 0);

        setup();
        const compressions = [];
        ImgUtils.compressMany = () => new Promise(resolve => compressions.push(resolve));
        const photoEvent = { target: { files: [new File(['x'], 'a.jpg', { type: 'image/jpeg' })] } };
        const firstSelection = handlePhotoUpload(photoEvent);
        const secondSelection = handlePhotoUpload(photoEvent);
        compressions[1]([{ file: new File(['new'], 'new.jpg'), thumbFile: null, dataUrl: photo }]);
        await secondSelection;
        compressions[0]([{ file: new File(['old'], 'old.jpg'), thumbFile: null, dataUrl: 'old-selection' }]);
        await firstSelection;
        check('latest photo selection wins even when compression finishes out of order', selectedPostFiles[0]?.name === 'new.jpg' && selectedPostPhotos[0] === photo);

        setup();
        let finishSave;
        const pending = [];
        let writes = 0;
        SB.updateListing = () => { writes++; return new Promise(resolve => { pending.push(resolve); }); };
        const saving = submit();
        const duplicate = submit();
        check('repeated submit makes one backend write', writes === 1);
        pending.forEach(resolve => resolve(null));
        await Promise.all([saving, duplicate]);

        setup();
        let finishPhotos;
        selectedPostFiles = [new File(['x'], 'a.jpg')];
        SB.uploadPhotos = () => new Promise(resolve => { finishPhotos = resolve; });
        let crossAccountWrites = 0;
        SB.updateListing = async l => { crossAccountWrites++; return l; };
        const uploading = submit();
        state.user = normalizeUser({ id: 'another-account', provider: 'supabase' });
        clearAccountMessaging();
        finishPhotos({ full: ['uploaded-photo'], thumbs: ['uploaded-thumb'] });
        await uploading;
        check('account change during upload prevents subsequent listing write', crossAccountWrites === 0);

        setup();
        SB.updateListing = () => new Promise(resolve => { finishSave = resolve; });
        const oldSave = submit();
        buildPostForm({ t: 'New draft', photos: [photo], desc: 'Keep my draft' });
        finishSave({ id: 'qa-edit', t: 'Saved old form' });
        await oldSave;
        check('late save preserves newly opened form', document.getElementById('newTitle').value === 'New draft' && selectedPostPhotos.length === 1);

        setup();
        let finishDraft;
        window.Drafts = { load: () => new Promise(resolve => { finishDraft = resolve; }), dataUrlToFile: async () => new File(['x'], 'draft.jpg') };
        const restoring = restoreSavedDraft();
        buildPostForm({ t: 'Keep new form', photos: [photo] });
        finishDraft({ t: 'Old draft', photos: [photo] });
        await restoring;
        check('late draft restore cannot replace a newer form', document.getElementById('newTitle').value === 'Keep new form');

        setup();
        let finishConversion;
        Drafts.load = async () => ({ t: 'Draft', cat: 'elec', sub: 'phones', desc: 'Draft description', photos: [photo] });
        Drafts.dataUrlToFile = () => new Promise(resolve => { finishConversion = resolve; });
        const converting = restoreSavedDraft();
        await Promise.resolve();
        let prematureWrites = 0;
        SB.updateListing = async l => { prematureWrites++; return null; };
        await submit();
        check('submit waits for draft photos to be upload-ready', prematureWrites === 0);
        finishConversion(new File(['x'], 'draft.jpg'));
        await converting;
        check('restored draft has upload files ready on completion', selectedPostFiles.length === 1);

        setup();
        Drafts.load = async () => ({ t: 'Broken draft', photos: [photo] });
        Drafts.dataUrlToFile = async () => null;
        await restoreSavedDraft();
        check('failed draft photo conversion preserves current form and unlocks retry', document.getElementById('newTitle').value === 'Original' && !postPhotosPending);

        setup();
        selectedPostFiles = [new File(['x'], 'snapshot.jpg')];
        SB.uploadPhotos = () => new Promise(resolve => { finishPhotos = resolve; });
        let snapshotSaved;
        SB.updateListing = async l => { snapshotSaved = l; return null; };
        const snapshotSave = submit();
        removePostPhoto(0);
        finishPhotos({ full: ['snapshot-upload'], thumbs: ['snapshot-thumb'] });
        await snapshotSave;
        check('upload validation uses submitted file snapshot', snapshotSaved?.photos[0] === 'snapshot-upload');

        setup();
        SB.updateListing = () => new Promise(resolve => { finishSave = resolve; });
        const logoutSave = submit();
        state.user = null;
        clearAccountMessaging();
        finishSave({ id: 'qa-edit', t: 'Old account result' });
        await logoutSave;
        check('late save after logout does not project old account result', L[0].t === 'Original');

        setup();
        editingListingId = null;
        state.user = null;
        let signedOutCrash = false;
        try { await submit(); } catch (_) { signedOutCrash = true; }
        check('signed-out submit is safely rejected', !signedOutCrash);
        return results;
      });
      console.log(route, JSON.stringify(results));
      failures.push(...results.filter(r => !r.pass).map(r => route + ': ' + r.name));
      await context.close();
    }
    assert.deepEqual(failures, []);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
