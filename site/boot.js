/* boot.js — client runtime: hydrate the prerendered DC tree with self-hosted React,
   then apply the original sticky-header script and fidelity-safe image hints.
   No CDN, no Babel. */
(function () {
  "use strict";
  function b64decodeUtf8(s) {
    var bin = atob(s);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder("utf-8").decode(bytes);
  }

  function hydrate() {
    var root = document.getElementById("dc-root");
    var tplEl = document.getElementById("dc-template");
    var logicEl = document.getElementById("dc-logic");
    if (!root || !tplEl || !logicEl || !window.DCCORE || !window.React || !window.ReactDOM) return;

    var template = b64decodeUtf8(tplEl.textContent.trim());
    var logicSrc = b64decodeUtf8(logicEl.textContent.trim());

    // Client pseudo-sheet: inject :hover rules into a stylesheet (real CSS).
    var styleEl = document.createElement("style");
    styleEl.id = "dc-pseudo-client";
    document.head.appendChild(styleEl);
    var sheetText = "";
    var sink = function (rule) { sheetText += rule + "\n"; styleEl.textContent = sheetText; };

    var Comp = window.DCCORE.buildComponent({
      template: template,
      logicSrc: logicSrc,
      defaultProps: {},
      pseudoSink: sink
    });

    try {
      window.ReactDOM.hydrateRoot(root, window.React.createElement(Comp));
    } catch (e) {
      // Fall back to a fresh client render if hydration cannot reconcile.
      console.warn("[amj] hydrate fallback:", e);
      var r = window.ReactDOM.createRoot(root);
      r.render(window.React.createElement(Comp));
    }

    enhanceImages(root);
  }

  // Fidelity-safe image hints: lazy/eager + async decoding, no markup change.
  function enhanceImages(root) {
    var isHome = location.pathname === "/" || location.pathname === "/index.html";
    var run = function () {
      var imgs = root.querySelectorAll("img");
      for (var i = 0; i < imgs.length; i++) {
        var img = imgs[i];
        if (img.getAttribute("data-amj-opt")) continue;
        img.setAttribute("data-amj-opt", "1");
        var inHero = !!img.closest("[data-amj-hero]");
        if (isHome && inHero) {
          img.setAttribute("loading", "eager");
          img.setAttribute("fetchpriority", "high");
        } else {
          img.setAttribute("loading", "lazy");
        }
        img.setAttribute("decoding", "async");
      }
    };
    run();
    // re-apply after React commits (data-driven galleries mount later)
    setTimeout(run, 300);
    setTimeout(run, 1200);
  }

  /* ---- original header.js behaviour (sticky pad + nav hover rule) ---- */
  function initHeader() {
    if (window.__amjHeader) return; window.__amjHeader = 1;
    function q(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
    function pad() {
      var hh = document.querySelector('[data-amj-header]');
      if (!hh) return;
      var next = hh.nextElementSibling;
      if (!next) return;
      if (next.hasAttribute && next.hasAttribute('data-amj-hero')) { next.style.paddingTop = ''; return; }
      var need = Math.ceil(hh.getBoundingClientRect().height) + 12;
      if (!next.dataset.amjBase) next.dataset.amjBase = String(Math.round(parseFloat(getComputedStyle(next).paddingTop) || 0));
      if ((parseFloat(next.dataset.amjBase) || 0) < need) next.style.paddingTop = need + 'px';
    }
    document.addEventListener('pointerover', function (e) {
      var a = e.target.closest && e.target.closest('[data-amj-nav] a[data-nav]');
      q('[data-amj-nav] a[data-nav]').forEach(function (n) {
        var r = n.querySelector('[data-amj-rule]');
        if (r) r.style.transform = (n === a) ? 'scaleX(1)' : 'scaleX(0)';
      });
    });
    window.addEventListener('resize', pad);
    var tick = setInterval(function () { if (document.querySelector('[data-amj-header]')) { clearInterval(tick); pad(); setTimeout(pad, 500); } }, 120);
  }

  function start() { hydrate(); initHeader(); }
  if (document.readyState !== "loading") start();
  else document.addEventListener("DOMContentLoaded", start);
})();
