(function () {
  if (window.__amjHeader) return; window.__amjHeader = 1;
  function q(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function pad() {
    var h = document.querySelector('[data-amj-header]');
    if (!h) return;
    var next = h.nextElementSibling;
    if (!next) return;
    if (next.hasAttribute && next.hasAttribute('data-amj-hero')) { next.style.paddingTop = ''; return; }
    var need = Math.ceil(h.getBoundingClientRect().height) + 12;
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
})();
