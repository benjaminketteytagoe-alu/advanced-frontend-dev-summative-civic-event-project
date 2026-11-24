// What people see on every page: icons, artwork, messages, windows, form errors and small drawings.
// Loaded after app.js
(function ($, CE) {
  'use strict';
  var esc = CE.esc, num = CE.num;

  // ---------- icons ----------

  var icons = {
    calendar: '<rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8.5 3 8.5H3S6 15 6 8z"/><path d="M10.3 20a1.9 1.9 0 0 0 3.4 0"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6"/>',
    logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 16l-4-4 4-4M6 12h10"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h10"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    play: '<path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="none"/>',
    pause: '<rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none"/>',
    volume: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
    mute: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/>',
    mic: '<path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M15 8.5a5 5 0 0 1 0 7M18 5.5a9 9 0 0 1 0 13"/>',
    film: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    inbox: '<path d="M3 13.5 5.5 5h13l2.5 8.5V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M3 13.5h5l1.5 2.5h5l1.5-2.5h5"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4.5h6V7"/>',
    edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4.5M12 17.5v.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.5v.01"/>',
    left: '<path d="M15 5l-7 7 7 7"/>',
    right: '<path d="m9 5 7 7-7 7"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    arrowLeft: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.9 8.4 2 12 2 12s3.5 7 10 7a9.6 9.6 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    shield: '<path d="M12 3 4.5 6v6c0 4.5 3.2 7.8 7.5 9 4.3-1.2 7.5-4.5 7.5-9V6z"/><path d="m9 12 2 2 4-4"/>',
    lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    ticket: '<path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2.5a1.5 1.5 0 0 0 0 3V16a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2.5a1.5 1.5 0 0 0 0-3z"/><path d="M14 6v12" stroke-dasharray="2 2.5"/>',
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/>',
    grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.6-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5L20 16M20 20v-4h-4"/>',
    cc: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M10.5 10.2a2.5 2.5 0 1 0 0 3.6M17.5 10.2a2.5 2.5 0 1 0 0 3.6"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>',
    sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
    filter: '<path d="M4 5h16l-6 7.5V19l-4 1.5v-8z"/>',
    message: '<path d="M4 5h16v11H9l-5 4z"/>',
    megaphone: '<path d="M3 10v4a1 1 0 0 0 1 1h2l8 5V4L6 9H4a1 1 0 0 0-1 1z"/><path d="M18 9a4 4 0 0 1 0 6"/>',
    toggle: '<rect x="2.5" y="7" width="19" height="10" rx="5"/><circle cx="16.5" cy="12" r="2.8"/>',
    rewind: '<path d="M11 18 4 12l7-6zM20 18l-7-6 7-6z" fill="currentColor" stroke="none"/>',
    forward: '<path d="m13 6 7 6-7 6zM4 6l7 6-7 6z" fill="currentColor" stroke="none"/>',
    download: '<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>',
    wifiOff: '<path d="M2 8.5a15 15 0 0 1 5-3M22 8.5A15 15 0 0 0 11 4.6M5 12a10 10 0 0 1 4-2.4M19 12a10 10 0 0 0-3.3-2.2M8.5 15.5a5 5 0 0 1 7 0M12 19.5v.01M3 3l18 18"/>'
  };

  // classes sets the size, 5 units when left out
  function icon(name, classes) {
    return '<svg class="' + (classes || 'w-5 h-5') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"' +
      ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + icons[name] + '</svg>';
  }

  // ---------- artwork from DiceBear (https://www.dicebear.com) ----------
  // The same seed always gives the same picture

  function art(style, seed, options) {
    return 'https://api.dicebear.com/9.x/' + style + '/svg?seed=' + encodeURIComponent(seed || 'civic') + '&' + options;
  }

  function avatar(seed) { return art('notionists', seed, 'backgroundColor=f3c2a8,c9d1e1,e2d8c3,c3dba8,fae3d6&backgroundType=solid'); }
  function cover(seed) {
    return art('shapes', seed, 'backgroundColor=121a2e,1c2742,283656,6b2c19,36476c&shape1Color=ea9a74,f3c2a8,c3dba8,9aa8c4' +
      '&shape2Color=df7447,fae3d6,e2d8c3&shape3Color=c8562a,c9d1e1,5b7f2f');
  }
  function rings(seed) { return art('rings', seed, 'backgroundColor=121a2e,283656,6b2c19&ringColor=ea9a74,f3c2a8,c9d1e1,fae3d6'); }
  function glass(seed) { return art('glass', seed, 'backgroundColor=121a2e,283656,a9441f,36476c'); }

  function avatarImg(seed, name, classes) {
    return '<img src="' + avatar(seed) + '" alt="' + esc(name ? 'Avatar for ' + name : '') + '" class="' + (classes || 'w-10 h-10') +
      ' rounded-full ring-2 ring-white bg-paper-200 object-cover" loading="lazy" width="40" height="40">';
  }

  // ---------- toasts: short messages in the corner ----------

  function toastHtml(type, action, wait) {
    var names = { success: 'check', error: 'alert', warning: 'alert', info: 'info' };
    var button = action ? '<button type="button" class="toast-action text-xs font-bold uppercase tracking-wider underline underline-offset-4 mt-0.5">' + esc(action) + '</button>' : '';
    return '<div class="toast" data-type="' + type + '" role="' + (type === 'error' ? 'alert' : 'status') + '">' +
      '<span class="toast-icon mt-0.5">' + icon(names[type]) + '</span><div class="flex-1 text-sm leading-relaxed"></div>' + button +
      '<button type="button" class="toast-close opacity-70 hover:opacity-100" aria-label="Dismiss">' + icon('x', 'w-4 h-4') + '</button>' +
      '<span class="toast-timer" style="animation-duration:' + wait + 'ms"></span></div>';
  }

  // type is success, error, warning or info. options can add a button: action and onAction
  function toast(type, message, options) {
    options = options || {};
    var wait = options.action ? 9000 : type === 'error' ? 7000 : 4500;
    var $toast = $(toastHtml(type, options.action, wait));
    var timer;

    function close() {
      clearTimeout(timer);
      $toast.addClass('is-leaving');
      setTimeout(function () { $toast.remove(); }, 300);
    }
    function closeIn(ms) { timer = setTimeout(close, ms); }

    $toast.find('.flex-1').text(message);
    $toast
      .on('click', '.toast-close', close)
      .on('click', '.toast-action', function () { close(); options.onAction(); })
      .on('mouseenter', function () { // stay while someone reads it
        clearTimeout(timer);
        $toast.find('.toast-timer').css('animation-play-state', 'paused');
      })
      .on('mouseleave', function () { closeIn(2000); });
    $('#toast-region').append($toast);
    closeIn(wait);
  }

  // ---------- windows ----------

  function focusable($box) {
    return $box.find('a[href], button:not([disabled]), input:not([disabled]), select, textarea').filter(':visible');
  }

  // Tab stays inside a window: after the last control comes the first
  function trapFocus($box, e) {
    var $all = focusable($box);
    var first = $all.first()[0], last = $all.last()[0];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  var windows = 0; // counts them, so each has its own id

  function windowHtml(id, o) {
    var foot = o.footer ? '<div class="mt-6 flex flex-wrap justify-end gap-2">' + o.footer + '</div>' : '';
    return '<div class="modal-wrap"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="' + id + '"><div class="p-6 sm:p-7">' +
      '<div class="flex items-start justify-between gap-4 mb-4"><h2 id="' + id + '" class="font-display text-2xl text-ink-900 min-w-0 break-words">' + esc(o.title) + '</h2>' +
      '<button type="button" class="icon-btn -mr-2 -mt-1" data-close aria-label="Close dialog">' + icon('x') + '</button></div>' +
      '<div class="modal-body text-ink-700">' + o.body + '</div>' + foot + '</div></div></div>';
  }

  // The first control, but not a close button when there is something better
  function focusFirst($box) {
    var $best = $box.find('[autofocus]');
    if (!$best.length) $best = focusable($box).not('[data-close]');
    if (!$best.length) $best = focusable($box);
    $best.first().trigger('focus');
  }

  // o has title, body (HTML), footer (HTML) and onClose. Anything with data-close closes it
  function modal(o) {
    var id = 'window-' + (windows++);
    var before = document.activeElement; // where the keyboard was
    var $shade = $('<div class="overlay"></div>');
    var $wrap = $(windowHtml(id, o));
    var $box = $wrap.find('.modal');

    function close() {
      $(document).off('keydown.' + id);
      $shade.add($box).removeClass('is-open');
      setTimeout(function () { $shade.add($wrap).remove(); }, 300); // after it fades out
      $('body').css('overflow', $('.drawer.is-open').length ? 'hidden' : '');
      before.focus();
      if (o.onClose) o.onClose();
    }

    $('body').append($shade, $wrap).css('overflow', 'hidden'); // the page behind must not scroll
    setTimeout(function () {
      $shade.add($box).addClass('is-open');
      focusFirst($box);
    }, 30);

    $shade.on('click', close);
    $wrap.on('click', '[data-close]', close);
    $(document).on('keydown.' + id, function (e) {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') trapFocus($box, e);
    });
    return { $el: $box, close: close };
  }

  // Ask yes or no. Gives back true or false
  function confirm(o) {
    return new Promise(function (resolve) {
      var answer = false;
      var win = modal({
        title: o.title,
        body: '<p class="text-sm leading-relaxed">' + esc(o.message) + '</p>',
        footer: '<button type="button" class="btn btn-ghost" data-close>Cancel</button>' +
          '<button type="button" class="btn ' + (o.danger ? 'btn-danger' : 'btn-primary') + '" data-ok autofocus>' + esc(o.confirmText) + '</button>',
        onClose: function () { resolve(answer); }
      });
      win.$el.on('click', '[data-ok]', function () {
        answer = true;
        win.close();
      });
    });
  }

  // ---------- not allowed ----------

  function contactLink(classes) {
    return '<a class="' + classes + '" href="mailto:' + CE.config.SUPPORT_EMAIL + '?subject=CivicEvents%2B%20access">' + icon('mail', 'w-4 h-4') + 'Contact admin</a>';
  }

  function forbiddenModal(message) {
    modal({
      title: 'Access restricted',
      body: '<div class="flex gap-4"><span class="shrink-0 grid place-items-center w-12 h-12 rounded-full bg-ember-100 text-ember-700">' + icon('lock', 'w-6 h-6') + '</span>' +
        '<div class="text-sm leading-relaxed"><p class="font-medium text-ink-900 mb-1">' + esc(message || 'You don’t have permission to perform this action.') + '</p>' +
        '<p>If you believe this is a mistake, ask a CivicEvents+ administrator to review your account.</p></div></div>',
      footer: contactLink('btn btn-ghost') + '<button type="button" class="btn btn-primary" data-close autofocus>Okay</button>'
    });
  }

  // The whole page, when a user opens an admin page
  function forbiddenPage() {
    $('#main').html('<section class="max-w-xl mx-auto px-4 py-24 text-center page-enter">' +
      '<div class="mx-auto mb-6 grid place-items-center w-20 h-20 rounded-full bg-ember-100 text-ember-700 float-slow">' + icon('shield', 'w-10 h-10') + '</div>' +
      '<p class="eyebrow mb-3">Error 403 · Admins only</p>' +
      '<h1 class="font-display text-4xl text-ink-900 mb-4">This area is reserved for administrators</h1>' +
      '<p class="text-ink-600 mb-8">Your account doesn’t have permission to view this page. If you need access, please contact an administrator.</p>' +
      '<div class="flex flex-wrap justify-center gap-3"><a href="index.html" class="btn btn-primary">' + icon('home', 'w-4 h-4') + 'Back to home</a>' + contactLink('btn btn-ghost') + '</div></section>');
  }

  // ---------- waiting, nothing, and errors ----------

  function bar(classes) { return '<div class="skeleton ' + classes + '"></div>'; }

  function skeletonRow() {
    return '<div class="card p-4 flex items-center gap-4" aria-hidden="true">' + bar('w-12 h-12 rounded-full') +
      '<div class="flex-1 space-y-2">' + bar('h-4 w-2/3') + bar('h-3 w-1/3') + '</div></div>';
  }

  function skeletonCard() {
    return '<div class="card overflow-hidden" aria-hidden="true">' + bar('h-44 rounded-none') +
      '<div class="p-5 space-y-3">' + bar('h-3 w-1/3') + bar('h-5 w-4/5') + bar('h-3 w-full') + bar('h-3 w-2/3') +
      '<div class="flex gap-2 pt-2">' + bar('h-9 w-24 rounded-full') + bar('h-9 w-24 rounded-full') + '</div></div></div>';
  }

  // Grey shapes while we wait. kind is row or left out
  function skeletonCards(count, kind) {
    return (kind === 'row' ? skeletonRow() : skeletonCard()).repeat(count);
  }

  // button is HTML, and may be empty
  function empty(title, text, button, iconName) {
    return '<div class="col-span-full card p-10 sm:p-14 text-center page-enter">' +
      '<div class="mx-auto mb-5 grid place-items-center w-16 h-16 rounded-full bg-paper-200 text-ink-500 float-slow">' + icon(iconName, 'w-8 h-8') + '</div>' +
      '<h3 class="font-display text-2xl text-ink-900 mb-2 break-words">' + esc(title) + '</h3>' +
      '<p class="text-ink-600 max-w-md mx-auto">' + esc(text) + '</p>' + (button ? '<div class="mt-6">' + button + '</div>' : '') + '</div>';
  }

  function errorState($box, err, retry) {
    var offline = err.status === 0;
    $box.html('<div class="col-span-full card p-10 text-center page-enter" role="alert">' +
      '<div class="mx-auto mb-5 grid place-items-center w-16 h-16 rounded-full bg-ember-100 text-ember-700">' + icon(offline ? 'wifiOff' : 'alert', 'w-8 h-8') + '</div>' +
      '<h3 class="font-display text-2xl text-ink-900 mb-2">' + (offline ? 'You appear to be offline' : 'We hit a snag') + '</h3>' +
      '<p class="text-ink-600 max-w-md mx-auto mb-6">' + esc(err.message) + '</p>' +
      '<button type="button" class="btn btn-primary retry">' + icon('refresh', 'w-4 h-4') + 'Try again</button></div>');
    $box.find('.retry').on('click', function () { retry(); });
  }

  // A button that is working. Its old words come back when on is false
  function busy($button, on, text) {
    if (on) {
      $button.data('words', $button.html()).html('<span class="spinner" aria-hidden="true"></span><span>' + esc(text) + '</span>');
    } else {
      $button.html($button.data('words'));
    }
    $button.prop('disabled', on).attr('aria-busy', String(on));
  }

  // ---------- page numbers ----------

  // The first, the last, and those around this one
  function pageNumbers(page, pages) {
    var numbers = [];
    for (var n = 1; n <= pages; n++) {
      if (n === 1 || n === pages || Math.abs(n - page) <= 1) numbers.push(n);
    }
    return numbers;
  }

  function arrow(page, off, label, iconName) {
    return '<button type="button" class="icon-btn border border-paper-300 bg-white/70 disabled:opacity-40" data-p="' + page + '"' + (off ? ' disabled' : '') +
      ' aria-label="' + label + '">' + icon(iconName, 'w-4 h-4') + '</button>';
  }

  function numberButton(n, page) {
    var colour = n === page ? 'bg-ink-900 text-white shadow-card' : 'text-ink-700 hover:bg-white';
    return '<button type="button" class="min-w-[2.5rem] h-10 px-3 rounded-full text-sm font-semibold transition ' + colour + '" data-p="' + n + '"' +
      (n === page ? ' aria-current="page"' : '') + ' aria-label="Page ' + n + '">' + n + '</button>';
  }

  function pagination($box, page, pages, onChange) {
    if (pages === 1) return $box.empty();
    var before = 0;
    var buttons = pageNumbers(page, pages).map(function (n) {
      var gap = n - before > 1 ? '<span class="px-1 text-ink-400" aria-hidden="true">…</span>' : '';
      before = n;
      return gap + numberButton(n, page);
    });
    $box.html('<nav class="flex items-center justify-center gap-1.5" aria-label="Pagination">' +
      arrow(page - 1, page === 1, 'Previous page', 'left') + buttons.join('') + arrow(page + 1, page === pages, 'Next page', 'right') + '</nav>');
    $box.find('button').on('click', function () { onChange(Number($(this).attr('data-p'))); });
  }

  // ---------- appearing while scrolling ----------

  var watcher = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      $(entry.target).addClass('is-visible');
      watcher.unobserve(entry.target);
    });
  }, { threshold: 0.05 });

  function reveal(root) {
    $(root).find('.reveal').not('.is-visible').each(function () { watcher.observe(this); });
  }

  // Each a little later than the one before
  function stagger($items, step) {
    $items.each(function (i) { this.style.setProperty('--d', Math.min(i * step, 600) + 'ms'); });
  }

  // ---------- form errors ----------

  // The line under a box where its error is written. Made the first time it is needed
  function errorLine($input) {
    var id = $input.attr('id') + '-err';
    if (!$('#' + id).length) {
      var $line = $('<p class="field-error" id="' + id + '" aria-live="polite"></p>');
      var $row = $input.closest('.form-row');
      if ($row.length) $row.append($line);
      else $line.insertAfter($input);
      $input.attr('aria-describedby', ($input.attr('aria-describedby') || '') + ' ' + id); // read out with the box
    }
    return $('#' + id);
  }

  // Show an error, or clear it with no text. Gives back true when there is no error
  function fieldError($input, text) {
    errorLine($input).text(text || '');
    $input.attr('aria-invalid', text ? 'true' : 'false');
    return !text;
  }

  function clearErrors($form) {
    $form.find('.field-error').text('');
    $form.find('[aria-invalid]').attr('aria-invalid', 'false');
  }

  // Put the backend's errors beside their boxes
  function applyServerErrors($form, err) {
    err.errors.forEach(function (e) {
      var $input = $form.find('[name="' + e.field + '"]');
      if ($input.length) fieldError($input, e.message);
    });
  }

  // ---------- files ----------

  // What is wrong with a file, or nothing
  function validateFile(file, kind) {
    var rule = CE.config.UPLOADS[kind];
    var ending = file.name.split('.').pop().toLowerCase();
    if (rule.ext.indexOf(ending) === -1) return 'Unsupported file type “.' + ending + '”. Allowed: ' + rule.label + '.';
    if (file.size > rule.max) return 'File is ' + CE.fmt.bytes(file.size) + ', but the limit is ' + CE.fmt.bytes(rule.max) + '.';
    return '';
  }

  // A file can be chosen, or dropped on the zone
  function dropzone($zone, $input, onFile) {
    $zone
      .on('dragover', function (e) { e.preventDefault(); $zone.addClass('is-dragging'); })
      .on('dragleave drop', function () { $zone.removeClass('is-dragging'); })
      .on('drop', function (e) {
        e.preventDefault(); // or the browser would open the file
        var files = e.originalEvent.dataTransfer.files;
        if (!files.length) return;
        $input[0].files = files;
        $input.trigger('change');
      });
    $input.on('change', function () { onFile(this.files[0] || null); });
  }

  // ---------- small drawings ----------

  function star(full, classes) {
    return '<svg class="' + classes + '" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" fill="' + (full ? 'currentColor' : '#e2d8c3') + '"/></svg>';
  }

  function stars(rating, classes) {
    var drawn = [1, 2, 3, 4, 5].map(function (n) { return star(n <= Math.round(num(rating)), classes || 'w-4 h-4'); });
    return '<span class="inline-flex items-center gap-0.5 text-[#d08a1e]" role="img" aria-label="' + num(rating).toFixed(1) + ' out of 5 stars">' + drawn.join('') + '</span>';
  }

  // Mark the searched words. \\$& puts a backslash before characters that mean something in a pattern
  function highlight(text, search) {
    if (!search) return esc(text);
    var pattern = esc(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return esc(text).replace(new RegExp(pattern, 'ig'), '<mark class="hl">$&</mark>');
  }

  function setTitle(title) { document.title = title + ' · CivicEvents+'; }

  CE.icon = icon;
  CE.dice = { avatar: avatar, cover: cover, rings: rings, glass: glass };
  CE.ui = {
    toast: toast, modal: modal, confirm: confirm, trapFocus: trapFocus, forbiddenModal: forbiddenModal, forbiddenPage: forbiddenPage,
    skeletonCards: skeletonCards, empty: empty, errorState: errorState, busy: busy, pagination: pagination,
    reveal: reveal, stagger: stagger, fieldError: fieldError, clearErrors: clearErrors, applyServerErrors: applyServerErrors,
    validateFile: validateFile, dropzone: dropzone, avatarImg: avatarImg, stars: stars, highlight: highlight, setTitle: setTitle
  };
})(jQuery, window.CE);
