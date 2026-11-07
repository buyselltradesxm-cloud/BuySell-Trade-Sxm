/* Buy Sell Trade Sxm — offline draft store for the "post a listing" flow.
 *
 * Shared by index.html and marketplace.html. Backed by IndexedDB (not
 * localStorage — a draft carries up to 8 compressed photos, ~1–2 MB, which
 * would blow the ~5 MB localStorage budget the rest of the app already uses).
 *
 * One record, key "postDraft". Everything degrades to a silent no-op if
 * IndexedDB is unavailable (private mode, old browser, blocked storage).
 *
 *   Drafts.save(obj)        -> Promise<boolean>
 *   Drafts.load()           -> Promise<object|null>
 *   Drafts.peek()           -> Promise<{savedAt:number}|null>   (cheap-ish meta)
 *   Drafts.clear()          -> Promise<void>
 *   Drafts.dataUrlToFile(u, name) -> Promise<File|null>
 *   Drafts.enabled          -> boolean
 */
(function () {
  'use strict';

  var DB_NAME = 'bst';
  var STORE = 'kv';
  var KEY = 'postDraft';
  var VERSION = 1;

  var supported = typeof indexedDB !== 'undefined';
  var dbPromise = null;

  function openDb() {
    if (!supported) return Promise.reject(new Error('no indexedDB'));
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      var req;
      try { req = indexedDB.open(DB_NAME, VERSION); }
      catch (e) { reject(e); return; }
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error('open failed')); };
      req.onblocked = function () { reject(new Error('open blocked')); };
    }).catch(function (e) {
      dbPromise = null;            // allow a later retry
      throw e;
    });
    return dbPromise;
  }

  function tx(mode, fn) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(STORE, mode);
        var store = t.objectStore(STORE);
        var out;
        try { out = fn(store); } catch (e) { reject(e); return; }
        t.oncomplete = function () { resolve(out && out.result !== undefined ? out.result : undefined); };
        t.onerror = function () { reject(t.error || new Error('tx failed')); };
        t.onabort = function () { reject(t.error || new Error('tx aborted')); };
      });
    });
  }

  // `key` is optional: the Studio Pro keeps its own draft beside "postDraft".
  function save(obj, key) {
    if (!obj) return Promise.resolve(false);
    var record = Object.assign({ savedAt: Date.now() }, obj);
    return tx('readwrite', function (s) { return s.put(record, key || KEY); })
      .then(function () { return true; })
      .catch(function (e) { console.warn('[drafts] save failed:', e); return false; });
  }

  function load(key) {
    return tx('readonly', function (s) { return s.get(key || KEY); })
      .then(function (v) { return v || null; })
      .catch(function (e) { console.warn('[drafts] load failed:', e); return null; });
  }

  function peek(key) {
    return load(key).then(function (d) { return d ? { savedAt: d.savedAt || 0 } : null; });
  }

  function clear(key) {
    return tx('readwrite', function (s) { return s.delete(key || KEY); })
      .then(function () {})
      .catch(function (e) { console.warn('[drafts] clear failed:', e); });
  }

  // data: URL -> File. Used to rebuild upload-ready File objects on restore so
  // photos still go to Storage rather than being inlined as base64 in the row.
  function dataUrlToFile(dataUrl, name) {
    if (typeof dataUrl !== 'string' || dataUrl.indexOf('data:') !== 0) return Promise.resolve(null);
    return fetch(dataUrl)
      .then(function (r) { return r.blob(); })
      .then(function (blob) {
        return new File([blob], name || 'photo.jpg', { type: blob.type || 'image/jpeg', lastModified: Date.now() });
      })
      .catch(function () {
        try {
          var parts = dataUrl.split(',');
          var mime = (parts[0].match(/data:([^;]+)/) || [])[1] || 'image/jpeg';
          var bin = atob(parts[1]);
          var arr = new Uint8Array(bin.length);
          for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          return new File([arr], name || 'photo.jpg', { type: mime, lastModified: Date.now() });
        } catch (e) { return null; }
      });
  }

  window.Drafts = {
    enabled: supported,
    save: save,
    load: load,
    peek: peek,
    clear: clear,
    dataUrlToFile: dataUrlToFile
  };
})();
