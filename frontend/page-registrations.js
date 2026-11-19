/* =========================================================================
   My registrations — GET /api/event-registrations/my-registrations
   Cancel → POST /api/event-registrations/cancel  { event_id }
   Rendered as ticket stubs. Cancelling is optimistic and reverts on error.
   ========================================================================= */
(function ($, CE) {
  'use strict';
  var ui = CE.ui, icon = CE.icon, esc = CE.esc, fmt = CE.fmt;
  var regs = [], filter = 'upcoming';

  function bucket(r) {
    if (r.status === 'cancelled') return 'cancelled';
    var end = new Date(r.ends_at || r.starts_at);
    return end < new Date() ? 'past' : 'upcoming';
  }

  function ticket(r, i) {
    var s = fmt.stub(r.starts_at), b = bucket(r);
    var status = b === 'cancelled' ? '<span class="badge badge-muted">Cancelled</span>' : b === 'past' ? '<span class="badge badge-ink">Attended?</span>' : '<span class="badge badge-moss">' + icon('check', 'w-3 h-3') + 'Confirmed</span>';
    return '<article class="ticket card card-hover overflow-hidden flex flex-col sm:flex-row reveal ' + (b === 'cancelled' ? 'opacity-70' : '') + '" style="--d:' + Math.min(i * 60, 400) + 'ms" data-event="' + esc(r.event_id) + '">' +
      '<div class="relative sm:w-36 shrink-0 bg-ink-900 text-white grid place-items-center py-5 sm:py-0">' +
      '<div class="text-center"><p class="text-xs tracking-[.25em] text-ember-200 font-semibold">' + esc(s.mon) + '</p><p class="font-display text-5xl leading-none my-1">' + esc(s.day) + '</p><p class="text-xs text-ink-300">' + esc(s.wk) + '</p></div>' +
      '<span class="hidden sm:block absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-paper"></span></div>' +
      '<div class="flex-1 p-5 sm:pl-8 border-t sm:border-t-0 sm:border-l-2 border-dashed border-paper-300 flex flex-col md:flex-row md:items-center gap-4">' +
      '<div class="flex-1 min-w-0"><div class="flex flex-wrap gap-2 mb-2">' + status + '</div>' +
      '<h2 class="font-display text-2xl text-ink-900 leading-snug"><a class="hover:text-ember-700" href="event.html?id=' + encodeURIComponent(r.event_id) + '">' + esc(r.title) + '</a></h2>' +
      '<p class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-600"><span class="inline-flex items-center gap-1.5">' + icon('clock', 'w-4 h-4') + esc(fmt.range(r.starts_at, r.ends_at)) + '</span>' +
      '<span class="inline-flex items-center gap-1.5">' + icon('pin', 'w-4 h-4') + esc(r.location || 'TBA') + '</span></p>' +
      '<p class="mt-2 text-xs text-ink-400 font-mono">Ref ' + esc(String(r.id).slice(0, 8).toUpperCase()) + ' · registered ' + esc(fmt.relative(r.created_at)) + '</p></div>' +
      '<div class="flex gap-2 shrink-0"><a href="event.html?id=' + encodeURIComponent(r.event_id) + '" class="btn btn-ghost btn-sm">View</a>' +
      (b === 'upcoming' && CE.guard.can('event:register') ? '<button type="button" class="btn btn-danger btn-sm js-cancel" data-event="' + esc(r.event_id) + '" data-title="' + esc(r.title) + '">Cancel</button>' : '') +
      (b === 'past' ? '<a href="event.html?id=' + encodeURIComponent(r.event_id) + '#fb-h" class="btn btn-primary btn-sm">' + icon('star', 'w-4 h-4') + 'Rate</a>' : '') +
      '</div></div></article>';
  }

  function render() {
    var counts = { upcoming: 0, past: 0, cancelled: 0 };
    regs.forEach(function (r) { counts[bucket(r)]++; });
    $('#r-summary').text(counts.upcoming + ' upcoming · ' + counts.past + ' past · ' + counts.cancelled + ' cancelled');
    var list = regs.filter(function (r) { return filter === 'all' || bucket(r) === filter; })
      .sort(function (a, b) { var d = new Date(a.starts_at) - new Date(b.starts_at); return filter === 'upcoming' ? d : -d; });
    var $l = $('#r-list').attr('aria-busy', 'false');
    $l.html(list.length ? list.map(ticket).join('') : ui.empty(
      filter === 'upcoming' ? 'No upcoming registrations' : 'Nothing here',
      filter === 'upcoming' ? 'Find something happening in your community and save your spot.' : 'Registrations in this category will show up here.',
      '<a href="events.html" class="btn btn-primary">Browse events</a>', 'ticket'));
    ui.reveal($l);
  }

  function load() {
    $('#r-list').attr('aria-busy', 'true').html(ui.skeletonCards(3, 'row'));
    CE.data.myRegistrations().then(function (list) { regs = list; render(); })
      .catch(function (e) { ui.errorState($('#r-list'), e, load); });
  }

  CE.ready(function () {
    if (!CE.guard.can('event:register')) {
      // Admins don't self-register; point them to registrants on each event instead.
      $('#r-summary').text('Administrators manage registrants from each event page.');
    }
    load();
    $('.chip[data-f]').on('click', function () { filter = $(this).data('f'); $('.chip[data-f]').attr('aria-pressed', 'false'); $(this).attr('aria-pressed', 'true'); render(); });
    $('#r-list').on('click', '.js-cancel', function () {
      var eid = $(this).data('event'), title = $(this).data('title');
      ui.confirm({ title: 'Cancel “' + title + '”?', message: 'Your spot will be released. Note: the server doesn’t currently allow re-registering after a cancellation.', confirmText: 'Cancel registration', danger: true }).then(function (ok) {
        if (!ok) return;
        var r = regs.filter(function (x) { return x.event_id === eid; })[0], prev = r.status;
        r.status = 'cancelled'; render(); // optimistic
        CE.api.post('/event-registrations/cancel', { event_id: eid }).then(function () { ui.toast('success', 'Registration cancelled.'); })
          .catch(function (err) { r.status = prev; render(); CE.handleError(err); }); // revert
      });
    });
  });
})(jQuery, window.CE);
