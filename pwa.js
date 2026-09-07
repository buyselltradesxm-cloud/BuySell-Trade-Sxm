/* Buy Sell Trade Sxm — PWA glue (service worker + install prompt)
 * Loaded from the <head> of index.html / marketplace.html with `defer`.
 * Self-contained: no dependency on the app's own scripts.
 */
(function () {
  'use strict';

  var SW_URL = '/sw.js';
  var DISMISS_KEY = 'bst_pwa_install_dismissed_at';
  var DISMISS_DAYS = 14; // re-offer install two weeks after a dismissal

  /* ------------------------------------------------------------------ *
   * 1. Register the service worker + auto-reload once on activation
   * ------------------------------------------------------------------ */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register(SW_URL, { scope: '/' })
        .then(function (reg) {
          // If an updated worker is found, ask it to take over right away.
          reg.addEventListener('updatefound', function () {
            var sw = reg.installing;
            if (!sw) return;
            sw.addEventListener('statechange', function () {
              if (sw.state === 'installed' && navigator.serviceWorker.controller) {
                sw.postMessage('SKIP_WAITING');
              }
            });
          });
        })
        .catch(function (err) { console.warn('[pwa] SW registration failed:', err); });

      var reloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        if (reloaded) return;
        reloaded = true;
        window.location.reload();
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * 2. Install prompt
   * ------------------------------------------------------------------ */
  var deferredPrompt = null;

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.indexOf('android-app://') === 0;
  }

  function recentlyDismissed() {
    try {
      var ts = parseInt(localStorage.getItem(DISMISS_KEY) || '0', 10);
      return ts && (Date.now() - ts) < DISMISS_DAYS * 864e5;
    } catch (e) { return false; }
  }

  function markDismissed() {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch (e) {}
  }

  function lang() {
    var l = (document.documentElement.lang || navigator.language || 'fr').toLowerCase();
    if (l.indexOf('en') === 0) return 'en';
    if (l.indexOf('nl') === 0) return 'nl';
    return 'fr';
  }

  var T = {
    fr: { cta: 'Installer l’app', hint: 'Ajoutez Buy Sell Trade Sxm à votre écran d’accueil.', close: 'Plus tard',
          ios: 'Pour installer : appuyez sur  ⬆︎  puis « Sur l’écran d’accueil ».' },
    en: { cta: 'Install the app', hint: 'Add Buy Sell Trade Sxm to your home screen.', close: 'Later',
          ios: 'To install: tap  ⬆︎  then “Add to Home Screen”.' },
    nl: { cta: 'App installeren', hint: 'Zet Buy Sell Trade Sxm op je startscherm.', close: 'Later',
          ios: 'Installeren: tik op  ⬆︎  en daarna “Zet op beginscherm”.' }
  };

  function t(k) { return (T[lang()] || T.fr)[k]; }

  function injectStyles() {
    if (document.getElementById('bst-pwa-style')) return;
    var css = document.createElement('style');
    css.id = 'bst-pwa-style';
    css.textContent =
      '#bst-pwa-banner{position:fixed;left:12px;right:12px;z-index:9999;' +
      'bottom:calc(12px + env(safe-area-inset-bottom, 0px));' +
      'max-width:460px;margin:0 auto;background:#fff;color:#132A2E;border:2px solid #132A2E;' +
      'border-radius:12px;padding:12px 14px;display:flex;align-items:center;gap:12px;' +
      'box-shadow:0 10px 30px rgba(19,42,46,.22);font-family:inherit;' +
      'animation:bst-pwa-in .25s ease}' +
      '@keyframes bst-pwa-in{from{transform:translateY(20px);opacity:0}to{transform:none;opacity:1}}' +
      '#bst-pwa-banner img{width:40px;height:40px;border-radius:9px;flex:0 0 auto}' +
      '#bst-pwa-banner .bst-pwa-txt{flex:1;min-width:0;font-size:13px;line-height:1.35}' +
      '#bst-pwa-banner .bst-pwa-txt b{display:block;font-size:14px;margin-bottom:1px}' +
      '#bst-pwa-banner button{font:inherit;cursor:pointer;border-radius:8px;white-space:nowrap}' +
      '#bst-pwa-banner .bst-pwa-go{background:#0B6E7F;color:#fff;border:none;font-weight:700;padding:9px 14px;font-size:13px}' +
      '#bst-pwa-banner .bst-pwa-x{background:none;border:none;color:#5C6B6A;font-size:12px;padding:6px 4px}' +
      '#bst-pwa-banner.bst-pwa-ios{display:block}#bst-pwa-banner.bst-pwa-ios .bst-pwa-row{display:flex;align-items:center;gap:12px}' +
      '#bst-pwa-banner .bst-pwa-iostip{font-size:12px;color:#5C6B6A;margin-top:8px}';
    document.head.appendChild(css);
  }

  function removeBanner() {
    var el = document.getElementById('bst-pwa-banner');
    if (el) el.remove();
  }

  function el(tag, props, text) {
    var node = document.createElement(tag);
    if (props) Object.keys(props).forEach(function (k) { node.setAttribute(k, props[k]); });
    if (text != null) node.textContent = text;
    return node;
  }

  // Built entirely with DOM APIs + textContent (no innerHTML) so there is no
  // HTML-injection sink here even though every string is a hardcoded literal.
  function showBanner(opts) {
    if (document.getElementById('bst-pwa-banner')) return;
    injectStyles();

    var wrap = el('div', { id: 'bst-pwa-banner' });
    if (opts.ios) wrap.className = 'bst-pwa-ios';

    var row = el('div', { class: 'bst-pwa-row' });
    row.appendChild(el('img', { src: '/icons/icon-192.png', alt: '' }));

    var txt = el('div', { class: 'bst-pwa-txt' });
    txt.appendChild(el('b', null, t('cta')));
    txt.appendChild(document.createTextNode(t('hint')));
    row.appendChild(txt);

    if (!opts.ios) {
      row.appendChild(el('button', { class: 'bst-pwa-go', type: 'button' }, t('cta')));
    }
    wrap.appendChild(row);

    if (opts.ios) {
      wrap.appendChild(el('div', { class: 'bst-pwa-iostip' }, t('ios')));
    }

    var closeRow = el('div', { style: 'text-align:right' });
    var xBtn = el('button', { class: 'bst-pwa-x', type: 'button' }, t('close'));
    closeRow.appendChild(xBtn);
    wrap.appendChild(closeRow);

    document.body.appendChild(wrap);

    xBtn.addEventListener('click', function () { markDismissed(); removeBanner(); });

    var goBtn = wrap.querySelector('.bst-pwa-go');
    if (goBtn) goBtn.addEventListener('click', function () {
      removeBanner();
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function (choice) {
        if (choice && choice.outcome !== 'accepted') markDismissed();
        deferredPrompt = null;
      });
    });
  }

  function isIos() {
    return /iP(hone|ad|od)/.test(navigator.platform) ||
      (/iPad|iPhone|iPod/.test(navigator.userAgent)) ||
      (navigator.userAgent.includes('Mac') && 'ontouchend' in document);
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    if (isStandalone() || recentlyDismissed()) return;
    // Give the app a moment to paint before covering part of the screen.
    setTimeout(function () { showBanner({ ios: false }); }, 2500);
  });

  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    removeBanner();
    try { localStorage.removeItem(DISMISS_KEY); } catch (e) {}
  });

  // iOS Safari never fires beforeinstallprompt — show a manual hint instead.
  document.addEventListener('DOMContentLoaded', function () {
    if (isIos() && !isStandalone() && !recentlyDismissed()) {
      setTimeout(function () { showBanner({ ios: true }); }, 3000);
    }
  });

  // Expose a hook so the app can trigger the prompt from its own UI later.
  window.bstPromptInstall = function () {
    if (deferredPrompt) { deferredPrompt.prompt(); return true; }
    if (isIos() && !isStandalone()) { showBanner({ ios: true }); return true; }
    return false;
  };
})();
