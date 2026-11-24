/* Motion effects, rebuilt with jQuery and CSS from Pixel Perfect UI by Vansh Nagar
   (https://github.com/vansh-nagar/Pixel-Perfect, MIT). The styles are in styles.css under
   "Pixel Perfect ports". All effects are off for people who ask for less motion.
   Loaded after app.js and before components.js */
(function ($, CE) {
  'use strict';

  function asks(question) { return window.matchMedia(question).matches; }
  function lessMotion() { return asks('(prefers-reduced-motion: reduce)'); }
  function hasMouse() { return asks('(hover: hover) and (pointer: fine)'); }

  // ---------- rolling numbers, like the odometer in a car ----------

  var lastNumbers = {};   // what each tile showed before, by name

  // A strip with 0 to 9 twice, so it can always roll forward
  function strip() {
    var html = '';
    for (var n = 0; n < 20; n++) html += '<span>' + (n % 10) + '</span>';
    return html;
  }

  // One digit that will roll from one value to another
  function column(from, to, i) {
    return '<span class="odo-col"><span class="odo-reel" style="--i:' + i + '" data-from="' + from + '" data-to="' + to + '">' + strip() + '</span></span>';
  }

  // The old digits, with zeros in front so there are as many as in the new number
  function oldDigits(from, count) {
    return String(from).padStart(count, '0').slice(-count).split('');
  }

  // 1,204 becomes four rolling digits and one comma
  function numberHtml(text, from) {
    var count = text.replace(/\D/g, '').length;
    var old = oldDigits(from, count);
    var i = 0;
    return text.split('').map(function (c) {
      if (!/\d/.test(c)) return '<span class="odo-sep">' + CE.esc(c) + '</span>';
      var html = column(old[i], c, i);
      i++;
      return html;
    }).join('');
  }

  function moveTo(strip, position) { strip.style.transform = 'translateY(' + (-position) + 'em)'; }

  // Roll one strip. The first time a number appears it makes a full turn
  function roll(strip, first) {
    var from = Number(strip.getAttribute('data-from'));
    var to = Number(strip.getAttribute('data-to'));
    var steps = (to - from + 10) % 10; // forward only, so 9 to 1 is 2 steps
    if (first) steps += 10;
    if (!steps) return;

    strip.style.transition = '';
    moveTo(strip, from + steps);
    $(strip).one('transitionend', function () {
      strip.style.transition = 'none';
      moveTo(strip, to); // back to the first 0 to 9, which looks the same
    });
  }

  function odometer($el, number, options) {
    if (!$el.length) return;
    var name = (options && options.key) || $el.attr('data-odo-key');
    var first = !(name in lastNumbers);
    var from = first ? 0 : lastNumbers[name];
    var to = Math.max(0, Math.round(CE.num(number)));
    if (name) lastNumbers[name] = to;

    var text = to.toLocaleString();
    if (lessMotion()) { $el.text(text); return; }

    // Screen readers get the plain number, not the strips
    $el.html('<span class="sr-only">' + CE.esc(text) + '</span><span class="odo" aria-hidden="true">' + numberHtml(text, from) + '</span>');
    var $strips = $el.find('.odo-reel');
    $strips.each(function () {
      this.style.transition = 'none';
      moveTo(this, this.getAttribute('data-from'));
    });
    void $el[0].offsetHeight; // reading this makes the browser draw the start before rolling
    $strips.each(function () { roll(this, first); });
  }

  // ---------- the badge shown after registering ----------

  var SEAL = 'M22.5909 4.37592C24.1565 2.21749 27.3733 2.21749 28.9389 4.37592V4.37592C30.0273 5.87644 32.0178 6.40978 33.7106 5.65449V5.65449C36.1457 4.56803 38.9315 6.17646 39.2082 8.82851V8.82851C39.4005 10.6722 40.8576 12.1293 42.7013 12.3216V12.3216C45.3533 12.5983 46.9618 15.3841 45.8753 17.8192V17.8192C45.12 19.512 45.6533 21.5025 47.1539 22.5909V22.5909C49.3123 24.1565 49.3123 27.3733 47.1539 28.9389V28.9389C45.6533 30.0273 45.12 32.0178 45.8753 33.7106V33.7106C46.9618 36.1457 45.3533 38.9315 42.7013 39.2082V39.2082C40.8576 39.4005 39.4005 40.8576 39.2082 42.7013V42.7013C38.9315 45.3533 36.1457 46.9618 33.7106 45.8753V45.8753C32.0178 45.12 30.0273 45.6533 28.9389 47.1539V47.1539C27.3733 49.3123 24.1565 49.3123 22.5909 47.1539V47.1539C21.5025 45.6533 19.512 45.12 17.8192 45.8753V45.8753C15.3841 46.9618 12.5983 45.3533 12.3216 42.7013V42.7013C12.1293 40.8576 10.6722 39.4005 8.82851 39.2082V39.2082C6.17646 38.9315 4.56803 36.1457 5.65449 33.7106V33.7106C6.40978 32.0178 5.87644 30.0273 4.37592 28.9389V28.9389C2.21749 27.3733 2.21749 24.1565 4.37592 22.5909V22.5909C5.87644 21.5025 6.40978 19.512 5.65449 17.8192V17.8192C4.56803 15.3841 6.17646 12.5983 8.82851 12.3216V12.3216C10.6722 12.1293 12.1293 10.6722 12.3216 8.82851V8.82851C12.5983 6.17646 15.3841 4.56803 17.8192 5.65449V5.65449C19.512 6.40978 21.5025 5.87644 22.5909 4.37592V4.37592Z';

  function ripple(i) { return '<span class="fx-ripple" style="--i:' + i + '"></span>'; }

  // Hidden from screen readers, because the message beside it says the same
  function success() {
    if (lessMotion()) return;
    $('.fx-success').remove();
    var $badge = $('<div class="fx-success" aria-hidden="true">' + ripple(0) + ripple(1) + ripple(2) +
      '<svg class="fx-seal" width="72" height="72" viewBox="0 0 52 52" fill="none"><path d="' + SEAL + '" fill="currentColor"/>' +
      '<path class="fx-tick" d="M33.77 20.26 22.77 31.26 17.77 26.26" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" pathLength="1"/></svg></div>');
    $badge.appendTo('body');
    setTimeout(function () { $badge.addClass('is-leaving'); }, 1900);
    setTimeout(function () { $badge.remove(); }, 2400);
  }

  // ---------- cards that lean towards the mouse ----------

  var mostLean = 7;   // degrees

  // Where the mouse is on the card, from 0 to 1
  function share(position, start, size) { return Math.min(1, Math.max(0, (position - start) / size)); }

  function lean(card, e) {
    var box = card.getBoundingClientRect();
    var x = share(e.clientX, box.left, box.width);
    var y = share(e.clientY, box.top, box.height);
    card.style.transitionDelay = '0ms';
    card.style.setProperty('--rx', (0.5 - y) * 2 * mostLean + 'deg');
    card.style.setProperty('--ry', (x - 0.5) * 2 * mostLean + 'deg');
    card.style.setProperty('--gx', x * 100 + '%'); // where the light is
    card.style.setProperty('--gy', y * 100 + '%');
    card.classList.add('is-tilting');
  }

  function straighten(card) {
    card.classList.remove('is-tilting');
    card.style.setProperty('--rx', '0deg');
    card.style.setProperty('--ry', '0deg');
  }

  // Only with a mouse. Listening on the page also covers cards drawn later
  function startTilt() {
    if (!hasMouse() || lessMotion()) return;
    $(document)
      .on('pointermove', '.tilt', function (e) { lean(this, e); })
      .on('pointerleave', '.tilt', function () { straighten(this); });
  }

  CE.fx = { odometer: odometer, success: success, reducedMotion: lessMotion };
  $(startTilt);
})(jQuery, window.CE);
