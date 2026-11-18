/* =========================================================================
   Events list — GET /api/events
   The API returns every event (no server-side paging/filtering), so search,
   date/location filters, sorting and pagination happen client-side.
   Normal users only see published events (CE.data.visible).
   ========================================================================= */
(function ($, CE) {
  'use strict';
  var ui = CE.ui;
  var PER_PAGE = 9;
  var state = { q: '', loc: '', from: '', to: '', when: 'upcoming', sort: 'soonest', page: 1 };
  var all = [], regMap = {};

  function readUrl() {
    var p = new URLSearchParams(window.location.search);
    Object.keys(state).forEach(function (k) { if (p.get(k)) state[k] = k === 'page' ? Math.max(1, parseInt(p.get(k), 10) || 1) : p.get(k); });
    $('#f-q').val(state.q); $('#f-from').val(state.from); $('#f-to').val(state.to); $('#f-sort').val(state.sort);
    $('.chip[data-when]').attr('aria-pressed', function () { return String($(this).data('when') === state.when); });
  }
  function writeUrl() {
    var p = new URLSearchParams();
    Object.keys(state).forEach(function (k) {
      var def = { when: 'upcoming', sort: 'soonest', page: 1 }[k];
      if (state[k] && state[k] !== def) p.set(k, state[k]);
    });
    var qs = p.toString();
    history.replaceState(null, '', 'events.html' + (qs ? '?' + qs : ''));
  }

  function filtered() {
    var now = new Date(), q = state.q.toLowerCase();
    var weekEnd = new Date(now.getTime() + 7 * 864e5);
    var monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    var from = state.from ? new Date(state.from + 'T00:00:00') : null;
    var to = state.to ? new Date(state.to + 'T23:59:59') : null;

    var list = CE.data.visible(all).filter(function (e) {
      var s = new Date(e.starts_at), end = new Date(e.ends_at || e.starts_at);
      if (q && ((e.title || '') + ' ' + (e.description || '') + ' ' + (e.location || '')).toLowerCase().indexOf(q) < 0) return false;
      if (state.loc && (e.location || '').trim().toLowerCase() !== state.loc.toLowerCase()) return false;
      if (from && end < from) return false;
      if (to && s > to) return false;
      switch (state.when) {
        case 'upcoming': return end >= now;
        case 'week': return end >= now && s <= weekEnd;
        case 'month': return end >= now && s < monthEnd;
        case 'past': return end < now;
        default: return true;
      }
    });
    list.sort(function (a, b) {
      if (state.sort === 'az') return (a.title || '').localeCompare(b.title || '');
      var d = new Date(a.starts_at) - new Date(b.starts_at);
      return state.sort === 'latest' ? -d : d;
    });
    if (state.when === 'past' && state.sort === 'soonest') list.reverse(); // most recent past first
    return list;
  }

  function render(scroll) {
    var list = filtered();
    var pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    if (state.page > pages) state.page = pages;
    var slice = list.slice((state.page - 1) * PER_PAGE, state.page * PER_PAGE);
    var $g = $('#event-grid').attr('aria-busy', 'false');

    var total = CE.data.visible(all).length;
    $('#results-summary').text(list.length
      ? 'Showing ' + ((state.page - 1) * PER_PAGE + 1) + '–' + ((state.page - 1) * PER_PAGE + slice.length) + ' of ' + list.length + ' event' + (list.length === 1 ? '' : 's') + (list.length !== total ? ' (filtered from ' + total + ')' : '')
      : 'No events match your filters.');

    if (!slice.length) {
      $g.html(ui.empty(total ? 'Nothing matches those filters' : 'No events yet',
        total ? 'Try a different date range, location or keyword.' : 'When organisers publish events they’ll appear here.',
        total ? '<button type="button" class="btn btn-primary js-clear">Clear filters</button>' : (CE.guard.can('event:create') ? '<a href="event-form.html" class="btn btn-primary">Create the first event</a>' : ''), 'calendar'));
    } else {
      $g.html(slice.map(function (e) { return CE.views.eventCard(e, { registrations: regMap, q: state.q }); }).join(''));
      ui.stagger($g.find('.reveal'), 70);
      ui.reveal($g);
    }
    ui.pagination($('#pager'), state.page, pages, function (p) { state.page = p; writeUrl(); render(true); });
    if (scroll) $('html, body').animate({ scrollTop: $('#filters').offset().top - 90 }, 400);
  }

  function populateLocations() {
    var seen = {};
    CE.data.visible(all).forEach(function (e) { var l = (e.location || '').trim(); if (l) seen[l.toLowerCase()] = l; });
    var opts = Object.keys(seen).sort().map(function (k) { return '<option value="' + CE.esc(seen[k]) + '">' + CE.esc(seen[k]) + '</option>'; }).join('');
    $('#f-loc').html('<option value="">All locations</option>' + opts).val(state.loc);
  }

  function load(force) {
    $('#event-grid').attr('aria-busy', 'true').html(ui.skeletonCards(6));
    var regs = CE.guard.can('event:register') ? CE.data.myRegistrations().catch(function () { return []; }) : Promise.resolve([]);
    Promise.all([CE.data.events(force), regs]).then(function (res) {
      all = res[0]; regMap = {};
      res[1].forEach(function (r) { regMap[r.event_id] = r.status; });
      populateLocations();
      render();
    }).catch(function (err) {
      $('#results-summary').text('Couldn’t load events.');
      ui.errorState($('#event-grid'), err, function () { load(true); });
    });
  }

  function clearAll() {
    state = { q: '', loc: '', from: '', to: '', when: 'upcoming', sort: 'soonest', page: 1 };
    $('#filters')[0].reset(); $('#f-loc').val(''); $('#f-sort').val('soonest');
    $('.chip[data-when]').attr('aria-pressed', function () { return String($(this).data('when') === 'upcoming'); });
    writeUrl(); render();
  }

  CE.ready(function () {
    readUrl();
    load();

    $('#f-q').on('input', CE.debounce(function () { state.q = $.trim(this.value); state.page = 1; writeUrl(); render(); }, 220));
    $('#f-loc').on('change', function () { state.loc = this.value; state.page = 1; writeUrl(); render(); });
    $('#f-from, #f-to').on('change', function () {
      state.from = $('#f-from').val(); state.to = $('#f-to').val();
      if (state.from && state.to && state.to < state.from) { ui.fieldError($('#f-to'), 'End date is before start date.'); return; }
      ui.fieldError($('#f-to'), '');
      if (state.from || state.to) { state.when = 'all'; $('.chip[data-when]').attr('aria-pressed', function () { return String($(this).data('when') === 'all'); }); }
      state.page = 1; writeUrl(); render();
    });
    $('#f-sort').on('change', function () { state.sort = this.value; writeUrl(); render(); });
    $('.chip[data-when]').on('click', function () {
      state.when = $(this).data('when'); state.page = 1;
      $('.chip[data-when]').attr('aria-pressed', 'false'); $(this).attr('aria-pressed', 'true');
      writeUrl(); render();
    });
    $('#f-clear').on('click', clearAll);
    $('#filters').on('submit', function (e) { e.preventDefault(); });

    var $g = $('#event-grid');
    $g.on('click', '.js-clear', clearAll);
    $g.on('click', '.js-reg', function () {
      CE.actions.toggleRegistration($(this), function (id, status) { regMap[id] = status; render(); });
    });
    $g.on('click', '.js-del-event', function () {
      var $b = $(this), id = $b.data('id');
      CE.actions.remove({
        action: 'event:delete', path: '/events/' + id, title: $b.data('title'), cacheKey: 'events',
        $card: $b.closest('.event-card'),
        after: function () { all = all.filter(function (e) { return e.id !== id; }); render(); }
      });
    });
  });
})(jQuery, window.CE);
