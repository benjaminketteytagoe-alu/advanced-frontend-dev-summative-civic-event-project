/* =========================================================================
   CivicEvents+ — motion effects (CE.fx)
   Hand ported to jQuery + CSS from Pixel Perfect UI by Vansh Nagar
   (https://github.com/vansh-nagar/Pixel-Perfect · https://www.pixel-perfect.space, MIT).
   The originals are React + framer-motion; these versions use no extra
   libraries. The matching styles are in styles.css under "Pixel Perfect ports".

     star-border       → CSS only  (.star-border)
     crop-marks        → CSS only  (.crop-marks)
     focus-brackets    → CSS only  (.focus-brackets, .focus-brackets--reticle)
     milestone-odometer→ CE.fx.odometer($el, value, { key })
     success-ripple    → CE.fx.success()
     tilt-card-glare   → add class "tilt" to any card; handled by delegation

   Every effect is skipped or flattened when the visitor prefers reduced motion.
   Loaded after app.js and before components.js.
   ========================================================================= */
(function ($, CE) {
  'use strict';

  function reduced() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function finePointer() { return !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches); }

  /* -----------------------------------------------------------------------
     Odometer (port of "milestone-odometer")
     Each digit is a reel of 0–9 twice. Reels always roll forward to the
     new digit, the way a mechanical counter does, with a short stagger
     from left to right. The last value per `key` is remembered so live
     refreshes roll from the old number instead of from zero.
     ----------------------------------------------------------------------- */
  var lastValues = {};

  function reelHtml() {
    var h = '';
    for (var n = 0; n < 20; n++) h += '<span>' + (n % 10) + '</span>';
    return h;
  }

  function odometer($el, to, opts) {
    opts = opts || {};
    $el = $($el);
    if (!$el.length) return;
    to = Math.max(0, Math.round(CE.num(to)));
    var key = opts.key || $el.attr('data-odo-key');
    var first = !key || !(key in lastValues);
    var from = first ? 0 : lastValues[key];
    if (key) lastValues[key] = to;

    var label = to.toLocaleString();
    if (reduced()) { $el.text(label); return; }

    var chars = label.split('');
    var fromDigits = String(from).split('').map(Number);
    var digitCount = chars.filter(function (c) { return /\d/.test(c); }).length;
    // right-align the old digits against the new ones (9 → 10 works)
    while (fromDigits.length < digitCount) fromDigits.unshift(0);
    fromDigits = fromDigits.slice(-digitCount);

    var html = '<span class="sr-only">' + CE.esc(label) + '</span><span class="odo" aria-hidden="true">';
    var di = 0;
    chars.forEach(function (c) {
      if (/\d/.test(c)) {
        html += '<span class="odo-col"><span class="odo-reel" style="--i:' + di + '" data-from="' + fromDigits[di] + '" data-to="' + c + '">' + reelHtml() + '</span></span>';
        di++;
      } else html += '<span class="odo-sep">' + CE.esc(c) + '</span>';
    });
    $el.html(html + '</span>').addClass('is-odo');

    var $reels = $el.find('.odo-reel');
    $reels.each(function () {
      var f = Number(this.getAttribute('data-from'));
      this.style.transition = 'none';
      this.style.transform = 'translateY(' + (-f) + 'em)';
    });
    // force a layout pass so the start position is committed before rolling
    void $el[0].offsetHeight;
    $reels.each(function () {
      var f = Number(this.getAttribute('data-from')), t = Number(this.getAttribute('data-to'));
      var steps = (t - f + 10) % 10;
      if (first) steps += 10; // the first time a tile appears, every reel spins once
      if (!steps) return;
      var reel = this, target = f + steps;
      reel.style.transition = '';
      reel.style.transform = 'translateY(' + (-target) + 'em)';
      $(reel).one('transitionend', function () {
        // snap back into the first 0–9 so the next roll has room
        reel.style.transition = 'none';
        reel.style.transform = 'translateY(' + (-(target % 10)) + 'em)';
      });
    });
  }

  /* -----------------------------------------------------------------------
     Success ripple (port of "success-ripple-animation")
     A seal badge springs in with three expanding ripples, and the tick
     draws itself. It is decorative (aria-hidden); the toast that goes
     with it carries the message for screen readers.
     ----------------------------------------------------------------------- */
  var SEAL = 'M22.5909 4.37592C24.1565 2.21749 27.3733 2.21749 28.9389 4.37592V4.37592C30.0273 5.87644 32.0178 6.40978 33.7106 5.65449V5.65449C36.1457 4.56803 38.9315 6.17646 39.2082 8.82851V8.82851C39.4005 10.6722 40.8576 12.1293 42.7013 12.3216V12.3216C45.3533 12.5983 46.9618 15.3841 45.8753 17.8192V17.8192C45.12 19.512 45.6533 21.5025 47.1539 22.5909V22.5909C49.3123 24.1565 49.3123 27.3733 47.1539 28.9389V28.9389C45.6533 30.0273 45.12 32.0178 45.8753 33.7106V33.7106C46.9618 36.1457 45.3533 38.9315 42.7013 39.2082V39.2082C40.8576 39.4005 39.4005 40.8576 39.2082 42.7013V42.7013C38.9315 45.3533 36.1457 46.9618 33.7106 45.8753V45.8753C32.0178 45.12 30.0273 45.6533 28.9389 47.1539V47.1539C27.3733 49.3123 24.1565 49.3123 22.5909 47.1539V47.1539C21.5025 45.6533 19.512 45.12 17.8192 45.8753V45.8753C15.3841 46.9618 12.5983 45.3533 12.3216 42.7013V42.7013C12.1293 40.8576 10.6722 39.4005 8.82851 39.2082V39.2082C6.17646 38.9315 4.56803 36.1457 5.65449 33.7106V33.7106C6.40978 32.0178 5.87644 30.0273 4.37592 28.9389V28.9389C2.21749 27.3733 2.21749 24.1565 4.37592 22.5909V22.5909C5.87644 21.5025 6.40978 19.512 5.65449 17.8192V17.8192C4.56803 15.3841 6.17646 12.5983 8.82851 12.3216V12.3216C10.6722 12.1293 12.1293 10.6722 12.3216 8.82851V8.82851C12.5983 6.17646 15.3841 4.56803 17.8192 5.65449V5.65449C19.512 6.40978 21.5025 5.87644 22.5909 4.37592V4.37592Z';

  function success() {
    if (reduced()) return;
    $('.fx-success').remove();
    var $s = $('<div class="fx-success" aria-hidden="true">' +
      '<span class="fx-ripple" style="--i:0"></span><span class="fx-ripple" style="--i:1"></span><span class="fx-ripple" style="--i:2"></span>' +
      '<svg class="fx-seal" width="72" height="72" viewBox="0 0 52 52" fill="none"><path d="' + SEAL + '" fill="currentColor"/>' +
      '<path class="fx-tick" d="M33.77 20.26 22.77 31.26 17.77 26.26" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" pathLength="1"/></svg>' +
      '</div>').appendTo('body');
    setTimeout(function () { $s.addClass('is-leaving'); }, 1900);
    setTimeout(function () { $s.remove(); }, 2400);
  }

  /* -----------------------------------------------------------------------
     Tilt card with glare (port of "tilt-card-glare")
     Any element with class "tilt" leans toward the pointer (up to 7°, half
     the original's 14° so text stays readable), with a soft glare that
     follows the pointer. Delegated, so cards rendered later work too.
     Mouse and trackpad only; touch and reduced-motion get the normal lift.
     ----------------------------------------------------------------------- */
  var MAX_TILT = 7;
  function bindTilt() {
    if (!finePointer() || reduced()) return;
    var frame = null;
    $(document).on('pointermove.fx', '.tilt', function (e) {
      var el = this, ev = e.originalEvent || e;
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(function () {
        var r = el.getBoundingClientRect();
        var px = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width));
        var py = Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height));
        el.style.transitionDelay = '0ms'; // drop any scroll-reveal stagger once the card is in use
        el.style.setProperty('--rx', ((0.5 - py) * 2 * MAX_TILT).toFixed(2) + 'deg');
        el.style.setProperty('--ry', ((px - 0.5) * 2 * MAX_TILT).toFixed(2) + 'deg');
        el.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
        el.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
        el.classList.add('is-tilting');
      });
    }).on('pointerleave.fx', '.tilt', function () {
      if (frame) cancelAnimationFrame(frame);
      this.classList.remove('is-tilting');
      this.style.setProperty('--rx', '0deg');
      this.style.setProperty('--ry', '0deg');
    });
  }

  CE.fx = { odometer: odometer, success: success, reducedMotion: reduced };
  $(bindTilt);
})(jQuery, window.CE);
