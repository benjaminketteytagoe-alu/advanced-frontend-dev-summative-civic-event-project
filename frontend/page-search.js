/* =========================================================================
   Global search — searches cached events, announcements and promos
   client-side (the API has no search endpoint). Results respect the
   published=true rule for normal users via CE.data.visible().
   ========================================================================= */
(function ($, CE) {
  'use strict';
  var ui = CE.ui;
  var src = { events: [], announcements: [], promos: [] }, type = 'all';

  function match(text, terms) { text = (text || '').toLowerCase(); return terms.every(function (t) { return text.indexOf(t) > -1; }); }

  function run() {
    var q = $.trim($('#s-q').val());
    history.replaceState(null, '', 'search.html' + (q ? '?q=' + encodeURIComponent(q) : ''));
    $('#global-search, #mobile-search').val(q);
    ui.setTitle(q ? '“' + q + '”' : 'Search');
    var terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    var $r = $('#s-results').attr('aria-busy', 'false');
    if (!terms.length) {
      $('#s-summary').text(''); $('.js-c').text('');
      $r.html(ui.empty('What are you looking for?', 'Try “clean-up”, a venue name, or the title of an announcement.', '', 'search'));
      return;
    }
    var res = {
      events: CE.data.visible(src.events).filter(function (e) { return match(e.title + ' ' + e.description + ' ' + e.location, terms); }),
      announcements: CE.data.visible(src.announcements).filter(function (a) { return match(a.title + ' ' + (a.transcript || ''), terms); }),
      promos: CE.data.visible(src.promos).filter(function (p) { return match(p.title + ' ' + p.description + ' ' + p.caption_text, terms); })
    };
    var total = res.events.length + res.announcements.length + res.promos.length;
    $('.js-c[data-for=all]').text('(' + total + ')');
    ['events', 'announcements', 'promos'].forEach(function (k) { $('.js-c[data-for=' + k + ']').text('(' + res[k].length + ')'); });
    $('#s-summary').text(total + ' result' + (total === 1 ? '' : 's') + ' for “' + q + '”');

    var html = '';
    var section = function (key, title, inner, cls) {
      if ((type !== 'all' && type !== key) || !res[key].length) return '';
      return '<div><h2 class="font-display text-2xl text-ink-900 mb-5">' + title + ' <span class="text-ink-400 text-lg">' + res[key].length + '</span></h2><div class="' + cls + '">' + inner + '</div></div>';
    };
    html += section('events', 'Events', res.events.map(function (e) { return CE.views.eventCard(e, { q: q }); }).join(''), 'grid sm:grid-cols-2 lg:grid-cols-3 gap-6');
    html += section('announcements', 'Announcements', res.announcements.map(function (a) { return CE.views.announcementCard(a, { q: q }); }).join(''), 'grid lg:grid-cols-2 gap-4');
    html += section('promos', 'Promos', res.promos.map(function (p) { return CE.views.promoCard(p, { q: q }); }).join(''), 'grid sm:grid-cols-2 lg:grid-cols-3 gap-6');
    $r.html(html || ui.empty('No results for “' + q + '”', 'Check the spelling or try fewer words.', '<a href="events.html" class="btn btn-primary">Browse all events</a>', 'search'));
    CE.views.lazyVideos($r); CE.views.lazyDurations($r);
    ui.reveal($r);
  }

  function load() {
    $('#s-results').attr('aria-busy', 'true').html('<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">' + ui.skeletonCards(3) + '</div>');
    // Each source fails independently so one broken list doesn't blank the page.
    var safe = function (p) { return p.catch(function () { return []; }); };
    Promise.all([safe(CE.data.events()), safe(CE.data.announcements()), safe(CE.data.promos())]).then(function (r) {
      src.events = r[0]; src.announcements = r[1]; src.promos = r[2];
      run();
    });
  }

  CE.ready(function () {
    $('#s-q').val(CE.param('q') || '').trigger('focus');
    load();
    CE.views.inlineAudio($('#s-results'));
    $('#s-form').on('submit', function (e) { e.preventDefault(); run(); });
    $('#s-q').on('input', CE.debounce(run, 250));
    $('.chip[data-t]').on('click', function () { type = $(this).data('t'); $('.chip[data-t]').attr('aria-pressed', 'false'); $(this).attr('aria-pressed', 'true'); run(); });
    // Global header search on this page: update in place instead of reloading
    $(document).on('submit', 'header form[role=search]', function (e) { e.preventDefault(); $('#s-q').val($(this).find('input').val()); run(); });
    $('#s-results').on('click', '.js-reg', function () { CE.actions.toggleRegistration($(this)); });
  });
})(jQuery, window.CE);
