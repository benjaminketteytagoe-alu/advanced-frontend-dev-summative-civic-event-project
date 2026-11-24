/* =========================================================================
   Event detail
     GET  /api/events/:id
     POST /api/event-registrations/register | /cancel      (users)
     GET  /api/event-registrations/my-registrations          (users)
     GET  /api/event-registrations/event/:id/attendees       (ADMIN ONLY)
     GET  /api/event-feedback/event/:id                      (ADMIN ONLY)
     GET  /api/event-feedback/my-feedback                    (users)
     POST /api/event-feedback   PUT /api/event-feedback/:id  (users)
   ========================================================================= */
(function ($, CE) {
  'use strict';
  var ui = CE.ui, icon = CE.icon, esc = CE.esc, fmt = CE.fmt, guard = CE.guard;
  var id = CE.param('id');
  var ev = null, myReg = null, myFeedback = null;

  function icsFile(e) {
    var f = function (d) { return new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); };
    var escI = function (s) { return String(s || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n'); };
    var body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CivicEvents+//EN', 'BEGIN:VEVENT',
      'UID:' + e.id + '@civicevents', 'DTSTAMP:' + f(new Date()), 'DTSTART:' + f(e.starts_at), 'DTEND:' + f(e.ends_at || e.starts_at),
      'SUMMARY:' + escI(e.title), 'DESCRIPTION:' + escI(e.description), 'LOCATION:' + escI(e.location), 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    return URL.createObjectURL(new Blob([body], { type: 'text/calendar' }));
  }

  function registerBlock() {
    var past = CE.views.isPast(ev);
    // USER-ONLY registration controls
    if (guard.can('event:register')) {
      if (past) return '<p class="text-sm text-ink-600 rounded-xl bg-paper-200 px-4 py-3">This event has ended. Registration is closed.</p>';
      var on = myReg === 'registered';
      return (on ? '<p class="flex items-center gap-2 text-sm font-medium text-moss-700 mb-3">' + icon('check', 'w-4 h-4') + 'You’re registered for this event.</p>' : '') +
        '<button type="button" id="reg-btn" class="btn btn-lg w-full ' + (on ? 'btn-danger' : 'btn-primary') + '" aria-pressed="' + on + '">' +
        (on ? icon('x', 'w-4 h-4') + 'Cancel registration' : icon('ticket', 'w-4 h-4') + 'Register for this event') + '</button>' +
        (myReg === 'cancelled' ? '<p class="mt-2 text-xs text-ink-500">You cancelled a previous registration for this event.</p>' : '');
    }
    // ADMIN view: no self-registration, manage instead
    if (guard.can('event:edit')) {
      return '<div class="grid grid-cols-2 gap-2">' +
        '<a href="event-form.html?id=' + encodeURIComponent(ev.id) + '" class="btn btn-primary">' + icon('edit', 'w-4 h-4') + 'Edit</a>' +
        '<button type="button" id="del-btn" class="btn btn-danger">' + icon('trash', 'w-4 h-4') + 'Delete</button></div>';
    }
    return '';
  }

  function render() {
    var img = CE.views.eventImage(ev), cover = CE.dice.cover(ev.id), s = fmt.stub(ev.starts_at);
    var mapQ = encodeURIComponent(ev.location || '');
    ui.setTitle(ev.title);

    var html = '' +
      '<div class="crop-marks reveal"><header class="relative h-72 sm:h-[26rem] rounded-[1.75rem] overflow-hidden bg-ink-900 shadow-lift">' +
      '<img src="' + esc(img || cover) + '" alt="' + esc(img ? 'Image for ' + ev.title : '') + '" class="w-full h-full object-cover" onerror="this.onerror=null;this.src=\'' + cover + '\'">' +
      '<div class="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-ink-950/30 to-transparent"></div>' +
      '<div class="absolute left-0 right-0 bottom-0 p-6 sm:p-10 flex items-end gap-5">' +
      '<div class="date-stub !min-w-[4.5rem] !py-3 shadow-lift hidden sm:grid"><span class="text-xs tracking-[.2em] text-ember-200 font-semibold">' + esc(s.mon) + '</span><span class="font-display text-4xl leading-none">' + esc(s.day) + '</span><span class="text-xs text-ink-300">' + esc(s.wk) + '</span></div>' +
      '<div class="text-white"><div class="flex flex-wrap gap-2 mb-3">' +
      (CE.views.isPast(ev) ? '<span class="badge bg-white/15 text-white">Past event</span>' : '<span class="badge bg-ember-500 text-white">Upcoming</span>') +
      (ev.published === false ? '<span class="badge badge-danger">Unpublished</span>' : '') + '</div>' +
      '<h1 class="font-display text-3xl sm:text-5xl leading-tight max-w-3xl">' + esc(ev.title) + '</h1></div></div></header></div>' +

      '<div class="grid lg:grid-cols-[1fr_22rem] gap-10 mt-10">' +
      '<div class="min-w-0">' +
      '<section class="reveal" aria-labelledby="about-h"><h2 id="about-h" class="eyebrow mb-4">About this event</h2>' +
      '<div class="prose-civic text-ink-700 text-lg leading-relaxed">' + esc(ev.description || 'No description has been provided yet.') + '</div></section>' +

      (ev.location ? '<section class="mt-12 reveal" aria-labelledby="map-h"><h2 id="map-h" class="eyebrow mb-4">Getting there</h2>' +
        '<div class="card overflow-hidden"><iframe title="Map showing ' + esc(ev.location) + '" class="w-full h-64 border-0 grayscale-[30%]" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q=' + mapQ + '&z=14&output=embed"></iframe>' +
        '<div class="p-4 flex flex-wrap items-center justify-between gap-3"><p class="flex items-center gap-2 text-ink-800 font-medium">' + icon('pin', 'w-4 h-4 text-ember-600') + esc(ev.location) + '</p>' +
        '<a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=' + mapQ + '">Open in Maps ' + icon('external', 'w-3.5 h-3.5') + '<span class="sr-only">(opens in new tab)</span></a></div></div></section>' : '') +

      // ADMIN-ONLY: registrants panel (guard.can('event:viewRegistrants'))
      (guard.can('event:viewRegistrants') ? '<section class="mt-12 reveal" aria-labelledby="reg-h"><div class="flex items-center justify-between mb-4"><h2 id="reg-h" class="eyebrow">Registrants <span id="reg-count" class="badge badge-ink ml-2">…</span></h2>' +
        '<button type="button" id="csv-btn" class="btn btn-ghost btn-sm" disabled>' + icon('download', 'w-4 h-4') + 'Export CSV</button></div><div id="registrants" class="card overflow-hidden"></div></section>' : '') +

      '<section class="mt-12 reveal" aria-labelledby="fb-h"><h2 id="fb-h" class="eyebrow mb-4">Feedback</h2><div id="feedback"></div></section>' +
      '</div>' +

      // sidebar
      '<aside class="lg:sticky lg:top-24 self-start space-y-4">' +
      '<div class="card star-border p-6 reveal" style="--d:100ms">' +
      '<dl class="space-y-5 mb-6">' +
      '<div class="flex gap-3"><dt class="shrink-0 grid place-items-center w-10 h-10 rounded-xl bg-ink-900 text-white">' + icon('calendar', 'w-5 h-5') + '<span class="sr-only">Date</span></dt><dd><span class="block font-semibold text-ink-900">' + esc(fmt.date(ev.starts_at, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })) + '</span><span class="text-sm text-ink-600">' + esc(fmt.time(ev.starts_at)) + (ev.ends_at ? ' – ' + esc(new Date(ev.ends_at).toDateString() !== new Date(ev.starts_at).toDateString() ? fmt.dateTime(ev.ends_at) : fmt.time(ev.ends_at)) : '') + '</span></dd></div>' +
      '<div class="flex gap-3"><dt class="shrink-0 grid place-items-center w-10 h-10 rounded-xl bg-ember-100 text-ember-700">' + icon('pin', 'w-5 h-5') + '<span class="sr-only">Location</span></dt><dd><span class="block font-semibold text-ink-900">' + esc(ev.location || 'To be announced') + '</span>' +
      (ev.location ? '<a class="text-sm text-ember-700 underline underline-offset-2" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=' + mapQ + '">Get directions<span class="sr-only"> (opens in new tab)</span></a>' : '') + '</dd></div>' +
      '<div class="flex gap-3"><dt class="shrink-0 grid place-items-center w-10 h-10 rounded-xl bg-paper-200 text-ink-700">' + icon('star', 'w-5 h-5') + '<span class="sr-only">Rating</span></dt><dd id="side-rating" class="text-sm text-ink-600 self-center">—</dd></div>' +
      '</dl><div id="reg-block">' + registerBlock() + '</div></div>' +
      '<div class="card p-4 flex gap-2 reveal" style="--d:160ms">' +
      '<a id="ics" class="btn btn-ghost btn-sm flex-1" download="' + esc((ev.title || 'event').replace(/[^\w\- ]+/g, '')) + '.ics">' + icon('calendar', 'w-4 h-4') + 'Add to calendar</a>' +
      '<button type="button" id="share" class="btn btn-ghost btn-sm flex-1">' + icon('external', 'w-4 h-4') + 'Copy link</button></div>' +
      '</aside></div>';

    $('#event-root').attr('aria-busy', 'false').html(html);
    $('#temp-title').remove(); // the real title is on the page now
    $('#ics').attr('href', icsFile(ev));
    ui.reveal($('#event-root'));
    loadFeedback();
    if (guard.can('event:viewRegistrants')) loadRegistrants();
  }

  /* ---------------- registration ---------------- */
  function bindRegistration() {
    var $root = $('#event-root');
    $root.on('click', '#reg-btn', function () {
      if (!guard.can('event:register')) return ui.forbiddenModal();
      var $b = $(this), on = myReg === 'registered';
      var go = function () {
        ui.busy($b, true, on ? 'Cancelling…' : 'Registering…');
        (on ? CE.api.post('/event-registrations/cancel', { event_id: ev.id }) : CE.api.post('/event-registrations/register', { event_id: ev.id }))
          .then(function () {
            myReg = on ? 'cancelled' : 'registered';
            ui.toast('success', on ? 'Your registration was cancelled.' : 'You’re registered! See you at ' + ev.title + '.');
            if (!on && CE.fx) CE.fx.success();
            $('#reg-block').html(registerBlock());
            loadFeedback();
          })
          .catch(function (err) {
            ui.busy($b, false);
            if (!on && err.status === 409) ui.toast('warning', 'You’re already registered for this event. Refresh the page to see it.');
            else CE.handleError(err, { retry: go });
          });
      };
      if (on) ui.confirm({ title: 'Cancel your registration?', message: 'Your spot will be released for someone else.', confirmText: 'Cancel registration', danger: true }).then(function (ok) { if (ok) go(); });
      else go();
    });
    $root.on('click', '#del-btn', function () {
      CE.actions.remove({ action: 'event:delete', path: '/events/' + ev.id, title: ev.title, cacheKey: 'events' }).then(function (ok) {
        if (ok) { CE.flash.set('success', '“' + ev.title + '” was deleted.'); window.location.href = 'events.html'; }
      });
    });
    $root.on('click', '#share', function () {
      var url = window.location.href;
      (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () { ui.toast('success', 'Link copied to clipboard.'); })
        .catch(function () { window.prompt('Copy this link:', url); });
    });
  }

  /* ---------------- registrants (ADMIN ONLY) ---------------- */
  var attendees = [];
  function loadRegistrants() {
    var $r = $('#registrants').html('<div class="p-4 space-y-3">' + ui.skeletonCards(3, 'row') + '</div>');
    CE.api.get('/event-registrations/event/' + encodeURIComponent(ev.id) + '/attendees').then(function (r) {
      attendees = r.data || [];
      $('#reg-count').text(attendees.length);
      $('#csv-btn').prop('disabled', !attendees.length);
      if (!attendees.length) { $r.html('<p class="p-6 text-sm text-ink-600">No one has registered yet.</p>'); return; }
      $r.html('<div class="overflow-x-auto"><table class="table w-full text-sm"><thead><tr><th scope="col">Attendee</th><th scope="col">Email</th><th scope="col">Registered</th></tr></thead><tbody>' +
        attendees.map(function (a) {
          return '<tr><td><span class="flex items-center gap-3">' + ui.avatarImg(a.user_id, a.full_name, 'w-8 h-8') + '<span class="font-medium text-ink-900">' + esc(a.full_name) + '</span></span></td>' +
            '<td class="text-ink-600"><a class="hover:underline" href="mailto:' + esc(a.email) + '">' + esc(a.email) + '</a></td><td class="text-ink-500 whitespace-nowrap">' + esc(fmt.relative(a.created_at)) + '</td></tr>';
        }).join('') + '</tbody></table></div>');
    }).catch(function (e) { ui.errorState($r, e, loadRegistrants); });
  }
  $(document).on('click', '#csv-btn', function () {
    var rows = [['Name', 'Email', 'Registered at']].concat(attendees.map(function (a) { return [a.full_name, a.email, a.created_at]; }));
    var csv = rows.map(function (r) { return r.map(function (c) { return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = (ev.title || 'event').replace(/[^\w\- ]+/g, '') + '-registrants.csv';
    a.click();
  });

  /* ---------------- feedback ---------------- */
  function summary(list) {
    var n = list.length, avg = n ? list.reduce(function (s, f) { return s + CE.num(f.rating); }, 0) / n : 0;
    var dist = [5, 4, 3, 2, 1].map(function (r) { return list.filter(function (f) { return CE.num(f.rating) === r; }).length; });
    $('#side-rating').html(n ? '<span class="flex items-center gap-2">' + ui.stars(avg) + '<strong class="text-ink-900">' + avg.toFixed(1) + '</strong> (' + n + ')</span>' : 'No ratings yet');
    return '<div class="card p-6 grid sm:grid-cols-[auto_1fr] gap-6 items-center mb-6">' +
      '<div class="text-center sm:pr-6 sm:border-r border-paper-200"><p class="font-display text-6xl text-ink-900 leading-none">' + (n ? avg.toFixed(1) : '–') + '</p>' +
      '<div class="mt-2 flex justify-center">' + ui.stars(avg, 'w-5 h-5') + '</div><p class="text-xs text-ink-500 mt-2">' + n + ' review' + (n === 1 ? '' : 's') + '</p></div>' +
      '<div class="space-y-1.5">' + dist.map(function (c, i) {
        var pct = n ? Math.round(c / n * 100) : 0;
        return '<div class="flex items-center gap-3 text-xs"><span class="w-3 text-ink-600">' + (5 - i) + '</span>' +
          '<span class="flex-1 h-2 rounded-full bg-paper-200 overflow-hidden"><span class="block h-full rounded-full bg-[#d08a1e] transition-[width] duration-1000" style="width:' + pct + '%"></span></span>' +
          '<span class="w-8 text-right text-ink-500">' + c + '</span></div>';
      }).join('') + '</div></div>';
  }

  function reviewItem(f, mine) {
    return '<li class="card p-5 reveal"><div class="flex items-start gap-3">' + ui.avatarImg(f.user_id, f.full_name, 'w-10 h-10') +
      '<div class="flex-1 min-w-0"><div class="flex flex-wrap items-center gap-x-3 gap-y-1"><p class="font-semibold text-ink-900">' + esc(mine ? 'Your feedback' : (f.full_name || 'Community member')) + '</p>' + ui.stars(f.rating) +
      '<span class="text-xs text-ink-500">' + esc(fmt.relative(f.updated_at || f.created_at)) + '</span></div>' +
      (f.comment ? '<p class="mt-2 text-ink-700 leading-relaxed whitespace-pre-line">' + esc(f.comment) + '</p>' : '<p class="mt-2 text-sm text-ink-400 italic">No comment.</p>') +
      (mine ? '<button type="button" id="fb-edit" class="mt-3 text-sm font-semibold text-ember-700 hover:underline inline-flex items-center gap-1">' + icon('edit', 'w-3.5 h-3.5') + 'Edit my feedback</button>' : '') +
      '</div></div></li>';
  }

  function feedbackForm(existing) {
    var r = existing ? CE.num(existing.rating) : 0;
    var stars = '';
    for (var i = 5; i >= 1; i--) {
      stars += '<input type="radio" id="rate-' + i + '" name="rating" value="' + i + '"' + (r === i ? ' checked' : '') + '>' +
        '<label for="rate-' + i + '" title="' + i + ' star' + (i > 1 ? 's' : '') + '">★<span class="sr-only">' + i + ' star' + (i > 1 ? 's' : '') + '</span></label>';
    }
    return '<form id="fb-form" class="card p-6 reveal" novalidate>' +
      '<h3 class="font-display text-2xl text-ink-900 mb-1">' + (existing ? 'Update your feedback' : 'How was it?') + '</h3>' +
      '<p class="text-sm text-ink-600 mb-5">' + (existing ? 'You can only leave one review per event — edit it below.' : 'Share a rating and a few words to help organisers improve.') + '</p>' +
      '<fieldset class="form-row mb-5"><legend class="field-label">Your rating</legend><div class="stars" id="rating-group">' + stars + '</div></fieldset>' +
      '<div class="form-row mb-5"><label for="fb-comment" class="field-label">Comment <span class="font-normal text-ink-500">(optional)</span></label>' +
      '<textarea id="fb-comment" name="comment" rows="4" maxlength="1000" class="field resize-y" placeholder="What stood out? What could be better?">' + esc(existing ? existing.comment || '' : '') + '</textarea>' +
      '<p class="field-hint text-right"><span id="fb-count">0</span>/1000</p></div>' +
      '<div class="flex flex-wrap gap-2"><button type="submit" class="btn btn-primary">' + (existing ? 'Save changes' : 'Submit feedback') + '</button>' +
      (existing ? '<button type="button" id="fb-cancel" class="btn btn-ghost">Cancel</button>' : '') + '</div></form>';
  }

  function loadFeedback() {
    var $f = $('#feedback');
    if (!$f.length) return;
    $f.html('<div class="skeleton h-40"></div>');

    // ADMIN: full list + average (GET /event-feedback/event/:id is admin-only on the API)
    if (guard.can('event:viewAllFeedback')) {
      CE.api.get('/event-feedback/event/' + encodeURIComponent(ev.id)).then(function (r) {
        var list = r.data || [];
        $f.html(summary(list) + (list.length ? '<ul class="space-y-3">' + list.map(function (x) { return reviewItem(x, false); }).join('') + '</ul>'
          : '<p class="text-sm text-ink-600">No feedback has been submitted for this event yet.</p>'));
        ui.reveal($f);
      }).catch(function (e) { ui.errorState($f, e, loadFeedback); });
      return;
    }

    // USER: own feedback (one per event) + form
    CE.api.get('/event-feedback/my-feedback').then(function (r) {
      myFeedback = (r.data || []).filter(function (x) { return x.event_id === ev.id; })[0] || null;
      $('#side-rating').html(myFeedback ? '<span class="flex items-center gap-2">' + ui.stars(myFeedback.rating) + '<span>Your rating</span></span>' : 'You haven’t rated this yet');
      var note = '<p class="text-xs text-ink-500 mt-4 flex items-center gap-1.5">' + icon('lock', 'w-3.5 h-3.5') + 'Ratings from other attendees are shared privately with the organisers.</p>';
      if (myFeedback) $f.html('<ul>' + reviewItem($.extend({ full_name: CE.auth.user().full_name }, myFeedback), true) + '</ul>' + note);
      else if (guard.can('event:feedback')) $f.html(feedbackForm(null) + note);
      ui.reveal($f);
      bindForm();
    }).catch(function (e) { ui.errorState($f, e, loadFeedback); });
  }

  function bindForm() {
    var $f = $('#feedback');
    $f.off('.fb');
    $f.on('click.fb', '#fb-edit', function () { $f.html(feedbackForm(myFeedback)); ui.reveal($f); $('#fb-comment').trigger('input'); $('#rate-' + CE.num(myFeedback.rating)).trigger('focus'); });
    $f.on('click.fb', '#fb-cancel', loadFeedback);
    $f.on('input.fb', '#fb-comment', function () { $('#fb-count').text(this.value.length); });
    $f.on('change.fb', 'input[name=rating]', function () { ui.fieldError($('#rating-group'), ''); });
    $f.on('submit.fb', '#fb-form', function (e) {
      e.preventDefault();
      if (!guard.can('event:feedback')) return ui.forbiddenModal();
      var rating = CE.num($('input[name=rating]:checked').val()), comment = $.trim($('#fb-comment').val());
      if (rating < 1 || rating > 5) { ui.fieldError($('#rating-group'), 'Choose a rating from 1 to 5 stars.'); $('#rate-5').trigger('focus'); return; }
      if (comment.length > 1000) { ui.fieldError($('#fb-comment'), 'Keep it under 1000 characters.'); return; }
      var $b = $(this).find('[type=submit]');
      ui.busy($b, true, 'Saving…');
      var req = myFeedback
        ? CE.api.put('/event-feedback/' + myFeedback.id, { rating: rating, comment: comment })
        : CE.api.post('/event-feedback', { event_id: ev.id, rating: rating, comment: comment });
      req.then(function () {
        ui.toast('success', myFeedback ? 'Your feedback was updated.' : 'Thanks for your feedback!');
        loadFeedback();
      }).catch(function (err) {
        ui.busy($b, false);
        if (err.status === 409) { ui.toast('warning', 'You’ve already left feedback for this event — loading it so you can edit.'); loadFeedback(); }
        else CE.handleError(err, { retry: function () { $('#fb-form').trigger('submit'); } });
      });
    });
  }

  function load() {
    if (!id) { $('#event-root').html(ui.empty('No event selected', 'Pick an event from the calendar.', '<a href="events.html" class="btn btn-primary">Browse events</a>', 'calendar')); return; }
    var regs = guard.can('event:register') ? CE.data.myRegistrations().catch(function () { return []; }) : Promise.resolve([]);
    Promise.all([CE.api.get('/events/' + encodeURIComponent(id)), regs]).then(function (res) {
      ev = res[0].data;
      // Normal users must not view unpublished events
      if (ev && ev.published === false && !guard.can('content:viewUnpublished')) throw new CE.ApiError(404, 'This event isn’t available.');
      var r = res[1].filter(function (x) { return x.event_id === id; })[0];
      myReg = r ? r.status : null;
      render();
    }).catch(function (err) {
      if (err.status === 404 || err.status === 400 || err.status === 500 && /uuid/i.test(err.message)) {
        $('#event-root').html(ui.empty('Event not found', 'It may have been removed or the link is incorrect.', '<a href="events.html" class="btn btn-primary">Back to events</a>', 'calendar'));
      } else ui.errorState($('#event-root'), err, load);
    });
  }

  CE.ready(function () { bindRegistration(); load(); });
})(jQuery, window.CE);
