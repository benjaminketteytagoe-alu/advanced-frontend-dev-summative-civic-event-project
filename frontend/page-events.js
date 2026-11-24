// Events page: the list of events, with search, filters, sorting and page numbers
(function ($, CE) {
  'use strict';
  var ui = CE.ui, esc = CE.esc;

  var perPage = 9;
  var day = 24 * 60 * 60 * 1000;   // one day in milliseconds
  var events = [];                 // every event from the server
  var regs = {};                   // event id to registered or cancelled
  var want;                        // what the person asked for

  // q is the search, loc the location, when the time period
  function startAgain() {
    want = { q: '', loc: '', from: '', to: '', when: 'upcoming', sort: 'soonest', page: 1 };
  }

  // ---------- the address bar ----------

  // Read the choices from the address, so a link can be shared
  function readAddress() {
    Object.keys(want).forEach(function (key) {
      var value = CE.param(key);
      if (value) want[key] = value;
    });
    want.page = Math.max(1, parseInt(want.page, 10) || 1);
  }

  // Write only what is different from the start
  function writeAddress() {
    var normal = { q: '', loc: '', from: '', to: '', when: 'upcoming', sort: 'soonest', page: 1 };
    var parts = Object.keys(want).filter(function (key) { return want[key] !== normal[key]; });
    var text = parts.map(function (key) { return key + '=' + encodeURIComponent(want[key]); }).join('&');
    history.replaceState(null, '', 'events.html' + (text ? '?' + text : ''));
  }

  // Make the boxes and buttons match the choices
  function fillForm() {
    $('#f-q').val(want.q);
    $('#f-loc').val(want.loc);
    $('#f-from').val(want.from);
    $('#f-to').val(want.to);
    $('#f-sort').val(want.sort);
    showChips();
  }

  function showChips() {
    $('.chip[data-when]').each(function () {
      $(this).attr('aria-pressed', String($(this).data('when') === want.when));
    });
  }

  // ---------- filters ----------

  function startOf(e) { return new Date(e.starts_at); }
  function endOf(e) { return new Date(e.ends_at || e.starts_at); }

  function matchesSearch(e) {
    var text = [e.title, e.description, e.location].filter(Boolean).join(' ');
    return text.toLowerCase().indexOf(want.q.toLowerCase()) > -1;
  }

  function matchesPlace(e) {
    return !want.loc || (e.location || '').trim().toLowerCase() === want.loc.toLowerCase();
  }

  // Keep events that touch the chosen dates
  function matchesDates(e) {
    if (want.from && endOf(e) < new Date(want.from + 'T00:00:00')) return false;
    if (want.to && startOf(e) > new Date(want.to + 'T23:59:59')) return false;
    return true;
  }

  function matchesWhen(e) {
    var now = new Date();
    var past = endOf(e) < now;
    var nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    if (want.when === 'past') return past;
    if (want.when === 'upcoming') return !past;
    if (want.when === 'week') return !past && startOf(e) - now <= 7 * day;
    if (want.when === 'month') return !past && startOf(e) < nextMonth;
    return true;
  }

  function order(a, b) {
    if (want.sort === 'az') return (a.title || '').localeCompare(b.title || '');
    var soonest = startOf(a) - startOf(b);
    var newestFirst = want.sort === 'latest' || want.when === 'past'; // past events read best backwards
    return newestFirst ? -soonest : soonest;
  }

  function matches() {
    var list = CE.data.visible(events).filter(function (e) {
      return matchesSearch(e) && matchesPlace(e) && matchesDates(e) && matchesWhen(e);
    });
    return list.sort(order);
  }

  // ---------- drawing ----------

  function showCount(found, start, shown) {
    if (!found) return $('#results-summary').text('No events match your filters.');
    var text = 'Showing ' + (start + 1) + '–' + (start + shown) + ' of ' + found + (found === 1 ? ' event' : ' events');
    $('#results-summary').text(text);
  }

  function showEmpty() {
    if (CE.data.visible(events).length) {
      $('#event-grid').html(ui.empty('Nothing matches those filters', 'Try a different date range, location or keyword.',
        '<button type="button" class="btn btn-primary js-clear">Clear filters</button>', 'calendar'));
      return;
    }
    var button = '';
    if (CE.guard.can('event:create')) button = '<a href="event-form.html" class="btn btn-primary">Create the first event</a>';
    $('#event-grid').html(ui.empty('No events yet', 'When organisers publish events they’ll appear here.', button, 'calendar'));
  }

  function showCards(list) {
    var $grid = $('#event-grid');
    var cards = list.map(function (e) { return CE.views.eventCard(e, { registrations: regs, q: want.q }); });
    $grid.html(cards.join(''));
    ui.stagger($grid.find('.reveal'), 70); // cards appear one after another
    ui.reveal($grid);
  }

  // Draw the page
  function show() {
    var list = matches();
    var pages = Math.max(1, Math.ceil(list.length / perPage));
    want.page = Math.min(want.page, pages); // deleting the last card can leave us past the end

    var start = (want.page - 1) * perPage;
    var part = list.slice(start, start + perPage);

    showCount(list.length, start, part.length);
    if (part.length) showCards(part);
    else showEmpty();

    $('#event-grid').attr('aria-busy', 'false');
    ui.pagination($('#pager'), want.page, pages, goToPage);
    writeAddress();
  }

  function goToPage(n) {
    want.page = n;
    show();
    $('html,body').animate({ scrollTop: $('#filters').offset().top - 90 }, 400);
  }

  // The drop down of places, each one once, in alphabetical order
  function showPlaces() {
    var seen = {};
    CE.data.visible(events).forEach(function (e) {
      var place = (e.location || '').trim();
      if (place) seen[place.toLowerCase()] = place;
    });
    var options = Object.keys(seen).sort().map(function (key) {
      return '<option value="' + esc(seen[key]) + '">' + esc(seen[key]) + '</option>';
    });
    $('#f-loc').html('<option value="">All locations</option>' + options.join('')).val(want.loc);
  }

  // ---------- loading ----------

  // Which events this person is going to. Without it we only lose the Registered labels
  function getRegs() {
    if (!CE.guard.can('event:register')) return null;
    return CE.data.myRegistrations()
      .then(function (list) { list.forEach(function (r) { regs[r.event_id] = r.status; }); })
      .catch(function () { });
  }

  function loaded(results) {
    events = results[0];
    showPlaces();
    show();
  }

  function failed(err) {
    $('#results-summary').text('');
    $('#event-grid').attr('aria-busy', 'false');
    ui.errorState($('#event-grid'), err, load);
  }

  function load() {
    $('#event-grid').attr('aria-busy', 'true').html(ui.skeletonCards(6));
    Promise.all([CE.data.events(), getRegs()]).then(loaded).catch(failed);
  }

  // ---------- controls ----------

  // Save one choice, go back to page 1 and redraw
  function choose(key, value) {
    want[key] = value;
    want.page = 1;
    show();
  }

  function changeDates() {
    var from = $('#f-from').val(), to = $('#f-to').val();
    var wrong = from && to && to < from;
    ui.fieldError($('#f-to'), wrong ? 'End date is before start date.' : '');
    if (wrong) return;

    want.from = from;
    want.to = to;
    if (from || to) want.when = 'all'; // the dates decide now
    showChips();
    choose('page', 1);
  }

  function changeWhen() {
    choose('when', $(this).data('when'));
    showChips();
  }

  function clear() {
    startAgain();
    ui.fieldError($('#f-to'), '');
    fillForm();
    show();
  }

  function register() {
    CE.actions.toggleRegistration($(this), function (id, status) {
      regs[id] = status;
      show();
    });
  }

  function removeEvent() {
    var $button = $(this), id = $button.attr('data-id');
    CE.actions.remove({
      action: 'event:delete',
      path: '/events/' + id,
      title: $button.attr('data-title'),
      cacheKey: 'events',
      $card: $button.closest('.event-card'),
      after: function () {
        events = events.filter(function (e) { return e.id !== id; });
        showPlaces();
        show();
      }
    });
  }

  // Start
  CE.ready(function () {
    startAgain();
    readAddress();
    fillForm();
    load();

    $('#f-q').on('input', CE.debounce(function () { choose('q', $.trim(this.value)); }, 220)); // wait until typing stops
    $('#f-loc').on('change', function () { choose('loc', this.value); });
    $('#f-sort').on('change', function () { choose('sort', this.value); });
    $('#f-from, #f-to').on('change', changeDates);
    $('.chip[data-when]').on('click', changeWhen);
    $('#f-clear').on('click', clear);
    $('#filters').on('submit', function (e) { e.preventDefault(); });
    $('#event-grid')
      .on('click', '.js-clear', clear)
      .on('click', '.js-reg', register)
      .on('click', '.js-del-event', removeEvent);
  });
})(jQuery, window.CE);
