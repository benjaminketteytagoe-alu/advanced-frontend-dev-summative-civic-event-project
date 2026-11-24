// Search page: looks through events, announcements and promos in the browser (the API has no search)
(function ($, CE) {
  'use strict';
  var ui = CE.ui;

  var type = 'all';   // all, events, announcements or promos
  var data = { events: [], announcements: [], promos: [] };
  var regs = {};      // event id to registered or cancelled
  var player;         // the one audio player all the cards share

  // The text we look through for one item
  function textOf(x) {
    var parts = [x.title, x.description, x.location, x.caption_text];
    return parts.filter(Boolean).join(' ').toLowerCase();
  }

  // Every word must be there, in any order
  function find(list, words) {
    return CE.data.visible(list).filter(function (x) {
      var text = textOf(x);
      return words.every(function (word) { return text.indexOf(word) > -1; });
    });
  }

  // Keep the search in the address bar, so it can be shared or refreshed
  function updatePage(q) {
    history.replaceState(null, '', 'search.html' + (q ? '?q=' + encodeURIComponent(q) : ''));
    $('#global-search, #mobile-search').val(q);
    ui.setTitle(q ? '“' + q + '”' : 'Search');
  }

  function showCounts(found, total, q) {
    $('.js-c[data-for=all]').text('(' + total + ')');
    ['events', 'announcements', 'promos'].forEach(function (k) {
      $('.js-c[data-for=' + k + ']').text('(' + found[k].length + ')');
    });
    $('#s-summary').text(total + (total === 1 ? ' result' : ' results') + ' for “' + q + '”');
  }

  // One group of results with its heading
  function section(name, title, list, card, columns) {
    if (type !== 'all' && type !== name) return '';
    if (!list.length) return '';
    return '<div><h2 class="font-display text-2xl text-ink-900 mb-5">' + title +
      ' <span class="text-ink-400 text-lg">' + list.length + '</span></h2>' +
      '<div class="' + columns + '">' + list.map(card).join('') + '</div></div>';
  }

  function showResults(found, q) {
    var three = 'grid sm:grid-cols-2 lg:grid-cols-3 gap-6';
    var two = 'grid lg:grid-cols-2 gap-4';

    var html =
      section('events', 'Events', found.events, function (x) { return CE.views.eventCard(x, { q: q, registrations: regs }); }, three) +
      section('announcements', 'Announcements', found.announcements, function (x) { return CE.views.announcementCard(x, { q: q }); }, two) +
      section('promos', 'Promos', found.promos, function (x) { return CE.views.promoCard(x, { q: q }); }, three);

    if (!html) html = ui.empty('No results for “' + q + '”', 'Check the spelling or try fewer words.', '<a href="events.html" class="btn btn-primary">Browse all events</a>', 'search');

    var $results = $('#s-results').html(html);
    CE.views.lazyVideos($results);    // load thumbnails only when they scroll into view
    CE.views.lazyDurations($results); // read each length from its audio file
    ui.reveal($results);
  }

  // Before anything is typed
  function showStart() {
    $('#s-summary, .js-c').text('');
    $('#s-results').html(ui.empty('What are you looking for?', 'Try “clean-up”, a venue name, or the title of an announcement.', '', 'search'));
  }

  // Search and draw
  function show() {
    player.pause(); // the old cards are about to go, and their pause buttons with them

    var q = $.trim($('#s-q').val());
    updatePage(q);
    $('#s-results').attr('aria-busy', 'false');
    if (!q) return showStart();

    var words = q.toLowerCase().split(/\s+/); // cut at the spaces
    var found = {
      events: find(data.events, words),
      announcements: find(data.announcements, words),
      promos: find(data.promos, words)
    };
    var total = found.events.length + found.announcements.length + found.promos.length;

    showCounts(found, total, q);
    showResults(found, q);
  }

  // Get one list. If it fails, carry on without it, so the other lists still work
  function get(name) {
    return CE.data[name]()
      .then(function (list) { data[name] = list; return null; })
      .catch(function (err) { return err; });
  }

  // Which events this person is going to (admins do not register)
  function getRegs() {
    if (!CE.guard.can('event:register')) return null;
    return CE.data.myRegistrations()
      .then(function (list) { list.forEach(function (r) { regs[r.event_id] = r.status; }); })
      .catch(function () { }); // without it we only lose the Registered labels
  }

  function load() {
    $('#s-results').attr('aria-busy', 'true').html('<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">' + ui.skeletonCards(3) + '</div>');

    Promise.all([get('events'), get('announcements'), get('promos'), getRegs()]).then(function (r) {
      var allFailed = r[0] && r[1] && r[2];
      if (!allFailed) return show();
      ui.errorState($('#s-results'), r[0], load);
      $('#s-results').attr('aria-busy', 'false');
    });
  }

  function changeType() {
    type = $(this).data('t');
    $('.chip[data-t]').attr('aria-pressed', 'false');
    $(this).attr('aria-pressed', 'true');
    show();
  }

  // The search box in the header, used on this page without reloading
  function headerSearch(e) {
    e.preventDefault();
    $('#s-q').val($(this).find('input').val());
    show();
  }

  function register() {
    CE.actions.toggleRegistration($(this), function (id, status) { regs[id] = status; });
  }

  function remove($button, kind, name) {
    var id = $button.attr('data-id');
    CE.actions.remove({
      action: kind + ':delete',
      path: '/' + name + '/' + id,
      title: $button.attr('data-title'),
      cacheKey: name,
      $card: $button.closest('article'),
      after: function () {
        data[name] = data[name].filter(function (x) { return x.id !== id; });
        show();
      }
    });
  }

  // Start
  CE.ready(function () {
    player = CE.views.inlineAudio($('#s-results'));
    $('#s-q').val(CE.param('q') || '').trigger('focus');
    load();

    $('#s-form').on('submit', function (e) { e.preventDefault(); show(); });
    $('#s-q').on('input', CE.debounce(show, 250)); // wait until typing stops
    $('.chip[data-t]').on('click', changeType);
    $(document).on('submit', 'header form[role=search]', headerSearch);

    $('#s-results')
      .on('click', '.js-reg', register)
      .on('click', '.js-del-event', function () { remove($(this), 'event', 'events'); })
      .on('click', '.js-del-ann', function () { remove($(this), 'announcement', 'announcements'); })
      .on('click', '.js-del-promo', function () { remove($(this), 'promo', 'promos'); });
  });
})(jQuery, window.CE);
