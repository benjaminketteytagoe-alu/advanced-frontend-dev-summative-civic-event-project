// My registrations page: the person's event tickets
(function ($, CE) {
  'use strict';
  var ui = CE.ui, icon = CE.icon, esc = CE.esc, fmt = CE.fmt;

  var regs = [];             // every registration this person has
  var filter = 'upcoming';   // upcoming, past, cancelled or all

  // Which group a ticket belongs to
  function groupOf(r) {
    if (r.status === 'cancelled') return 'cancelled';
    return CE.views.isPast(r) ? 'past' : 'upcoming';
  }

  function eventLink(r) {
    return 'event.html?id=' + encodeURIComponent(r.event_id);
  }

  function badge(group) {
    if (group === 'cancelled') return '<span class="badge badge-muted">Cancelled</span>';
    if (group === 'past') return '<span class="badge badge-ink">Past</span>';
    return '<span class="badge badge-moss">' + icon('check', 'w-3 h-3') + 'Confirmed</span>';
  }

  // The dark left side with the date
  function dateSide(r) {
    var s = fmt.stub(r.starts_at);
    return '<div class="relative sm:w-36 shrink-0 bg-ink-900 text-white grid place-items-center py-5 sm:py-0">' +
      '<div class="text-center">' +
      '<p class="text-xs tracking-[.25em] text-ember-200 font-semibold">' + esc(s.mon) + '</p>' +
      '<p class="font-display text-5xl leading-none my-1">' + esc(s.day) + '</p>' +
      '<p class="text-xs text-ink-300">' + esc(s.wk) + '</p></div>' +
      '<span class="hidden sm:block absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-paper"></span></div>';
  }

  // The title, time and place
  function details(r, group) {
    var ref = String(r.id).slice(0, 8).toUpperCase();
    return '<div class="flex-1 min-w-0">' +
      '<div class="flex flex-wrap gap-2 mb-2">' + badge(group) + '</div>' +
      '<h3 class="font-display text-2xl text-ink-900 leading-snug">' +
      '<a class="hover:text-ember-700" href="' + eventLink(r) + '">' + esc(r.title) + '</a></h3>' +
      '<p class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-600">' +
      '<span class="inline-flex items-center gap-1.5">' + icon('clock', 'w-4 h-4') + esc(fmt.range(r.starts_at, r.ends_at)) + '</span>' +
      '<span class="inline-flex items-center gap-1.5">' + icon('pin', 'w-4 h-4') + esc(r.location || 'TBA') + '</span></p>' +
      '<p class="mt-2 text-xs text-ink-400 font-mono">Ref ' + esc(ref) + ' · registered ' + esc(fmt.relative(r.created_at)) + '</p></div>';
  }

  function buttons(r, group) {
    var html = '<a href="' + eventLink(r) + '" class="btn btn-ghost btn-sm">View</a>';
    if (group === 'upcoming' && CE.guard.can('event:register')) {
      html += '<button type="button" class="btn btn-danger btn-sm js-cancel" data-id="' + esc(r.id) + '">Cancel</button>';
    }
    if (group === 'past') {
      html += '<a href="' + eventLink(r) + '#fb-h" class="btn btn-primary btn-sm">' + icon('star', 'w-4 h-4') + 'Rate</a>';
    }
    return '<div class="flex gap-2 shrink-0">' + html + '</div>';
  }

  // One ticket. The delay makes them appear one after another
  function ticket(r, i) {
    var group = groupOf(r);
    var faded = group === 'cancelled' ? ' opacity-70' : '';
    var delay = Math.min(i * 60, 400);
    return '<article class="ticket card card-hover overflow-hidden flex flex-col sm:flex-row reveal' + faded + '" style="--d:' + delay + 'ms">' +
      dateSide(r) +
      '<div class="flex-1 p-5 sm:pl-8 border-t sm:border-t-0 sm:border-l-2 border-dashed border-paper-300 flex flex-col md:flex-row md:items-center gap-4">' +
      details(r, group) + buttons(r, group) +
      '</div></article>';
  }

  function emptyMessage() {
    var title = 'Nothing here', text = 'Registrations in this category will show up here.';
    if (filter === 'upcoming') {
      title = 'No upcoming registrations';
      text = 'Find something happening in your community and save your spot.';
    }
    return ui.empty(title, text, '<a href="events.html" class="btn btn-primary">Browse events</a>', 'ticket');
  }

  // Soonest first for upcoming, newest first for the rest
  function order(a, b) {
    var soonest = new Date(a.starts_at) - new Date(b.starts_at);
    return filter === 'upcoming' ? soonest : -soonest;
  }

  function showCounts() {
    if (!CE.guard.can('event:register')) {
      $('#r-summary').text('Administrators manage registrants from each event page.');
      return;
    }
    var n = { upcoming: 0, past: 0, cancelled: 0 };
    regs.forEach(function (r) { n[groupOf(r)]++; });
    $('#r-summary').text(n.upcoming + ' upcoming · ' + n.past + ' past · ' + n.cancelled + ' cancelled');
  }

  // Draw the page
  function show() {
    var list = regs.filter(function (r) { return filter === 'all' || groupOf(r) === filter; });
    list.sort(order);

    showCounts();
    $('#r-list').attr('aria-busy', 'false').html(list.length ? list.map(ticket).join('') : emptyMessage());
    ui.reveal($('#r-list'));
  }

  function load() {
    $('#r-list').attr('aria-busy', 'true').html(ui.skeletonCards(3, 'row'));
    CE.data.myRegistrations()
      .then(function (list) { regs = list; show(); })
      .catch(function (err) {
        $('#r-summary').text('');
        $('#r-list').attr('aria-busy', 'false');
        ui.errorState($('#r-list'), err, load);
      });
  }

  function changeFilter() {
    filter = $(this).data('f');
    $('.chip[data-f]').attr('aria-pressed', 'false');
    $(this).attr('aria-pressed', 'true');
    show();
  }

  // The ticket changes at once, and changes back if saving fails
  function cancel(r) {
    r.status = 'cancelled';
    show();
    CE.api.post('/event-registrations/cancel', { event_id: r.event_id })
      .then(function () { ui.toast('success', 'Registration cancelled.'); })
      .catch(function (err) {
        r.status = 'registered';
        show();
        CE.handleError(err);
      });
  }

  function askCancel() {
    var id = $(this).attr('data-id');
    var r = regs.filter(function (x) { return x.id === id; })[0];
    ui.confirm({
      title: 'Cancel “' + r.title + '”?',
      message: 'Your spot will be released. You can register again later.',
      confirmText: 'Cancel registration',
      danger: true
    }).then(function (yes) { if (yes) cancel(r); });
  }

  // Start
  CE.ready(function () {
    load();
    $('.chip[data-f]').on('click', changeFilter);
    $('#r-list').on('click', '.js-cancel', askCancel);
  });
})(jQuery, window.CE);
